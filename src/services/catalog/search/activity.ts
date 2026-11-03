// Señal de actividad propia para ordenar resultados (openspec:
// redesign-scoped-search, capacidad search-query-matching). MusicBrainz no
// expone popularidad; la plataforma sí sabe qué álbumes, artistas y canciones
// tienen calificaciones, reseñas, escuchas o seguidores. Solo se usa para
// ordenar: los conteos nunca se exponen, y las escuchas privadas no cuentan.
//
// Una consulta por tipo sobre los candidatos de la página (decenas de ids):
// sin tablas ni vistas nuevas.

import { sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { COMMUNITY_MIN_COUNT } from "@/services/catalog/album-community-shared";

export type ActivityKind = "artist" | "release-group" | "recording";

function idList(ids: string[]): SQL {
  return sql`(${sql.join(
    ids.map((id) => sql`${id}::uuid`),
    sql`, `,
  )})`;
}

function activityQuery(kind: ActivityKind, ids: string[]): SQL {
  const list = idList(ids);
  if (kind === "release-group") {
    return sql`
      SELECT target_id AS id, count(*)::int AS score FROM (
        SELECT release_group_id AS target_id FROM rating WHERE release_group_id IN ${list}
        UNION ALL
        SELECT release_group_id FROM review
          WHERE release_group_id IN ${list} AND moderation_status = 'visible'
        UNION ALL
        SELECT release_group_id FROM listen_entry
          WHERE release_group_id IN ${list} AND audience <> 'private'
      ) activity GROUP BY target_id`;
  }
  if (kind === "recording") {
    return sql`
      SELECT target_id AS id, count(*)::int AS score FROM (
        SELECT recording_id AS target_id FROM rating WHERE recording_id IN ${list}
        UNION ALL
        SELECT recording_id FROM listen_entry
          WHERE recording_id IN ${list} AND audience <> 'private'
      ) activity GROUP BY target_id`;
  }
  // Artista: seguidores, más calificaciones y reseñas propias y de sus álbumes.
  return sql`
    SELECT target_id AS id, count(*)::int AS score FROM (
      SELECT artist_id AS target_id FROM artist_follow WHERE artist_id IN ${list}
      UNION ALL
      SELECT artist_id FROM rating WHERE artist_id IN ${list}
      UNION ALL
      SELECT artist_id FROM review WHERE artist_id IN ${list} AND moderation_status = 'visible'
      UNION ALL
      SELECT c.artist_id FROM credit c
        JOIN rating r ON r.release_group_id = c.release_group_id
        WHERE c.artist_id IN ${list} AND c.role = 'primary'
    ) activity GROUP BY target_id`;
}

/** Puntaje de actividad por id (ausente = sin actividad). */
export async function activityScores(
  kind: ActivityKind,
  ids: string[],
): Promise<Map<string, number>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const rows = (await db.execute(activityQuery(kind, unique))) as unknown as {
    id: string;
    score: number;
  }[];
  return new Map(rows.map((row) => [row.id, Number(row.score)]));
}

/**
 * Discos o grabaciones cuyo artista principal ya se exploró en la plataforma: alguien abrió su página y su
 * discografía quedó sincronizada (openspec: refine-search-results-phase1, design D1). Es la señal que separa "The
 * Wall" de Pink Floyd de los 24 homónimos que trajo la búsqueda como stubs: MusicBrainz los puntúa igual y su
 * primera página puede ni siquiera incluir el conocido. Para un disco, vale 2 si es de estudio y 1 si no.
 */
export async function exploredScores(
  kind: "release-group" | "recording",
  ids: string[],
): Promise<Map<string, number>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const list = idList(unique);
  const query =
    kind === "release-group"
      ? sql`
        SELECT DISTINCT rg.id, CASE WHEN rg.category = 'studio' THEN 2 ELSE 1 END AS score
        FROM release_group rg
        JOIN credit c ON c.release_group_id = rg.id AND c.role = 'primary'
        JOIN artist a ON a.id = c.artist_id
        WHERE rg.id IN ${list} AND a.discography_synced_at IS NOT NULL AND rg.discography_unlisted_at IS NULL`
      : sql`
        SELECT DISTINCT c.recording_id AS id, 1 AS score
        FROM credit c
        JOIN artist a ON a.id = c.artist_id
        WHERE c.recording_id IN ${list} AND c.role = 'primary' AND a.discography_synced_at IS NOT NULL`;
  const rows = (await db.execute(query)) as unknown as { id: string; score: number }[];
  const scores = new Map<string, number>();
  for (const row of rows) scores.set(row.id, Math.max(scores.get(row.id) ?? 0, Number(row.score)));
  return scores;
}

/** Artistas (por MBID) ya explorados: la señal para grupos de canciones que solo trajo MusicBrainz. */
export async function exploredArtistMbids(mbids: string[]): Promise<Set<string>> {
  const unique = [...new Set(mbids)];
  if (unique.length === 0) return new Set();
  const rows = (await db.execute(sql`
    SELECT mbid::text AS mbid FROM artist
    WHERE mbid IN ${idList(unique)} AND discography_synced_at IS NOT NULL`)) as unknown as { mbid: string }[];
  return new Set(rows.map((row) => row.mbid));
}

/** Discos con crédito principal de cada artista (sin los fuera de la discografía), para las filas de Artistas. */
export async function primaryDiscCounts(artistIds: string[]): Promise<Map<string, number>> {
  const unique = [...new Set(artistIds)];
  if (unique.length === 0) return new Map();
  const rows = (await db.execute(sql`
    SELECT c.artist_id AS id, count(DISTINCT c.release_group_id)::int AS discs
    FROM credit c
    JOIN release_group rg ON rg.id = c.release_group_id
    WHERE c.artist_id IN ${idList(unique)} AND c.role = 'primary' AND rg.discography_unlisted_at IS NULL
    GROUP BY c.artist_id`)) as unknown as { id: string; discs: number }[];
  return new Map(rows.map((row) => [row.id, Number(row.discs)]));
}

/**
 * Media de estrellas de la comunidad por disco, con el umbral del álbum (openspec: refine-search-results-phase3): con
 * menos de 5 valoraciones la media es `null`, como en la ficha del álbum y la discografía.
 */
export async function albumCommunity(ids: string[]): Promise<Map<string, { average: number | null; count: number }>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const rows = (await db.execute(sql`
    SELECT release_group_id AS id, count(*)::int AS count, avg(stars)::float AS average
    FROM rating WHERE release_group_id IN ${idList(unique)}
    GROUP BY release_group_id`)) as unknown as { id: string; count: number; average: number }[];
  return new Map(
    rows.map((row) => {
      const count = Number(row.count);
      return [row.id, { count, average: count >= COMMUNITY_MIN_COUNT ? Math.round(Number(row.average) * 10) / 10 : null }];
    }),
  );
}

/** Nota propia de quien busca en cada disco de la página; solo con sesión. */
export async function viewerStars(userId: string, ids: string[]): Promise<Map<string, number>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const rows = (await db.execute(sql`
    SELECT release_group_id AS id, stars::float AS stars FROM rating
    WHERE user_id = ${userId} AND release_group_id IN ${idList(unique)}`)) as unknown as { id: string; stars: number }[];
  return new Map(rows.map((row) => [row.id, Number(row.stars)]));
}

/** Suma la nota propia a resultados de Álbumes (página y "Cargar más" usan lo mismo). */
export async function withViewerStars<T extends { id: string }>(
  results: T[],
  userId: string | null,
): Promise<(T & { yourStars: number | null })[]> {
  const stars = userId ? await viewerStars(userId, results.map((result) => result.id)) : new Map<string, number>();
  return results.map((result) => ({ ...result, yourStars: stars.get(result.id) ?? null }));
}
