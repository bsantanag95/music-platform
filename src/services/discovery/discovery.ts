import { and, asc, desc, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  rating,
  releaseGroup,
  releaseGroupTag,
  review,
  userList,
  userListFeatured,
} from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import type { ReleaseGroup } from "@/lib/api/schemas";
import { enrichLists } from "@/services/lists/lists";
import {
  FILTERED_PAGE_SIZE,
  GENRE_TOP_N,
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

export interface GenreBucket {
  tag: string;
  count: number; // release-groups etiquetados con ese género
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
  genres: GenreBucket[];
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
};

function serializeAlbum(row: {
  id: string;
  mbid: string | null;
  title: string;
  category: string;
  firstReleaseDate: string | null;
  firstReleaseYear: number | null;
  createdAt: Date;
}): ReleaseGroup {
  return {
    id: row.id,
    mbid: row.mbid,
    title: row.title,
    category: row.category as ReleaseGroup["category"],
    firstReleaseDate: row.firstReleaseDate,
    firstReleaseYear: row.firstReleaseYear,
    createdAt: row.createdAt.toISOString(),
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
    .where(eq(userList.audience, "public"))
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

/** Novedades: `studio`/`single_ep` con año conocido, por año descendente. */
export async function listNewReleases(limit = RAIL_SIZE): Promise<ReleaseGroup[]> {
  const rows = await db
    .select(albumColumns)
    .from(releaseGroup)
    .where(
      and(
        isNotNull(releaseGroup.firstReleaseYear),
        sql`${releaseGroup.category} in ${NEW_RELEASE_CATEGORIES}`,
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

/** Top de géneros por cantidad de release-groups etiquetados. */
export async function listGenres(topN = GENRE_TOP_N): Promise<GenreBucket[]> {
  const rows = await db
    .select({
      tag: releaseGroupTag.tag,
      count: sql<number>`count(*)::int`,
    })
    .from(releaseGroupTag)
    .groupBy(releaseGroupTag.tag)
    .orderBy(sql`count(*) desc`, asc(releaseGroupTag.tag))
    .limit(topN);
  return rows.map((row) => ({ tag: row.tag, count: Number(row.count) }));
}

/**
 * Mejor valorados: álbumes con ≥ `MIN_RATINGS_PER_ALBUM` valoraciones, por promedio
 * descendente. Devuelve `[]` (riel omitido) si hay menos de `MIN_ALBUMS_FOR_SECTION`
 * álbumes elegibles.
 */
export async function listTopRated(limit = RAIL_SIZE): Promise<ReleaseGroup[]> {
  const rows = await db
    .select({
      ...albumColumns,
      avgStars: sql<number>`avg(${rating.stars})::float`,
      ratingCount: sql<number>`count(*)::int`,
    })
    .from(rating)
    .innerJoin(releaseGroup, eq(releaseGroup.id, rating.releaseGroupId))
    .where(isNotNull(rating.releaseGroupId))
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
  const [featured, newReleases, decades, genres, topRated, mostReviewed] = await Promise.all([
    listFeaturedCollections(),
    listNewReleases(),
    listDecades(),
    listGenres(),
    listTopRated(),
    listMostReviewed(),
  ]);
  return { featured, newReleases, decades, genres, topRated, mostReviewed };
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

/** Álbumes cuyo `first_release_year` cae en `[decade, decade+9]`. */
export async function listAlbumsByDecade(decade: number, page = 1): Promise<AlbumPage> {
  if (!Number.isInteger(decade) || decade % 10 !== 0 || decade < 1900 || decade > 2100) {
    throw new ApiError("VALIDATION_ERROR", 400, "La década no es válida");
  }
  const { limit, offset } = paginate(page);
  const rows = await db
    .select(albumColumns)
    .from(releaseGroup)
    .leftJoin(rating, eq(rating.releaseGroupId, releaseGroup.id))
    .where(
      and(
        isNotNull(releaseGroup.firstReleaseYear),
        sql`${releaseGroup.firstReleaseYear} between ${decade} and ${decade + 9}`,
      ),
    )
    .groupBy(releaseGroup.id)
    .orderBy(sql`${eligibleAvg} desc nulls last`, desc(releaseGroup.firstReleaseYear), asc(releaseGroup.id))
    .limit(limit)
    .offset(offset);
  return toAlbumPage(rows, page);
}

/** Álbumes etiquetados con `genre`. */
export async function listAlbumsByGenre(genre: string, page = 1): Promise<AlbumPage> {
  const tag = genre.trim().toLowerCase();
  if (!tag || tag.length > 80) {
    throw new ApiError("VALIDATION_ERROR", 400, "El género no es válido");
  }
  const { limit, offset } = paginate(page);
  const rows = await db
    .select(albumColumns)
    .from(releaseGroupTag)
    .innerJoin(releaseGroup, eq(releaseGroup.id, releaseGroupTag.releaseGroupId))
    .leftJoin(rating, eq(rating.releaseGroupId, releaseGroup.id))
    .where(eq(releaseGroupTag.tag, tag))
    .groupBy(releaseGroup.id)
    .orderBy(
      sql`${eligibleAvg} desc nulls last`,
      sql`${releaseGroup.firstReleaseYear} desc nulls last`,
      asc(releaseGroup.id),
    )
    .limit(limit)
    .offset(offset);
  return toAlbumPage(rows, page);
}
