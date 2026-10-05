import { sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { ApiError } from "@/lib/api/errors";
import { escapeLike } from "@/services/catalog/search/normalize";
import { artistFollowingCondition, artistKnownCondition } from "./artist-known";
import { DISCOVER_MAX_ALBUMS, DISCOVER_MIN_AVG, GENRE_PAGE_SIZE, MIN_RATINGS_PER_ALBUM } from "./constants";
import { albumInGenreTreeOnce, genreWithDescendants } from "./read";

// Artistas de un género (openspec: redesign-genre-page y add-genre-artist-discovery, capabilities
// `genre-pages`, `genre-page-catalog` y `genre-artist-discovery`): los que tienen el género o un
// subgénero entre sus semillas, con la cantidad de álbumes **del género** que se les acreditan (no el
// total de su discografía), el disco destacado, las marcas personales del lector y los filtros y órdenes
// de descubrimiento.
//
// Reglas de datos (nada se inventa):
//   - «discos propios» = álbumes como artista principal de categoría estudio o single/EP, sin los
//     marcados fuera de la discografía;
//   - la discografía está «explorada» solo si `artist.discography_complete_at` no es nulo;
//   - el debut es el menor año de los discos propios, SOLO con la discografía explorada;
//   - «corta» = explorada y de 1 a `DISCOVER_MAX_ALBUMS` discos propios. Sin explorar, o con 0 discos
//     conocidos, el tamaño es desconocido y el artista NO es corto.

export const GENRE_ARTIST_SORTS = ["albums", "followed", "az", "recent", "discover"] as const;
export type GenreArtistSort = (typeof GENRE_ARTIST_SORTS)[number];

export interface GenreFeaturedAlbum {
  id: string;
  title: string;
  year: number | null;
}

export interface GenreArtist {
  id: string;
  name: string;
  type: string;
  /** Foto con licencia libre verificada (ADR 0021); `null` si no hay. */
  photoUrl: string | null;
  /** Álbumes acreditados al artista que son del género o de un subgénero. */
  albumCount: number;
  /** La discografía se recorrió entera: sin esto el conteo, el tamaño y el debut son desconocidos. */
  discographyComplete: boolean;
  /** Tiene identificador de MusicBrainz (condición para completar su discografía). */
  hasMbid: boolean;
  /** Disco que da una razón para entrar; `null` si no hay álbum elegible. */
  featuredAlbum: GenreFeaturedAlbum | null;
  /** Solo con lector: el artista es conocido por la persona (ver `artist-known.ts`). */
  known?: boolean;
  /** Solo con lector: la persona sigue al artista. */
  following?: boolean;
}

export interface GenreArtistPage {
  artists: GenreArtist[];
  page: number;
  pageSize: number;
  hasNext: boolean;
}

export interface GenreArtistOptions {
  page?: number;
  pageSize?: number;
  q?: string;
  sort?: GenreArtistSort;
  /** Con sesión: habilita las marcas y el filtro `hideKnown`. Sin lector no existe ninguna marca. */
  readerId?: string | null;
  /** País (ISO-2 en mayúsculas). */
  country?: string;
  /** Año de inicio de la década de debut (1990): exige debut conocido. */
  debutDecade?: number;
  /** Solo discografía corta (explorada y de 1 a 5 discos propios). */
  shortOnly?: boolean;
  /** Solo artistas con debut conocido (los discos propios tienen año). */
  debutKnownOnly?: boolean;
  /** Solo artistas con la discografía sin explorar y con MBID (candidatos a completar). */
  unexploredOnly?: boolean;
  /** Oculta los artistas conocidos por el lector (se ignora sin lector). */
  hideKnown?: boolean;
}

const COUNTRY_PATTERN = /^[A-Z]{2}$/;

/**
 * Discos propios y debut del artista `a`, como subconsulta lateral (`own.own_albums`, `own.debut_year`).
 * El debut sale solo si la discografía está explorada.
 */
function ownAlbumsLateral(): SQL {
  return sql`LATERAL (
    SELECT count(DISTINCT orb.id)::int AS own_albums,
           CASE WHEN a.discography_complete_at IS NOT NULL THEN min(orb.first_release_year) END AS debut_year
    FROM credit oc
    JOIN release_group orb ON orb.id = oc.release_group_id
    WHERE oc.artist_id = a.id AND oc.role = 'primary'
      AND orb.category IN ('studio', 'single_ep') AND orb.discography_unlisted_at IS NULL
  ) own`;
}

/** Discografía corta: explorada y de 1 a `DISCOVER_MAX_ALBUMS` discos propios (usa `own` y `a`). */
const SHORT_DISCOGRAPHY = sql`(a.discography_complete_at IS NOT NULL AND own.own_albums BETWEEN 1 AND ${DISCOVER_MAX_ALBUMS})`;

/** Algún álbum del artista dentro del género con valoraciones suficientes y buena media (solo ordena). */
function communitySignal(): SQL {
  return sql`EXISTS (
    SELECT 1 FROM credit sc
    JOIN tree_albums st ON st.release_group_id = sc.release_group_id
    WHERE sc.artist_id = a.id AND sc.role = 'primary'
      AND (SELECT count(*) FROM rating sr WHERE sr.release_group_id = sc.release_group_id) >= ${MIN_RATINGS_PER_ALBUM}
      AND (SELECT avg(sr.stars) FROM rating sr WHERE sr.release_group_id = sc.release_group_id) >= ${DISCOVER_MIN_AVG}
  )`;
}

/** Orden SQL: la cantidad de seguidores solo ordena, nunca se devuelve. Todos desempatan por `a.id`. */
function artistOrder(sort: GenreArtistSort): SQL {
  switch (sort) {
    case "followed":
      return sql`follow_count DESC, album_count DESC, a.name ASC, a.id ASC`;
    case "az":
      return sql`search_normalize(a.name) ASC, a.id ASC`;
    case "recent":
      return sql`own.debut_year DESC NULLS LAST, album_count DESC, a.name ASC, a.id ASC`;
    case "discover":
      return sql`has_signal DESC, follow_count DESC, own.debut_year DESC NULLS LAST, a.name ASC, a.id ASC`;
    default:
      return sql`album_count DESC, a.name ASC, a.id ASC`;
  }
}

function idList(ids: string[]): SQL {
  return sql.join(ids.map((id) => sql`${id}::uuid`), sql`, `);
}

/** Disco destacado de cada artista de la página (una consulta para todos). */
async function featuredAlbums(genreId: string, artistIds: string[]): Promise<Map<string, GenreFeaturedAlbum>> {
  if (artistIds.length === 0) return new Map();
  const rows = await db.execute<{ artist_id: string; id: string; title: string; year: number | null }>(sql`
    SELECT DISTINCT ON (fc.artist_id) fc.artist_id, release_group.id, release_group.title, release_group.first_release_year AS year
    FROM credit fc
    JOIN release_group ON release_group.id = fc.release_group_id
    LEFT JOIN LATERAL (
      SELECT count(*)::int AS n, avg(fr.stars) AS avg FROM rating fr WHERE fr.release_group_id = release_group.id
    ) rt ON TRUE
    WHERE fc.artist_id IN (${idList(artistIds)}) AND fc.role = 'primary'
      AND release_group.category IN ('studio', 'single_ep') AND release_group.discography_unlisted_at IS NULL
      AND ${albumInGenreTreeOnce(genreId)}
    ORDER BY fc.artist_id,
             (rt.n >= ${MIN_RATINGS_PER_ALBUM}) DESC,
             CASE WHEN rt.n >= ${MIN_RATINGS_PER_ALBUM} THEN rt.avg END DESC NULLS LAST,
             (release_group.category = 'studio') DESC,
             release_group.first_release_year DESC NULLS LAST,
             release_group.id ASC
  `);
  return new Map(rows.map((r) => [r.artist_id, { id: r.id, title: r.title, year: r.year === null ? null : Number(r.year) }]));
}

/** Marcas personales de los artistas de la página: solo con lector, solo de ese lector. */
async function readerMarks(readerId: string, artistIds: string[]): Promise<Map<string, { known: boolean; following: boolean }>> {
  if (artistIds.length === 0) return new Map();
  const rows = await db.execute<{ id: string; known: boolean; following: boolean }>(sql`
    SELECT a.id, ${artistKnownCondition(readerId)} AS known, ${artistFollowingCondition(readerId)} AS following
    FROM artist a
    WHERE a.id IN (${idList(artistIds)})
  `);
  return new Map(rows.map((r) => [r.id, { known: r.known === true, following: r.following === true }]));
}

/** Artistas del género o de sus subgéneros, paginados. Un artista cuenta una vez aunque tenga varios géneros del subárbol. */
export async function listGenreArtists(genreId: string, options: GenreArtistOptions = {}): Promise<GenreArtistPage> {
  const { page = 1, pageSize = GENRE_PAGE_SIZE, sort = "albums", readerId = null, country, debutDecade, shortOnly = false, debutKnownOnly = false, unexploredOnly = false } = options;
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new ApiError("VALIDATION_ERROR", 400, "La paginación no es válida");
  }
  if (!GENRE_ARTIST_SORTS.includes(sort)) throw new ApiError("VALIDATION_ERROR", 400, "El orden no es válido");
  if (country !== undefined && !COUNTRY_PATTERN.test(country)) throw new ApiError("VALIDATION_ERROR", 400, "El país no es válido");
  if (debutDecade !== undefined && (!Number.isInteger(debutDecade) || debutDecade % 10 !== 0 || debutDecade < 1900 || debutDecade > 2100)) {
    throw new ApiError("VALIDATION_ERROR", 400, "La década de debut no es válida");
  }

  const filters: SQL[] = [];
  const q = options.q?.trim();
  if (q) filters.push(sql`search_normalize(a.name) LIKE search_normalize(${`%${escapeLike(q)}%`})`);
  if (country !== undefined) filters.push(sql`a.country = ${country}`);
  if (debutDecade !== undefined) filters.push(sql`own.debut_year BETWEEN ${debutDecade} AND ${debutDecade + 9}`);
  if (shortOnly) filters.push(SHORT_DISCOGRAPHY);
  if (debutKnownOnly) filters.push(sql`own.debut_year IS NOT NULL`);
  if (unexploredOnly) filters.push(sql`(a.discography_complete_at IS NULL AND a.mbid IS NOT NULL)`);
  // Sin lector no hay conocidos que ocultar: el filtro se ignora.
  const known = options.hideKnown ? artistKnownCondition(readerId) : null;
  if (known) filters.push(sql`NOT ${known}`);
  const where = filters.length > 0 ? sql`AND ${sql.join(filters, sql` AND `)}` : sql``;
  const signal = sort === "discover" ? communitySignal() : sql`FALSE`;
  // Presupuesto de rendimiento (design D8): solo se calcula lo que el orden o los filtros usan.
  const needsOwn = sort === "recent" || sort === "discover" || debutDecade !== undefined || shortOnly || debutKnownOnly;
  const needsFollows = sort === "followed" || sort === "discover";
  const tree = genreWithDescendants(genreId);

  const rows = await db.execute<{
    id: string;
    name: string;
    type: string;
    photo_url: string | null;
    album_count: number;
    complete: boolean;
    has_mbid: boolean;
  }>(sql`
    WITH tree_albums AS MATERIALIZED (
      SELECT DISTINCT e.release_group_id FROM release_group_effective_genre e WHERE e.genre_id IN ${tree}
    ), tree_artists AS MATERIALIZED (
      SELECT DISTINCT s.artist_id FROM artist_genre_seed s WHERE s.genre_id IN ${tree}
    )
    SELECT a.id, a.name, a.type, a.photo_url, album_count,
           (a.discography_complete_at IS NOT NULL) AS complete, (a.mbid IS NOT NULL) AS has_mbid,
           ${signal} AS has_signal
    FROM tree_artists ta
    JOIN artist a ON a.id = ta.artist_id
    CROSS JOIN LATERAL (
      SELECT count(DISTINCT c.release_group_id)::int AS album_count
      FROM credit c
      JOIN tree_albums t ON t.release_group_id = c.release_group_id
      WHERE c.artist_id = a.id
    ) albums
    ${needsFollows ? sql`CROSS JOIN LATERAL (SELECT count(*)::int AS follow_count FROM artist_follow f WHERE f.artist_id = a.id) follows` : sql``}
    ${needsOwn ? sql`CROSS JOIN ${ownAlbumsLateral()}` : sql``}
    WHERE a.type <> 'unknown'
      ${where}
    ORDER BY ${artistOrder(sort)}
    LIMIT ${pageSize + 1} OFFSET ${(page - 1) * pageSize}
  `);

  const pageRows = rows.slice(0, pageSize);
  const ids = pageRows.map((r) => r.id);
  const [featured, marks] = await Promise.all([
    featuredAlbums(genreId, ids),
    readerId ? readerMarks(readerId, ids) : Promise.resolve(new Map<string, { known: boolean; following: boolean }>()),
  ]);

  return {
    artists: pageRows.map((r) => {
      const mark = marks.get(r.id);
      return {
        id: r.id,
        name: r.name,
        type: r.type,
        photoUrl: r.photo_url,
        albumCount: Number(r.album_count),
        discographyComplete: r.complete === true,
        hasMbid: r.has_mbid === true,
        featuredAlbum: featured.get(r.id) ?? null,
        ...(readerId ? { known: mark?.known ?? false, following: mark?.following ?? false } : {}),
      };
    }),
    page,
    pageSize,
    hasNext: rows.length > pageSize,
  };
}

export interface GenreArtistFacets {
  /** Países presentes entre los artistas del género, del más frecuente al menos. */
  countries: { code: string; count: number }[];
  /** Décadas de debut (solo artistas con debut conocido), de la más reciente a la más antigua. */
  debutDecades: { decade: number; count: number }[];
}

/** Opciones reales de los selectores de país y de debut: una consulta agrupada por faceta, sin una por opción. */
export async function listGenreArtistFacets(genreId: string): Promise<GenreArtistFacets> {
  const inGenre = sql`a.type <> 'unknown' AND EXISTS (
    SELECT 1 FROM artist_genre_seed s WHERE s.artist_id = a.id AND s.genre_id IN ${genreWithDescendants(genreId)}
  )`;
  const [countries, decades] = await Promise.all([
    db.execute<{ country: string; n: number }>(sql`
      SELECT a.country, count(*)::int AS n FROM artist a
      WHERE ${inGenre} AND a.country IS NOT NULL
      GROUP BY a.country ORDER BY n DESC, a.country ASC
    `),
    db.execute<{ decade: number; n: number }>(sql`
      SELECT (own.debut_year / 10 * 10)::int AS decade, count(*)::int AS n
      FROM artist a CROSS JOIN ${ownAlbumsLateral()}
      WHERE ${inGenre} AND own.debut_year IS NOT NULL
      GROUP BY 1 ORDER BY 1 DESC
    `),
  ]);
  return {
    countries: countries.map((c) => ({ code: c.country, count: Number(c.n) })),
    debutDecades: decades.map((d) => ({ decade: Number(d.decade), count: Number(d.n) })),
  };
}
