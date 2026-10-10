import { and, asc, desc, eq, isNotNull, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  genre,
  genreFamilyMember,
  rating,
  releaseGroup,
  releaseGroupEffectiveGenre,
  review,
  userList,
  userListFeatured,
  type GenreRow,
} from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import { ReleaseGroupCategorySchema, type ReleaseGroup, type ReleaseGroupCategory } from "@/lib/api/schemas";
import { isCoverResolved } from "@/services/catalog/cover-resolution";
import { escapeLike } from "@/services/catalog/search/normalize";
import { GENRE_FAMILIES, type FamilyKey, type FamilyTier } from "@/services/genres/families";
import { albumInFamily, albumInGenreTree, findStyleGenreBySlug, parseFamilyKey } from "@/services/genres/read";
import { enrichLists } from "@/services/lists/lists";
import {
  FILTERED_PAGE_SIZE,
  MIN_ALBUMS_FOR_SECTION,
  MIN_RATINGS_PER_ALBUM,
  MIN_REVIEWS_PER_ALBUM,
  NEW_RELEASE_CATEGORIES,
  RAIL_SIZE,
} from "./constants";

// ---------------------------------------------------------------------------
// Tipos de salida
// ---------------------------------------------------------------------------

export interface FeaturedCollection {
  id: string;
  title: string;
  itemCount: number;
  coverThumbs: string[];
}

export interface DecadeBucket {
  decade: number; // año de inicio de la década: 1990, 2000, ...
  count: number;
}

export interface FamilyBucket {
  key: FamilyKey;
  tier: FamilyTier;
  count: number; // álbumes con algún género efectivo de la familia
}

export interface AlbumPage {
  albums: ReleaseGroup[];
  page: number;
  pageSize: number;
  hasNext: boolean;
}

export interface ExplorePage {
  featured: FeaturedCollection[];
  newReleases: ReleaseGroup[];
  decades: DecadeBucket[];
  families: FamilyBucket[];
  topRated: ReleaseGroup[];
  mostReviewed: ReleaseGroup[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const albumColumns = {
  id: releaseGroup.id,
  mbid: releaseGroup.mbid,
  title: releaseGroup.title,
  category: releaseGroup.category,
  firstReleaseDate: releaseGroup.firstReleaseDate,
  firstReleaseYear: releaseGroup.firstReleaseYear,
  createdAt: releaseGroup.createdAt,
  coverThumbUrl: releaseGroup.coverThumbUrl,
  coverCheckedAt: releaseGroup.coverCheckedAt,
  coverBlockedAt: releaseGroup.coverBlockedAt,
};

function serializeAlbum(row: {
  id: string;
  mbid: string | null;
  title: string;
  category: string;
  firstReleaseDate: string | null;
  firstReleaseYear: number | null;
  createdAt: Date;
  coverThumbUrl: string | null;
  coverCheckedAt: Date | null;
  coverBlockedAt: Date | null;
}): ReleaseGroup {
  return {
    id: row.id,
    mbid: row.mbid,
    title: row.title,
    category: row.category as ReleaseGroup["category"],
    firstReleaseDate: row.firstReleaseDate,
    firstReleaseYear: row.firstReleaseYear,
    createdAt: row.createdAt.toISOString(),
    coverThumbUrl: row.coverThumbUrl,
    coverResolved: isCoverResolved(row),
  };
}

// ---------------------------------------------------------------------------
// Rieles de la portada
// ---------------------------------------------------------------------------

/** Colecciones editoriales: listas públicas con fila en `user_list_featured`, por `rank` asc. */
export async function listFeaturedCollections(): Promise<FeaturedCollection[]> {
  const rows = await db
    .select({ id: userList.id, title: userList.title, rank: userListFeatured.rank })
    .from(userListFeatured)
    .innerJoin(userList, eq(userList.id, userListFeatured.listId))
    .where(and(eq(userList.audience, "public"), eq(userList.kind, "standard")))
    .orderBy(asc(userListFeatured.rank));

  const enrichment = await enrichLists(rows.map((row) => row.id));
  return rows.map((row) => {
    const enriched = enrichment.get(row.id);
    return {
      id: row.id,
      title: row.title,
      itemCount: enriched?.itemCount ?? 0,
      coverThumbs: enriched?.coverThumbs ?? [],
    };
  });
}

/**
 * Novedades: `studio`/`single_ep` con año conocido, por año descendente. `condition` (opcional,
 * correlacionada con "release_group") acota el conjunto, p. ej. al subárbol de un género.
 */
export async function listNewReleases(limit = RAIL_SIZE, condition?: SQL): Promise<ReleaseGroup[]> {
  const rows = await db
    .select(albumColumns)
    .from(releaseGroup)
    .where(
      and(
        isNotNull(releaseGroup.firstReleaseYear),
        sql`${releaseGroup.category} in ${NEW_RELEASE_CATEGORIES}`,
        condition,
      ),
    )
    .orderBy(desc(releaseGroup.firstReleaseYear), desc(releaseGroup.createdAt))
    .limit(limit);
  return rows.map(serializeAlbum);
}

/** Décadas presentes en `first_release_year`, con conteo, de la más reciente a la más antigua. */
export async function listDecades(): Promise<DecadeBucket[]> {
  const rows = await db
    .select({
      decade: sql<number>`(floor(${releaseGroup.firstReleaseYear} / 10) * 10)::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(releaseGroup)
    .where(isNotNull(releaseGroup.firstReleaseYear))
    .groupBy(sql`floor(${releaseGroup.firstReleaseYear} / 10) * 10`)
    .orderBy(sql`floor(${releaseGroup.firstReleaseYear} / 10) * 10 desc`);
  return rows.map((row) => ({ decade: Number(row.decade), count: Number(row.count) }));
}

/**
 * Familias de géneros con su número de álbumes (géneros efectivos de estilo, con herencia), en
 * el orden de la interfaz. Las familias sin álbumes se omiten.
 */
export async function listGenreFamilies(): Promise<FamilyBucket[]> {
  const rows = await db
    .select({
      key: genreFamilyMember.familyKey,
      count: sql<number>`count(distinct ${releaseGroupEffectiveGenre.releaseGroupId})::int`,
    })
    .from(releaseGroupEffectiveGenre)
    .innerJoin(genreFamilyMember, eq(genreFamilyMember.genreId, releaseGroupEffectiveGenre.genreId))
    .innerJoin(genre, and(eq(genre.id, releaseGroupEffectiveGenre.genreId), eq(genre.kind, "style")))
    .groupBy(genreFamilyMember.familyKey);
  const counts = new Map(rows.map((r) => [r.key, Number(r.count)]));
  return GENRE_FAMILIES.map((f) => ({ key: f.key, tier: f.tier, count: counts.get(f.key) ?? 0 })).filter((f) => f.count > 0);
}

/**
 * Mejor valorados: álbumes con ≥ `MIN_RATINGS_PER_ALBUM` valoraciones, por promedio
 * descendente. Devuelve `[]` (riel omitido) si hay menos de `MIN_ALBUMS_FOR_SECTION`
 * álbumes elegibles. `condition` (opcional, correlacionada con "release_group") acota el conjunto.
 */
export async function listTopRated(limit = RAIL_SIZE, condition?: SQL): Promise<ReleaseGroup[]> {
  const rows = await db
    .select({
      ...albumColumns,
      avgStars: sql<number>`avg(${rating.stars})::float`,
      ratingCount: sql<number>`count(*)::int`,
    })
    .from(rating)
    .innerJoin(releaseGroup, eq(releaseGroup.id, rating.releaseGroupId))
    .where(and(isNotNull(rating.releaseGroupId), condition))
    .groupBy(releaseGroup.id)
    .having(sql`count(*) >= ${MIN_RATINGS_PER_ALBUM}`)
    .orderBy(sql`avg(${rating.stars}) desc`, sql`count(*) desc`, asc(releaseGroup.id))
    .limit(Math.max(limit, MIN_ALBUMS_FOR_SECTION));

  if (rows.length < MIN_ALBUMS_FOR_SECTION) return [];
  return rows.slice(0, limit).map(serializeAlbum);
}

/**
 * Más reseñados: álbumes con ≥ `MIN_REVIEWS_PER_ALBUM` reseñas, por conteo descendente.
 * Devuelve `[]` si hay menos de `MIN_ALBUMS_FOR_SECTION` álbumes elegibles.
 */
export async function listMostReviewed(limit = RAIL_SIZE): Promise<ReleaseGroup[]> {
  const rows = await db
    .select({
      ...albumColumns,
      reviewCount: sql<number>`count(*)::int`,
    })
    .from(review)
    .innerJoin(releaseGroup, eq(releaseGroup.id, review.releaseGroupId))
    .where(isNotNull(review.releaseGroupId))
    .groupBy(releaseGroup.id)
    .having(sql`count(*) >= ${MIN_REVIEWS_PER_ALBUM}`)
    .orderBy(sql`count(*) desc`, asc(releaseGroup.id))
    .limit(Math.max(limit, MIN_ALBUMS_FOR_SECTION));

  if (rows.length < MIN_ALBUMS_FOR_SECTION) return [];
  return rows.slice(0, limit).map(serializeAlbum);
}

/** Composición de la portada de `/explore` en una sola llamada. */
export async function getExplorePage(): Promise<ExplorePage> {
  const [featured, newReleases, decades, families, topRated, mostReviewed] = await Promise.all([
    listFeaturedCollections(),
    listNewReleases(),
    listDecades(),
    listGenreFamilies(),
    listTopRated(),
    listMostReviewed(),
  ]);
  return { featured, newReleases, decades, families, topRated, mostReviewed };
}

// ---------------------------------------------------------------------------
// Listados filtrados (un corte a la vez)
// ---------------------------------------------------------------------------

// Orden determinista compartido: valoración agregada cuando el álbum es elegible
// (≥ MIN_RATINGS_PER_ALBUM), luego año descendente, desempate por id.
const eligibleAvg = sql`
  case when count(${rating.id}) >= ${MIN_RATINGS_PER_ALBUM}
       then avg(${rating.stars})
  end`;

function paginate(page: number): { limit: number; offset: number } {
  if (!Number.isInteger(page) || page < 1) {
    throw new ApiError("VALIDATION_ERROR", 400, "La paginación no es válida");
  }
  return { limit: FILTERED_PAGE_SIZE + 1, offset: (page - 1) * FILTERED_PAGE_SIZE };
}

function toAlbumPage(rows: unknown[], page: number): AlbumPage {
  const list = rows as Parameters<typeof serializeAlbum>[0][];
  return {
    albums: list.slice(0, FILTERED_PAGE_SIZE).map(serializeAlbum),
    page,
    pageSize: FILTERED_PAGE_SIZE,
    hasNext: list.length > FILTERED_PAGE_SIZE,
  };
}

function assertDecade(decade: number): void {
  if (!Number.isInteger(decade) || decade % 10 !== 0 || decade < 1800 || decade > 2100) {
    throw new ApiError("VALIDATION_ERROR", 400, "La década no es válida");
  }
}

/**
 * Órdenes del listado de álbumes (openspec: redesign-genre-page). Todos son deterministas: el
 * identificador del álbum desempata siempre, así una página no repite ni salta filas.
 */
export const ALBUM_SORTS = ["best", "popular", "newest", "oldest", "az"] as const;
export type AlbumSort = (typeof ALBUM_SORTS)[number];

export interface AlbumFilterOptions {
  page?: number;
  category?: ReleaseGroupCategory;
  /** Año de inicio de la década (1970, 1980, …). */
  decade?: number;
  /** Texto libre: título del álbum o nombre de un artista acreditado, sin acentos ni mayúsculas. */
  q?: string;
  sort?: AlbumSort;
}

const bestOrder = [
  sql`${eligibleAvg} desc nulls last`,
  sql`${releaseGroup.firstReleaseYear} desc nulls last`,
  asc(releaseGroup.id),
];

function albumOrder(sort: AlbumSort): SQL[] {
  switch (sort) {
    case "popular":
      return [sql`count(${rating.id}) desc`, ...bestOrder];
    case "newest":
      return [sql`${releaseGroup.firstReleaseYear} desc nulls last`, asc(releaseGroup.id)];
    case "oldest":
      return [sql`${releaseGroup.firstReleaseYear} asc nulls last`, asc(releaseGroup.id)];
    case "az":
      return [sql`search_normalize(${releaseGroup.title}) asc`, asc(releaseGroup.id)];
    default:
      return bestOrder;
  }
}

/** Coincidencia de `q` con el título o con un artista acreditado (misma normalización SQL que la búsqueda). */
function albumTextMatch(q: string): SQL {
  const pattern = `%${escapeLike(q)}%`;
  return sql`(
    search_normalize(${releaseGroup.title}) LIKE search_normalize(${pattern})
    OR EXISTS (
      SELECT 1 FROM credit c JOIN artist a ON a.id = c.artist_id
      WHERE c.release_group_id = "release_group"."id"
        AND search_normalize(a.name) LIKE search_normalize(${pattern})
    )
  )`;
}

/**
 * Álbumes que cumplen `condition` (correlacionada con "release_group") más los filtros opcionales.
 * Sin filtros y con `sort: "best"` es el orden compartido de Explorar.
 */
export async function listAlbumsFiltered(condition: SQL, options: AlbumFilterOptions = {}): Promise<AlbumPage> {
  const { page = 1, category, decade, sort = "best" } = options;
  const { limit, offset } = paginate(page);
  if (category !== undefined && !ReleaseGroupCategorySchema.safeParse(category).success) {
    throw new ApiError("VALIDATION_ERROR", 400, "El tipo de álbum no es válido");
  }
  if (decade !== undefined) assertDecade(decade);
  if (!ALBUM_SORTS.includes(sort)) throw new ApiError("VALIDATION_ERROR", 400, "El orden no es válido");
  const q = options.q?.trim();

  const filters: SQL[] = [condition];
  if (category !== undefined) filters.push(eq(releaseGroup.category, category));
  if (decade !== undefined) {
    filters.push(sql`${releaseGroup.firstReleaseYear} between ${decade} and ${decade + 9}`);
  }
  if (q) filters.push(albumTextMatch(q));

  const rows = await db
    .select(albumColumns)
    .from(releaseGroup)
    .leftJoin(rating, eq(rating.releaseGroupId, releaseGroup.id))
    .where(and(...filters))
    .groupBy(releaseGroup.id)
    .orderBy(...albumOrder(sort))
    .limit(limit)
    .offset(offset);
  return toAlbumPage(rows, page);
}

/** Tipo y orden opcionales de los listados de Explorar (la paginación va aparte). */
export type ExploreListOptions = Pick<AlbumFilterOptions, "category" | "sort">;

/**
 * Álbumes cuyo `first_release_year` cae en `[decade, decade+9]`. Sin opciones es el orden
 * compartido de Explorar (`best`); con ellas, el tipo y el orden elegidos en el listado.
 */
export async function listAlbumsByDecade(decade: number, page = 1, options: ExploreListOptions = {}): Promise<AlbumPage> {
  assertDecade(decade);
  return listAlbumsFiltered(isNotNull(releaseGroup.firstReleaseYear), { ...options, page, decade });
}

function emptyPage(page: number): AlbumPage {
  paginate(page);
  return { albums: [], page, pageSize: FILTERED_PAGE_SIZE, hasNext: false };
}

/**
 * Álbumes con algún género efectivo de la familia (openspec: add-genre-taxonomy). Una clave
 * desconocida devuelve la página vacía.
 */
export async function listAlbumsByFamily(
  familyKey: string,
  page = 1,
  options: ExploreListOptions = {},
): Promise<AlbumPage & { family: FamilyKey | null }> {
  const family = parseFamilyKey(familyKey);
  if (!family) return { ...emptyPage(page), family: null };
  return { ...(await listAlbumsFiltered(albumInFamily(family), { ...options, page })), family };
}

/**
 * Álbumes con ese género efectivo o uno de sus subgéneros (por slug de la taxonomía). Un slug
 * desconocido devuelve la página vacía.
 */
export async function listAlbumsByGenre(
  slug: string,
  page = 1,
  options: ExploreListOptions = {},
): Promise<AlbumPage & { genre: GenreRow | null }> {
  const found = await findStyleGenreBySlug(slug);
  if (!found) return { ...emptyPage(page), genre: null };
  return { ...(await listAlbumsFiltered(albumInGenreTree(found.id), { ...options, page })), genre: found };
}
