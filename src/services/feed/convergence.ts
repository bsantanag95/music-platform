import { cache } from "react";
import { and, eq, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { userBlock, userFollow } from "@/db/schema";

// Convergencia de la red (openspec: add-network-convergence): obras con las que
// varias personas distintas de la red del lector se relacionaron en una ventana
// corta. Es la capa "relevante" del feed —"¿en qué coincide mi red?"— distinta
// del listado cronológico y del pico de rotación (que es el propio
// comportamiento del lector). Cálculo bajo demanda, sin tabla materializada,
// memoizado por request (mismo patrón que `taste-fingerprint` /
// `profile-in-rotation`).

/** Ventana hacia atrás desde el momento de lectura. */
export const CONVERGENCE_WINDOW_DAYS = 7;
/** Personas distintas de la red que deben converger sobre la obra. */
export const CONVERGENCE_MIN_PEOPLE = 3;
/** Máximo de obras mostradas en el panel. */
export const CONVERGENCE_MAX_ITEMS = 5;
/** Máximo de nombres mostrados por obra (el resto va como "y N más"). */
export const CONVERGENCE_NAME_SAMPLE = 3;

const DAY_MS = 86_400_000;

export interface ConvergencePerson {
  username: string;
  displayName: string | null;
}

export interface ConvergenceItem {
  target: {
    type: "release-group" | "recording";
    id: string;
    title: string;
    artistName: string | null;
    coverThumbUrl: string | null;
  };
  /** Recuento real de personas distintas de la red (puede superar la muestra). */
  peopleCount: number;
  /** Muestra de nombres, ordenada por interacción más reciente. */
  peopleSample: ConvergencePerson[];
  lastInteractionAt: string;
}

interface ConvergenceRow {
  release_group_id: string | null;
  recording_id: string | null;
  people: number;
  last_at: Date | string;
  title: string | null;
  cover_thumb_url: string | null;
  artist_name: string | null;
  people_sample: ConvergencePerson[] | null;
}

/**
 * Obras con las que ≥ `CONVERGENCE_MIN_PEOPLE` personas distintas de la red del
 * lector (seguidos con relación aceptada, sin bloqueo en ninguna dirección) se
 * relacionaron en los últimos `CONVERGENCE_WINDOW_DAYS` días. Interacción =
 * entrada de diario, valoración, reseña o favorito, contadas por igual. Solo
 * cuenta lo que el lector tiene permitido ver (audiencia de escucha/favorito;
 * rating y reseña son públicos implícitos). La actividad del propio lector no
 * cuenta. Devuelve `{ items: [] }` cuando no hay convergencia.
 */
export const getNetworkConvergence = cache(
  async (viewerId: string): Promise<{ items: ConvergenceItem[] }> => {
    const followRows = await db
      .select({ id: userFollow.followedId })
      .from(userFollow)
      .where(and(eq(userFollow.followerId, viewerId), eq(userFollow.status, "accepted")));

    if (followRows.length === 0) return { items: [] };

    const blockRows = await db
      .select({ blockerId: userBlock.blockerId, blockedId: userBlock.blockedId })
      .from(userBlock)
      .where(or(eq(userBlock.blockerId, viewerId), eq(userBlock.blockedId, viewerId)));

    const blocked = new Set<string>();
    for (const row of blockRows) {
      blocked.add(row.blockerId === viewerId ? row.blockedId : row.blockerId);
    }

    const followeeIds = followRows.map((row) => row.id).filter((id) => !blocked.has(id));
    if (followeeIds.length === 0) return { items: [] };

    // ISO string, no `Date`: el driver `postgres` serializa mal un `Date`
    // pasado como parámetro de una sentencia `execute` cruda ("Received an
    // instance of Date"). El cast explícito deja que Postgres lo parsee.
    const cutoff = new Date(Date.now() - CONVERGENCE_WINDOW_DAYS * DAY_MS).toISOString();
    const followeeValues = sql.join(
      followeeIds.map((id) => sql`(${id}::uuid)`),
      sql`, `,
    );

    // Una sola sentencia: UNION ALL de las cuatro fuentes → agrupación por
    // objetivo con HAVING sobre personas distintas → catálogo + muestra de
    // nombres. La CTE `followees` parametriza los ids una vez. `at` es
    // `created_at` para diario/favorito y `updated_at` para rating/reseña (el
    // valor vigente, igual que el feed).
    const rows = (await db.execute(sql`
      WITH followees(id) AS (VALUES ${followeeValues}),
      interactions AS (
        SELECT user_id, release_group_id, recording_id, created_at AS at
        FROM listen_entry
        WHERE user_id IN (SELECT id FROM followees)
          AND audience IN ('followers', 'public')
          AND created_at >= ${cutoff}::timestamptz
          AND (release_group_id IS NOT NULL OR recording_id IS NOT NULL)
        UNION ALL
        SELECT user_id, release_group_id, recording_id, created_at AS at
        FROM favorite
        WHERE user_id IN (SELECT id FROM followees)
          AND audience IN ('followers', 'public')
          AND created_at >= ${cutoff}::timestamptz
          AND (release_group_id IS NOT NULL OR recording_id IS NOT NULL)
        UNION ALL
        SELECT user_id, release_group_id, recording_id, updated_at AS at
        FROM rating
        WHERE user_id IN (SELECT id FROM followees)
          AND updated_at >= ${cutoff}::timestamptz
          AND (release_group_id IS NOT NULL OR recording_id IS NOT NULL)
        UNION ALL
        SELECT user_id, release_group_id, recording_id, updated_at AS at
        FROM review
        WHERE user_id IN (SELECT id FROM followees)
          AND updated_at >= ${cutoff}::timestamptz
          AND (release_group_id IS NOT NULL OR recording_id IS NOT NULL)
      ),
      converged AS (
        SELECT release_group_id, recording_id,
               COUNT(DISTINCT user_id) AS people,
               MAX(at) AS last_at
        FROM interactions
        GROUP BY release_group_id, recording_id
        HAVING COUNT(DISTINCT user_id) >= ${CONVERGENCE_MIN_PEOPLE}
        ORDER BY people DESC, last_at DESC
        LIMIT ${CONVERGENCE_MAX_ITEMS}
      )
      SELECT
        c.release_group_id,
        c.recording_id,
        c.people::int AS people,
        c.last_at,
        COALESCE(rg.title, rec.title) AS title,
        rg.cover_thumb_url AS cover_thumb_url,
        (
          SELECT a.name FROM credit cr
          JOIN artist a ON a.id = cr.artist_id
          WHERE cr.role = 'primary'
            AND (
              (c.release_group_id IS NOT NULL AND cr.release_group_id = c.release_group_id)
              OR (c.recording_id IS NOT NULL AND cr.recording_id = c.recording_id)
            )
          ORDER BY cr.position
          LIMIT 1
        ) AS artist_name,
        (
          SELECT json_agg(
            json_build_object('username', p.username, 'displayName', p.display_name)
            ORDER BY p.at DESC
          )
          FROM (
            SELECT DISTINCT ON (i.user_id) i.user_id, u.username, u.display_name, i.at
            FROM interactions i
            JOIN app_user u ON u.id = i.user_id
            WHERE i.release_group_id IS NOT DISTINCT FROM c.release_group_id
              AND i.recording_id IS NOT DISTINCT FROM c.recording_id
            ORDER BY i.user_id, i.at DESC
          ) p
        ) AS people_sample
      FROM converged c
      LEFT JOIN release_group rg ON rg.id = c.release_group_id
      LEFT JOIN recording rec ON rec.id = c.recording_id
      ORDER BY c.people DESC, c.last_at DESC
    `)) as unknown as ConvergenceRow[];

    const items: ConvergenceItem[] = [];
    for (const row of rows) {
      const type: "release-group" | "recording" = row.release_group_id
        ? "release-group"
        : "recording";
      const id = row.release_group_id ?? row.recording_id;
      if (!id || !row.title) continue;
      items.push({
        target: {
          type,
          id,
          title: row.title,
          artistName: row.artist_name,
          coverThumbUrl: row.cover_thumb_url,
        },
        peopleCount: row.people,
        peopleSample: (row.people_sample ?? []).slice(0, CONVERGENCE_NAME_SAMPLE),
        lastInteractionAt: new Date(row.last_at).toISOString(),
      });
    }

    return { items };
  },
);
