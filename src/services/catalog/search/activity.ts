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
