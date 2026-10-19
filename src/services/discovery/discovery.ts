import { and, asc, desc, eq, inArray, isNotNull, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  artist,
  credit,
  genre,
  genreFamilyMember,
  rating,
  releaseGroup,
  releaseGroupEffectiveGenre,
  userList,
  userListFeatured,
  userListItem,
  type GenreRow,
} from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import { ReleaseGroupCategorySchema, type ReleaseGroup, type ReleaseGroupCategory } from "@/lib/api/schemas";
import { isCoverResolved } from "@/services/catalog/cover-resolution";
import { COLLECTION_FAMILIES, type CollectionFamily } from "./collections/families";
import { escapeLike } from "@/services/catalog/search/normalize";
import { GENRE_FAMILIES, type FamilyKey, type FamilyTier } from "@/services/genres/families";
import { albumInFamily, albumInGenreTree, findStyleGenreBySlug, parseFamilyKey } from "@/services/genres/read";
import { enrichLists } from "@/services/lists/lists";
import { listDecadeCovers } from "./decade-covers";
import { competitionNominations } from "@/services/awards/competition";
import { listFamilyCovers } from "./family-covers";
import { allTimeAlbumRanking, listPopularNow, type PopularResult, type PopularWindow } from "./popularity";
import {
  ARCHIVE_PAGE_SIZE,
  COLLECTION_RAIL_LIMIT,
  FEATURED_RAIL_LIMIT,
  FILTERED_PAGE_SIZE,
  HUB_COLLECTION_LIMIT,
  isValidDecade,
  MIN_ALBUMS_FOR_SECTION,
  MIN_RATINGS_PER_ALBUM,
  NEW_RELEASE_CATEGORIES,
  NEW_RELEASE_WINDOW_DAYS,
  UPCOMING_WINDOW_DAYS,
  RAIL_SIZE,
} from "./constants";

// ---------------------------------------------------------------------------
// Tipos de salida
// ---------------------------------------------------------------------------

export interface FeaturedCollection {
  id: string;
  title: string;
  description: string | null;
  itemCount: number;
  coverThumbs: string[];
  /** Origen de la fila destacada: curada a mano o generada por plantilla. */
  source: "curated" | "template";
  /** Plantilla y período de una colección generada (`null` en las curadas): con ellos se localiza el título. */
  templateKey: string | null;
  periodKey: string | null;
  /** Familia de la colección, guardada en su fila: toda colección destacada tiene una (migración 0071). */
  family: CollectionFamily;
}

/** Colección automática vencida: lleva la fecha en que salió del riel. */
export interface ArchivedCollection extends FeaturedCollection {
  endedAt: string;
}

export interface CollectionArchivePage {
  collections: ArchivedCollection[];
  page: number;
  pageSize: number;
  hasNext: boolean;
}

/** Colecciones vigentes de `/explore/collections`: una sola secuencia, que la página agrupa por familia. */
export interface CollectionsHub {
  collections: FeaturedCollection[];
}

export interface DecadeBucket {
  decade: number; // año de inicio de la década: 1990, 2000, ...
  count: number; // álbumes con año en la década (solo para omitir las vacías: no se muestra)
}

/** Década de la portada con las carátulas de su tarjeta (hasta 4 de discos de estudio; vacío si no hay ninguna). */
export interface DecadeCard extends DecadeBucket {
  covers: string[];
}

export interface FamilyBucket {
  key: FamilyKey;
  tier: FamilyTier;
  count: number; // álbumes con algún género efectivo de la familia (solo para omitir las vacías: no se muestra)
  /** Hasta 4 carátulas de discos de estudio de la familia para su tarjeta; vacío si no hay ninguna. */
  covers: string[];
}

export interface AlbumPage {
  albums: ReleaseGroup[];
  page: number;
  pageSize: number;
  hasNext: boolean;
}

export interface ExplorePage {
  /** Un solo riel de colecciones: curadas y generadas mezcladas (ADR 0038). */
  collections: FeaturedCollection[];
  newReleases: ReleaseGroup[];
  upcoming: ReleaseGroup[];
  decades: DecadeCard[];
  families: FamilyBucket[];
  topRated: TopRatedAlbum[];
  popular: PopularSection;
}

/** Álbum de "Mejor valorados" con la cifra que lo ubica ahí (la tarjeta la muestra). */
export type TopRatedAlbum = ReleaseGroup & { avgStars: number; ratingCount: number };

/** Álbum de "Más reseñados" con su número de reseñas. */
/** Un ítem de "Popular ahora": `people` solo se muestra desde `POPULARITY_FIGURE_MIN`. */
export type PopularAlbum = ReleaseGroup & { people: number };
export interface PopularArtist {
  id: string;
  name: string;
  /** Foto de Commons con licencia verificada; `null` si no hay o fue retirada. */
  photoUrl: string | null;
  people: number;
}
export interface PopularSong {
  id: string;
  title: string;
  /** Artista principal de la grabación. */
  artistName: string | null;
  /** Carátula de un disco que contiene la grabación. */
  coverThumbUrl: string | null;
  people: number;
}
export interface PopularTab<T> {
  window: PopularWindow;
  items: T[];
}
/** "Popular ahora" (openspec: explore-popular-now): cada tipo con su ventana, o `null` si no llega al mínimo. */
export interface PopularSection {
  albums: PopularTab<PopularAlbum> | null;
  artists: PopularTab<PopularArtist> | null;
  songs: PopularTab<PopularSong> | null;
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

/** Carátulas de la tarjeta de una colección destacada (una pila de sleeves, no el mosaico de 4). */
const FEATURED_COVER_THUMBS = 6;

/**
 * Condición de vigencia de una fila de `user_list_featured`: ya empezó y no venció. La comparten el
 * riel de `/explore` y la sección "Destacadas" de Listas.
 */
export function featuredActiveCondition(): SQL {
  return and(
    sql`${userListFeatured.startsAt} <= now()`,
    sql`(${userListFeatured.expiresAt} is null or ${userListFeatured.expiresAt} > now())`,
  ) as SQL;
}

/**
 * La lista tiene al menos un álbum. Una colección sin álbumes no se lista en ninguna superficie (openspec:
 * redesign-collections-hub): se resuelve aquí, en la consulta, y no filtrando después, para que el tope del riel
 * siga lleno. El detalle por enlace directo no usa esta condición.
 */
export function hasAlbumsCondition(): SQL {
  return sql`exists (select 1 from ${userListItem} where ${userListItem.listId} = ${userList.id} and ${userListItem.releaseGroupId} is not null)`;
}

/**
 * Condición completa del riel de colecciones destacadas: lista pública, visible, estándar, con álbumes, con fila vigente y, si
 * es curada, oficial no retirada (retirar una lista oficial la saca del riel sin borrar su fila; las generadas
 * por plantilla no son oficiales). Openspec: manage-explore-featured-console.
 */
export function featuredRailCondition(): SQL {
  return and(
    eq(userList.audience, "public"),
    eq(userList.kind, "standard"),
    eq(userList.moderationStatus, "visible"),
    hasAlbumsCondition(),
    featuredActiveCondition(),
    sql`(${userListFeatured.source} = 'template' or (${userList.isOfficial} and ${userList.officialWithdrawnAt} is null))`,
  ) as SQL;
}

interface FeaturedRow {
  id: string;
  title: string;
  description: string | null;
  source: "curated" | "template";
  templateKey: string | null;
  periodKey: string | null;
  family: CollectionFamily;
}

const featuredRowColumns = {
  id: userList.id,
  title: userList.title,
  description: userList.description,
  source: userListFeatured.source,
  templateKey: userListFeatured.templateKey,
  periodKey: userListFeatured.periodKey,
  family: userListFeatured.family,
};

/** Añade conteo de ítems, carátulas y familia a las filas destacadas. */
async function enrichFeatured(rows: FeaturedRow[]): Promise<FeaturedCollection[]> {
  const enrichment = await enrichLists(
    rows.map((row) => row.id),
    FEATURED_COVER_THUMBS,
  );
  return rows.map((row) => {
    const enriched = enrichment.get(row.id);
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      itemCount: enriched?.itemCount ?? 0,
      coverThumbs: enriched?.coverThumbs ?? [],
      source: row.source,
      templateKey: row.source === "template" ? row.templateKey : null,
      periodKey: row.source === "template" ? row.periodKey : null,
      family: row.family,
    };
  });
}

const featuredOrder = () => [desc(userListFeatured.weight), asc(userListFeatured.rank), desc(userListFeatured.startsAt)];

/**
 * Colecciones destacadas mezcladas (curadas y generadas): listas públicas con fila vigente en
 * `user_list_featured`, por `weight` desc y `rank` asc, con tope `FEATURED_RAIL_LIMIT`. La usa la Inicio
 * anónima; `/explore` separa los dos grupos (`listEditorialCollections` / `listAutomaticCollections`).
 */
export async function listFeaturedCollections(): Promise<FeaturedCollection[]> {
  const rows = await db
    .select(featuredRowColumns)
    .from(userListFeatured)
    .innerJoin(userList, eq(userList.id, userListFeatured.listId))
    .where(featuredRailCondition())
    .orderBy(...featuredOrder())
    .limit(FEATURED_RAIL_LIMIT);
  return enrichFeatured(rows);
}

/**
 * Riel de colecciones de `/explore` (openspec: unify-explore-collections, ADR 0038): un solo riel con las
 * curadas y las generadas mezcladas, por `weight` desc y `rank` asc. Cómo se mantiene una colección no es
 * información para quien mira; lo que la distingue de las otras es su familia.
 */
export async function listCollections(limit = COLLECTION_RAIL_LIMIT): Promise<FeaturedCollection[]> {
  const rows = await db
    .select(featuredRowColumns)
    .from(userListFeatured)
    .innerJoin(userList, eq(userList.id, userListFeatured.listId))
    .where(featuredRailCondition())
    .orderBy(...featuredOrder())
    .limit(limit);
  return enrichFeatured(rows);
}

/** Todo lo vigente de `/explore/collections`, en una secuencia que la página agrupa por familia. */
export async function listCollectionsHub(): Promise<CollectionsHub> {
  return { collections: await listCollections(HUB_COLLECTION_LIMIT) };
}

/**
 * Familias con al menos una colección listable, vigente o archivada, en el orden del registro de familias. Alimenta el
 * filtro de la página de colecciones: solo ofrece los tipos que tienen algo que mostrar. Mismas condiciones que las
 * listas (pública, visible, con álbumes; las archivadas, solo las automáticas).
 */
export async function listCollectionFamilies(): Promise<CollectionFamily[]> {
  const rows = await db
    .selectDistinct({ family: userListFeatured.family })
    .from(userListFeatured)
    .innerJoin(userList, eq(userList.id, userListFeatured.listId))
    .where(
      and(
        eq(userList.audience, "public"),
        eq(userList.kind, "standard"),
        eq(userList.moderationStatus, "visible"),
        hasAlbumsCondition(),
        sql`(${featuredRailCondition()}) or (${userListFeatured.source} = 'template' and ${userListFeatured.expiresAt} <= now())`,
      ),
    );
  const present = new Set<string>(rows.map((row) => row.family));
  return COLLECTION_FAMILIES.filter((family) => present.has(family));
}

/** Condición de familia: desde la migración 0071 la familia está en la fila, sin pasar por el registro. */
function familyCondition(family: CollectionFamily): SQL {
  return eq(userListFeatured.family, family) as SQL;
}

/**
 * Archivo de colecciones automáticas vencidas (`expires_at` en el pasado) cuya lista sigue pública y visible:
 * la más reciente primero. Sigue enlazando a su lista, que conserva los álbumes del último período.
 */
export async function listCollectionArchive(
  options: { family?: CollectionFamily; page?: number } = {},
): Promise<CollectionArchivePage> {
  const page = Math.max(1, Math.floor(options.page ?? 1));
  const rows = await db
    .select({ ...featuredRowColumns, endedAt: userListFeatured.expiresAt })
    .from(userListFeatured)
    .innerJoin(userList, eq(userList.id, userListFeatured.listId))
    .where(
      and(
        eq(userListFeatured.source, "template"),
        eq(userList.audience, "public"),
        eq(userList.kind, "standard"),
        eq(userList.moderationStatus, "visible"),
        hasAlbumsCondition(),
        sql`${userListFeatured.expiresAt} <= now()`,
        options.family ? familyCondition(options.family) : undefined,
      ),
    )
    .orderBy(desc(userListFeatured.expiresAt), asc(userList.id))
    .limit(ARCHIVE_PAGE_SIZE + 1)
    .offset((page - 1) * ARCHIVE_PAGE_SIZE);

  const visible = rows.slice(0, ARCHIVE_PAGE_SIZE);
  const enriched = await enrichFeatured(visible);
  return {
    collections: enriched.map((collection, index) => ({
      ...collection,
      endedAt: visible[index]!.endedAt!.toISOString(),
    })),
    page,
    pageSize: ARCHIVE_PAGE_SIZE,
    hasNext: rows.length > ARCHIVE_PAGE_SIZE,
  };
}

/**
 * Condición de "Novedades": `studio`/`single_ep` lanzados en los últimos `NEW_RELEASE_WINDOW_DAYS`
 * días (fecha completa, hasta hoy, inclusive), con carátula. La comparten el riel y el listado.
 */
export function newReleasesCondition(): SQL {
  return and(
    sql`${releaseGroup.category} in ${NEW_RELEASE_CATEGORIES}`,
    sql`${releaseGroup.firstReleaseDate} between current_date - ${NEW_RELEASE_WINDOW_DAYS}::int and current_date`,
    isNotNull(releaseGroup.coverThumbUrl),
  ) as SQL;
}

export const newReleasesOrder = () => [desc(releaseGroup.firstReleaseDate), asc(releaseGroup.id)];

/**
 * Novedades de `/explore`: el más reciente primero. Devuelve `[]` (riel omitido) si hay menos de
 * `MIN_ALBUMS_FOR_SECTION` álbumes elegibles.
 */
export async function listNewReleases(limit = RAIL_SIZE): Promise<ReleaseGroup[]> {
  const rows = await db
    .select(albumColumns)
    .from(releaseGroup)
    .where(newReleasesCondition())
    .orderBy(...newReleasesOrder())
    .limit(Math.max(limit, MIN_ALBUMS_FOR_SECTION));

  if (rows.length < MIN_ALBUMS_FOR_SECTION) return [];
  return rows.slice(0, limit).map(serializeAlbum);
}

/** Listado completo y paginado de novedades (`/explore?novedades=1`), sin umbral. */
export async function listNewAlbums(page = 1, options: Pick<AlbumFilterOptions, "category"> = {}): Promise<AlbumPage> {
  const { limit, offset } = paginate(page);
  const { category } = options;
  if (category !== undefined && !ReleaseGroupCategorySchema.safeParse(category).success) {
    throw new ApiError("VALIDATION_ERROR", 400, "El tipo de álbum no es válido");
  }
  const rows = await db
    .select(albumColumns)
    .from(releaseGroup)
    .where(and(newReleasesCondition(), category !== undefined ? eq(releaseGroup.category, category) : undefined))
    .orderBy(...newReleasesOrder())
    .limit(limit)
    .offset(offset);
  return toAlbumPage(rows, page);
}

/**
 * Condición de "Próximos lanzamientos": `studio`/`single_ep` con fecha completa posterior a hoy y
 * hasta hoy + `UPCOMING_WINDOW_DAYS`, con carátula. Lo de hoy ya cuenta como publicado
 * (Novedades), así que las dos ventanas no se solapan ni dejan hueco.
 */
function upcomingCondition(): SQL {
  return and(
    sql`${releaseGroup.category} in ${NEW_RELEASE_CATEGORIES}`,
    sql`${releaseGroup.firstReleaseDate} > current_date`,
    sql`${releaseGroup.firstReleaseDate} <= current_date + ${UPCOMING_WINDOW_DAYS}::int`,
    isNotNull(releaseGroup.coverThumbUrl),
  ) as SQL;
}

const upcomingOrder = () => [asc(releaseGroup.firstReleaseDate), asc(releaseGroup.id)];

/**
 * Próximos lanzamientos de `/explore`: el más cercano primero, sin recorte por popularidad,
 * artista ni familia. Devuelve `[]` (riel omitido) si hay menos de `MIN_ALBUMS_FOR_SECTION`.
 */
export async function listUpcomingReleases(limit = RAIL_SIZE): Promise<ReleaseGroup[]> {
  const rows = await db
    .select(albumColumns)
    .from(releaseGroup)
    .where(upcomingCondition())
    .orderBy(...upcomingOrder())
    .limit(Math.max(limit, MIN_ALBUMS_FOR_SECTION));

  if (rows.length < MIN_ALBUMS_FOR_SECTION) return [];
  return rows.slice(0, limit).map(serializeAlbum);
}

/** Listado completo y paginado de próximos lanzamientos (`/explore?proximos=1`), sin umbral. */
export async function listUpcomingAlbums(
  page = 1,
  options: Pick<AlbumFilterOptions, "category"> = {},
): Promise<AlbumPage> {
  const { limit, offset } = paginate(page);
  const { category } = options;
  if (category !== undefined && !ReleaseGroupCategorySchema.safeParse(category).success) {
    throw new ApiError("VALIDATION_ERROR", 400, "El tipo de álbum no es válido");
  }
  const rows = await db
    .select(albumColumns)
    .from(releaseGroup)
    .where(and(upcomingCondition(), category !== undefined ? eq(releaseGroup.category, category) : undefined))
    .orderBy(...upcomingOrder())
    .limit(limit)
    .offset(offset);
  return toAlbumPage(rows, page);
}

/**
 * Recientes por año (riel "Novedades" de la página de género): `studio`/`single_ep` con año
 * conocido, por año descendente. `condition` (correlacionada con "release_group") acota el
 * conjunto, p. ej. al subárbol de un género. Sin ventana ni umbral: un género tiene poco catálogo.
 */
export async function listRecentByYear(limit = RAIL_SIZE, condition?: SQL): Promise<ReleaseGroup[]> {
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

/** Décadas de la portada con las carátulas de su tarjeta (openspec: redesign-explore-decades), de la más reciente a la más antigua. */
async function listDecadeCards(): Promise<DecadeCard[]> {
  const [decades, covers] = await Promise.all([listDecades(), listDecadeCovers()]);
  return decades.map((bucket) => ({ ...bucket, covers: covers.get(bucket.decade) ?? [] }));
}

/**
 * Disco ya publicado: con fecha, no posterior a hoy; sin fecha completa, de un año no posterior al actual. Un año cuyos discos están
 * todos por salir no es un año para recorrer (openspec: redesign-decade-view).
 */
const publishedCondition = sql`coalesce(${releaseGroup.firstReleaseDate} <= current_date, ${releaseGroup.firstReleaseYear} <= extract(year from current_date))`;

/**
 * Años de una década con al menos un álbum ya publicado, del más antiguo al más reciente: los chips de la vista de década. Sin
 * cifras. Un año con solo lanzamientos por salir no aparece (aunque `?anio=` con ese año siga funcionando).
 */
export async function listDecadeYears(decade: number): Promise<number[]> {
  assertDecade(decade);
  const rows = await db
    .selectDistinct({ year: releaseGroup.firstReleaseYear })
    .from(releaseGroup)
    .where(and(sql`${releaseGroup.firstReleaseYear} between ${decade} and ${decade + 9}`, publishedCondition))
    .orderBy(asc(releaseGroup.firstReleaseYear));
  return rows.flatMap((row) => (row.year === null ? [] : [row.year]));
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
  const covers = await listFamilyCovers();
  return GENRE_FAMILIES.map((f) => ({ key: f.key, tier: f.tier, count: counts.get(f.key) ?? 0, covers: covers.get(f.key) ?? [] })).filter(
    (f) => f.count > 0,
  );
}

/**
 * Mejor valorados: álbumes con ≥ `MIN_RATINGS_PER_ALBUM` valoraciones, por promedio
 * descendente. Devuelve `[]` (riel omitido) si hay menos de `MIN_ALBUMS_FOR_SECTION`
 * álbumes elegibles. `condition` (opcional, correlacionada con "release_group") acota el conjunto.
 */
export async function listTopRated(limit = RAIL_SIZE, condition?: SQL): Promise<TopRatedAlbum[]> {
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
  return rows
    .slice(0, limit)
    .map((row) => ({ ...serializeAlbum(row), avgStars: Number(row.avgStars), ratingCount: Number(row.ratingCount) }));
}

/**
 * "Popular ahora" listo para pintar: las puntuaciones de `popularity.ts` (con su ventana y su caché) completadas con los datos de
 * cada álbum, artista y canción, en el orden de la puntuación. Un ítem que ya no existe se descarta.
 */
export async function listPopularSection(): Promise<PopularSection> {
  const popular = await listPopularNow();
  const [albums, artists, songs] = await Promise.all([
    hydrateAlbums(popular.albums),
    hydrateArtists(popular.artists),
    hydrateSongs(popular.songs),
  ]);
  return { albums, artists, songs };
}

function inScoreOrder<T extends { id: string }>(result: PopularResult, found: T[], extra: (item: T, people: number) => T) {
  const byId = new Map(found.map((item) => [item.id, item]));
  const items = result.items.flatMap((score) => {
    const item = byId.get(score.id);
    return item ? [extra(item, score.people)] : [];
  });
  return items.length > 0 ? { window: result.window, items } : null;
}

async function hydrateAlbums(result: PopularResult | null): Promise<PopularTab<PopularAlbum> | null> {
  if (!result) return null;
  const rows = await db
    .select(albumColumns)
    .from(releaseGroup)
    .where(inArray(releaseGroup.id, result.items.map((item) => item.id)));
  return inScoreOrder(result, rows.map((row) => ({ ...serializeAlbum(row), people: 0 })), (album, people) => ({ ...album, people }));
}

async function hydrateArtists(result: PopularResult | null): Promise<PopularTab<PopularArtist> | null> {
  if (!result) return null;
  const rows = await db
    .select({ id: artist.id, name: artist.name, photoUrl: artist.photoUrl, photoBlockedAt: artist.photoBlockedAt })
    .from(artist)
    .where(inArray(artist.id, result.items.map((item) => item.id)));
  const found = rows.map((row) => ({ id: row.id, name: row.name, photoUrl: row.photoBlockedAt ? null : row.photoUrl, people: 0 }));
  return inScoreOrder(result, found, (item, people) => ({ ...item, people }));
}

async function hydrateSongs(result: PopularResult | null): Promise<PopularTab<PopularSong> | null> {
  if (!result) return null;
  const ids = result.items.map((item) => item.id);
  // Una consulta: título, artista principal (primer crédito de la grabación) y una carátula de un disco que la contiene.
  const rows = (await db.execute(sql`
    select r.id, r.title,
      (select a.name from credit c join artist a on a.id = c.artist_id
        where c.recording_id = r.id order by c.position limit 1) as "artistName",
      (select rg.cover_thumb_url from track t join release rl on rl.id = t.release_id
        join release_group rg on rg.id = rl.release_group_id
        where t.recording_id = r.id and rg.cover_thumb_url is not null
        order by (rg.category = 'studio') desc, rg.first_release_year asc nulls last, rg.id limit 1) as "coverThumbUrl"
    from recording r
    where r.id in (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})
  `)) as unknown as { id: string; title: string; artistName: string | null; coverThumbUrl: string | null }[];
  return inScoreOrder(result, rows.map((row) => ({ ...row, people: 0 })), (item, people) => ({ ...item, people }));
}


/** Fecha de lanzamiento de cada álbum (`YYYY-MM-DD`, parcial o `null`) y su año, en una consulta. */
export async function albumReleaseDates(
  ids: string[],
): Promise<Record<string, { date: string | null; year: number | null }>> {
  const dates: Record<string, { date: string | null; year: number | null }> = {};
  const unique = [...new Set(ids)];
  if (unique.length === 0) return dates;
  const rows = await db
    .select({ id: releaseGroup.id, date: releaseGroup.firstReleaseDate, year: releaseGroup.firstReleaseYear })
    .from(releaseGroup)
    .where(inArray(releaseGroup.id, unique));
  for (const row of rows) dates[row.id] = { date: row.date, year: row.year };
  return dates;
}

/**
 * Artista principal de cada álbum (el primer crédito `primary`), para la línea de artista de las tarjetas: sin
 * ella, un disco homónimo ("Mötley Crüe") o un single de una serie ("Stand Out") no dicen de quién son. Una sola
 * consulta para todos los ids.
 */
export async function albumArtistNames(ids: string[]): Promise<Record<string, string>> {
  const names: Record<string, string> = {};
  const unique = [...new Set(ids)];
  if (unique.length === 0) return names;
  const rows = await db
    .select({ releaseGroupId: credit.releaseGroupId, name: artist.name })
    .from(credit)
    .innerJoin(artist, eq(artist.id, credit.artistId))
    .where(and(inArray(credit.releaseGroupId, unique), eq(credit.role, "primary")))
    .orderBy(asc(credit.position));
  for (const row of rows) if (row.releaseGroupId && !(row.releaseGroupId in names)) names[row.releaseGroupId] = row.name;
  return names;
}

/** Composición de la portada de `/explore` en una sola llamada. */
export async function getExplorePage(): Promise<ExplorePage> {
  const [collections, newReleases, upcoming, decades, families, topRated, popular] = await Promise.all([
    listCollections(),
    listNewReleases(),
    listUpcomingReleases(),
    listDecadeCards(),
    listGenreFamilies(),
    listTopRated(),
    listPopularSection(),
  ]);
  return { collections, newReleases, upcoming, decades, families, topRated, popular };
}

// ---------------------------------------------------------------------------
// Listados filtrados (un corte a la vez)
// ---------------------------------------------------------------------------

// Orden determinista compartido ("Destacados", openspec: redesign-family-view): los lanzamientos que aún no salen van al
// final; luego la valoración agregada cuando el álbum es elegible (≥ MIN_RATINGS_PER_ALBUM), el premio, los discos de
// estudio antes que sencillos, recopilaciones y directos, la carátula ya resuelta, el año descendente y, al final, el id.
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
  if (!isValidDecade(decade)) {
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
  /** Año concreto; con `decade`, debe caer dentro de ella (openspec: redesign-explore-decades). */
  year?: number;
  /** Texto libre: título del álbum o nombre de un artista acreditado, sin acentos ni mayúsculas. */
  q?: string;
  sort?: AlbumSort;
}

/**
 * Solo cuentan los premios competitivos: una incorporación a un salón de la fama no es un premio ganado (ADR 0044).
 * 2 si el disco ganó un premio, 1 si fue nominado (directo o como disco ancla de una grabación), `null` si no tiene.
 * Subconsultas **no correlacionadas**: Postgres las evalúa una vez como conjuntos y las consulta por fila; la versión
 * correlacionada (`n.release_group_id = rg.id or n.anchor_release_group_id = rg.id`) recorría la tabla por cada disco y
 * llevaba el listado de Rock de 0,2 s a 1,5 s.
 */
const awardScore = sql`(
  case
    when "release_group"."id" in (
      select release_group_id from ${competitionNominations} cn where cn.won and cn.release_group_id is not null
      union
      select anchor_release_group_id from ${competitionNominations} cn where cn.won and cn.anchor_release_group_id is not null
    ) then 2
    when "release_group"."id" in (
      select release_group_id from ${competitionNominations} cn where cn.release_group_id is not null
      union
      select anchor_release_group_id from ${competitionNominations} cn where cn.anchor_release_group_id is not null
    ) then 1
  end
)`;

/**
 * Orden "Destacados". `yearTiebreak: false` quita el año descendente como desempate: dentro de una década (o un año) sin
 * valoraciones ni premios apilaba en la primera página el último año del período; sin él, el id (un uuid) mezcla los años de
 * forma estable (openspec: redesign-explore-decades).
 */
export function bestOrderFor({ yearTiebreak = true }: { yearTiebreak?: boolean } = {}): SQL[] {
  return [
    // Un disco por salir pertenece a "Próximos", no a "lo mejor": `coalesce` porque sin fecha el booleano sería `null`.
    sql`coalesce(${releaseGroup.firstReleaseDate} > current_date, false) asc`,
    // Sin carátula confirmada (comprobada y ausente, o retirada) va después de todo lo que tiene o puede tener carátula: una
    // primera página llena de siluetas de disco no invita a explorar. Un disco aún no comprobado no se mueve (puede tenerla).
    sql`(${releaseGroup.coverBlockedAt} is not null or (${releaseGroup.coverThumbUrl} is null and ${releaseGroup.coverCheckedAt} is not null)) asc`,
    sql`${eligibleAvg} desc nulls last`,
    sql`${awardScore} desc nulls last`,
    sql`(${releaseGroup.category} = 'studio') desc`,
    sql`(${releaseGroup.coverThumbUrl} is not null) desc`,
    ...(yearTiebreak ? [sql`${releaseGroup.firstReleaseYear} desc nulls last`] : []),
    asc(releaseGroup.id),
  ];
}

export const bestOrder = bestOrderFor();

/**
 * Orden "Populares" (openspec: explore-popular-now): la posición del álbum en el ranking de popularidad de siempre (personas
 * distintas con peso por gesto, `popularity.ts`), y los que no tienen actividad al final, en orden "Destacados". El ranking es una
 * lista de ids que crece con la actividad; ordenar por su posición evita unir la consulta de gestos al listado.
 */
function popularOrder(ranking: string[], best: SQL[]): SQL[] {
  if (ranking.length === 0) return best;
  const ids = sql`array[${sql.join(ranking.map((id) => sql`${id}`), sql`, `)}]::uuid[]`;
  return [sql`array_position(${ids}, "release_group"."id") asc nulls last`, ...best];
}

function albumOrder(sort: AlbumSort, ranking: string[] = [], yearTiebreak = true): SQL[] {
  const best = yearTiebreak ? bestOrder : bestOrderFor({ yearTiebreak: false });
  switch (sort) {
    case "popular":
      return popularOrder(ranking, best);
    case "newest":
      return [sql`${releaseGroup.firstReleaseYear} desc nulls last`, asc(releaseGroup.id)];
    case "oldest":
      return [sql`${releaseGroup.firstReleaseYear} asc nulls last`, asc(releaseGroup.id)];
    case "az":
      return [sql`search_normalize(${releaseGroup.title}) asc`, asc(releaseGroup.id)];
    default:
      return best;
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
  const { page = 1, category, decade, year, sort = "best" } = options;
  const { limit, offset } = paginate(page);
  if (category !== undefined && !ReleaseGroupCategorySchema.safeParse(category).success) {
    throw new ApiError("VALIDATION_ERROR", 400, "El tipo de álbum no es válido");
  }
  if (decade !== undefined) assertDecade(decade);
  if (year !== undefined && (!Number.isInteger(year) || (decade !== undefined && (year < decade || year > decade + 9)))) {
    throw new ApiError("VALIDATION_ERROR", 400, "El año no es válido");
  }
  if (!ALBUM_SORTS.includes(sort)) throw new ApiError("VALIDATION_ERROR", 400, "El orden no es válido");
  const q = options.q?.trim();

  const filters: SQL[] = [condition];
  if (category !== undefined) filters.push(eq(releaseGroup.category, category));
  filters.push(...periodFilters(decade, year));
  if (q) filters.push(albumTextMatch(q));

  const rows = await db
    .select(albumColumns)
    .from(releaseGroup)
    .leftJoin(rating, eq(rating.releaseGroupId, releaseGroup.id))
    .where(and(...filters))
    .groupBy(releaseGroup.id)
    // Dentro de una década o un año el año no desempata (ver `bestOrderFor`).
    .orderBy(...albumOrder(sort, sort === "popular" ? await allTimeAlbumRanking() : [], decade === undefined && year === undefined))
    .limit(limit)
    .offset(offset);
  return toAlbumPage(rows, page);
}

/** Filtros de período de un listado: la década (`between`) y el año exacto. Se comparten con `listCategoriesIn`. */
function periodFilters(decade: number | undefined, year: number | undefined): SQL[] {
  const filters: SQL[] = [];
  if (decade !== undefined) filters.push(sql`${releaseGroup.firstReleaseYear} between ${decade} and ${decade + 9}`);
  if (year !== undefined) filters.push(eq(releaseGroup.firstReleaseYear, year));
  return filters;
}

/**
 * Tipos de álbum que tienen al menos un disco en un corte (`condition` más década y año opcionales): los chips de tipo de la vista de
 * década deshabilitan los demás. Una consulta `select distinct`, sin caché porque depende del corte.
 */
export async function listCategoriesIn(
  condition: SQL,
  scope: { decade?: number; year?: number } = {},
): Promise<ReleaseGroupCategory[]> {
  if (scope.decade !== undefined) assertDecade(scope.decade);
  const rows = await db
    .selectDistinct({ category: releaseGroup.category })
    .from(releaseGroup)
    .where(and(condition, ...periodFilters(scope.decade, scope.year)));
  return rows.map((row) => row.category as ReleaseGroupCategory);
}

/**
 * Tipos con discos en una década, refinada por año y por género (con sus subgéneros): los chips de tipo de la vista de década
 * deshabilitan los demás (openspec: redesign-decade-view).
 */
export async function listDecadeCategories(
  decade: number,
  scope: { year?: number; genreId?: string } = {},
): Promise<ReleaseGroupCategory[]> {
  const condition = scope.genreId ? albumInGenreTree(scope.genreId) : isNotNull(releaseGroup.firstReleaseYear);
  return listCategoriesIn(condition, { decade, year: scope.year });
}

/** Tipo y orden opcionales de los listados de Explorar (la paginación va aparte); la década solo la usa el listado por género. */
export type ExploreListOptions = Pick<AlbumFilterOptions, "category" | "sort" | "year" | "decade">;

/**
 * Álbumes cuyo `first_release_year` cae en `[decade, decade+9]` (o es exactamente `year`, que debe ser de la década). Sin
 * opciones es el orden compartido de Explorar (`best`); con ellas, el tipo y el orden elegidos en el listado. Para refinar por
 * género dentro de la década se usa `listAlbumsByGenre(slug, page, { decade, … })`.
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
