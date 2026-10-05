import { sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { ApiError } from "@/lib/api/errors";
import { escapeLike } from "@/services/catalog/search/normalize";
import { GENRE_PAGE_SIZE } from "./constants";
import { albumInGenreTree, genreWithDescendants } from "./read";

// Artistas de un género (openspec: redesign-genre-page, capabilities `genre-pages` y
// `genre-page-catalog`): los que tienen el género o un subgénero entre sus semillas, con la cantidad de
// álbumes **del género** que se les acreditan (no el total de su discografía).

export const GENRE_ARTIST_SORTS = ["albums", "followed", "az"] as const;
export type GenreArtistSort = (typeof GENRE_ARTIST_SORTS)[number];

export interface GenreArtist {
  id: string;
  name: string;
  type: string;
  /** Foto con licencia libre verificada (ADR 0021); `null` si no hay. */
  photoUrl: string | null;
  /** Álbumes acreditados al artista que son del género o de un subgénero. */
  albumCount: number;
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
}

/** Orden SQL: la cantidad de seguidores solo ordena, nunca se devuelve. */
function artistOrder(sort: GenreArtistSort): SQL {
  switch (sort) {
    case "followed":
      return sql`follow_count DESC, album_count DESC, a.name ASC, a.id ASC`;
    case "az":
      return sql`search_normalize(a.name) ASC, a.id ASC`;
    default:
      return sql`album_count DESC, a.name ASC, a.id ASC`;
  }
}

/** Artistas del género o de sus subgéneros, paginados. Un artista cuenta una vez aunque tenga varios géneros del subárbol. */
export async function listGenreArtists(genreId: string, options: GenreArtistOptions = {}): Promise<GenreArtistPage> {
  const { page = 1, pageSize = GENRE_PAGE_SIZE, sort = "albums" } = options;
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new ApiError("VALIDATION_ERROR", 400, "La paginación no es válida");
  }
  if (!GENRE_ARTIST_SORTS.includes(sort)) throw new ApiError("VALIDATION_ERROR", 400, "El orden no es válido");
  const q = options.q?.trim();
  const textFilter = q
    ? sql`AND search_normalize(a.name) LIKE search_normalize(${`%${escapeLike(q)}%`})`
    : sql``;

  const rows = await db.execute<{
    id: string;
    name: string;
    type: string;
    photo_url: string | null;
    album_count: number;
  }>(sql`
    SELECT a.id, a.name, a.type, a.photo_url, album_count
    FROM artist a
    CROSS JOIN LATERAL (
      SELECT count(DISTINCT c.release_group_id)::int AS album_count
      FROM credit c
      JOIN release_group ON release_group.id = c.release_group_id
      WHERE c.artist_id = a.id AND ${albumInGenreTree(genreId)}
    ) albums
    CROSS JOIN LATERAL (
      SELECT count(*)::int AS follow_count FROM artist_follow f WHERE f.artist_id = a.id
    ) follows
    WHERE a.type <> 'unknown'
      AND EXISTS (
        SELECT 1 FROM artist_genre_seed s
        WHERE s.artist_id = a.id AND s.genre_id IN ${genreWithDescendants(genreId)}
      )
      ${textFilter}
    ORDER BY ${artistOrder(sort)}
    LIMIT ${pageSize + 1} OFFSET ${(page - 1) * pageSize}
  `);

  return {
    artists: rows.slice(0, pageSize).map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      photoUrl: r.photo_url,
      albumCount: Number(r.album_count),
    })),
    page,
    pageSize,
    hasNext: rows.length > pageSize,
  };
}
