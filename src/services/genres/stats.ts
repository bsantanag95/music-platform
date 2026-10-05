import { cache } from "react";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { COMMUNITY_MIN_COUNT, GENRE_DECADES_MIN } from "./constants";
import { albumInGenreTree, genreWithDescendants } from "./read";

// Cifras de la cabecera y distribución por década de un género (openspec: redesign-genre-page,
// capability `genre-page-overview`). El servicio aplica los umbrales: la interfaz nunca recibe una
// cifra de comunidad bajo el mínimo.

export interface GenreDecade {
  /** Año de inicio de la década: 1970, 1980, … */
  decade: number;
  count: number;
}

export interface GenreStats {
  albumCount: number;
  artistCount: number;
  /** `null` bajo `COMMUNITY_MIN_COUNT` valoraciones. */
  ratingCount: number | null;
  /** Media de todas las valoraciones de los álbumes del género; `null` bajo el umbral. */
  averageStars: number | null;
  /** Década con más álbumes; `null` con menos de `GENRE_DECADES_MIN` décadas. */
  peakDecade: number | null;
  /** De la más reciente a la más antigua; `[]` con menos de `GENRE_DECADES_MIN` décadas. */
  decades: GenreDecade[];
  /** Todas las décadas con álbumes (sin umbral), para el selector de filtros. */
  allDecades: number[];
}

interface RawStats {
  albumCount: number;
  artistCount: number;
  ratingCount: number;
  averageStars: number | null;
  /** De la más reciente a la más antigua. */
  decades: GenreDecade[];
}

/** Aplica los umbrales a las cifras crudas (pura, para probarla sin base de datos). */
export function applyStatsThresholds(raw: RawStats): GenreStats {
  const enoughRatings = raw.ratingCount >= COMMUNITY_MIN_COUNT;
  const enoughDecades = raw.decades.length >= GENRE_DECADES_MIN;
  let peak: GenreDecade | null = null;
  // Recorre de la más reciente a la más antigua: a igualdad gana la década más antigua (la del auge histórico).
  for (const d of raw.decades) if (!peak || d.count >= peak.count) peak = d;
  return {
    albumCount: raw.albumCount,
    artistCount: raw.artistCount,
    ratingCount: enoughRatings ? raw.ratingCount : null,
    averageStars: enoughRatings ? raw.averageStars : null,
    peakDecade: enoughDecades && peak ? peak.decade : null,
    decades: enoughDecades ? raw.decades : [],
    allDecades: raw.decades.map((d) => d.decade),
  };
}

/**
 * Cifras del género y de su subárbol: dos consultas en paralelo sobre el mismo conjunto de álbumes.
 * Memoizada por request (`cache`): la cabecera, la distribución por década y el selector de décadas
 * comparten una sola lectura.
 */
export const getGenreStats = cache(async (genreId: string): Promise<GenreStats> => {
  const [totals, decadeRows] = await Promise.all([
    db.execute<{ album_count: number; artist_count: number; rating_count: number; average_stars: number | null }>(sql`
      WITH albums AS (
        SELECT release_group.id FROM release_group WHERE ${albumInGenreTree(genreId)}
      )
      SELECT
        (SELECT count(*) FROM albums)::int AS album_count,
        (SELECT count(*) FROM artist a
          WHERE a.type <> 'unknown'
            AND EXISTS (
              SELECT 1 FROM artist_genre_seed s
              WHERE s.artist_id = a.id AND s.genre_id IN ${genreWithDescendants(genreId)}
            ))::int AS artist_count,
        (SELECT count(*) FROM rating r WHERE r.release_group_id IN (SELECT id FROM albums))::int AS rating_count,
        (SELECT avg(r.stars) FROM rating r WHERE r.release_group_id IN (SELECT id FROM albums))::float AS average_stars
    `),
    db.execute<{ decade: number; count: number }>(sql`
      SELECT (floor(release_group.first_release_year / 10) * 10)::int AS decade, count(*)::int AS count
      FROM release_group
      WHERE release_group.first_release_year IS NOT NULL AND ${albumInGenreTree(genreId)}
      GROUP BY 1
      ORDER BY 1 DESC
    `),
  ]);

  const row = totals[0];
  return applyStatsThresholds({
    albumCount: Number(row?.album_count ?? 0),
    artistCount: Number(row?.artist_count ?? 0),
    ratingCount: Number(row?.rating_count ?? 0),
    averageStars: row?.average_stars ?? null,
    decades: decadeRows.map((d) => ({ decade: Number(d.decade), count: Number(d.count) })),
  });
});
