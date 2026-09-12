import { cache } from "react";
import { and, eq, gte, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import { appUser, collectionEntry, releaseGroup, userBlock, userFollow } from "@/db/schema";

// Franja de eventos ambiente (openspec: add-feed-ambient-events; los eventos
// "seguir usuario" y "seguir artista" se retiraron de acá en
// add-feed-kind-differentiation y add-artist-follow-feed-entry
// respectivamente, ahora viven inline en la línea de tiempo principal de
// `activity-feed`): el tratamiento "minimizado" de tier 4 —sumar a la
// colección— como un resumen agrupado por autor al pie de `/me/feed`,
// separado del listado cronológico. Cálculo bajo demanda, sin tabla
// materializada, memoizado por request (mismo patrón que
// `network-convergence` / `taste-fingerprint`).

/** Ventana hacia atrás: los eventos de seguimiento/colección son escasos. */
export const AMBIENT_WINDOW_DAYS = 14;
/** Máximo de ítems mostrados por grupo (el resto va como "y N más"). */
export const AMBIENT_SAMPLE = 3;
/** Máximo de grupos en la franja. */
export const AMBIENT_MAX_GROUPS = 8;

const DAY_MS = 86_400_000;

export interface AmbientItem {
  label: string;
  href: string | null;
}

export interface AmbientGroup {
  kind: "collection";
  author: { username: string; displayName: string | null };
  /** Total de ítems de ese autor y tipo (puede superar la muestra). */
  count: number;
  /** Muestra de ítems, ordenada por fecha descendente. */
  sample: AmbientItem[];
  lastAt: string;
}

interface RawRow {
  authorUsername: string;
  authorDisplayName: string | null;
  authorId: string;
  item: AmbientItem;
  at: Date;
}

function group(rows: RawRow[], kind: AmbientGroup["kind"]): AmbientGroup[] {
  const byAuthor = new Map<string, RawRow[]>();
  for (const row of rows) {
    const list = byAuthor.get(row.authorId) ?? [];
    list.push(row);
    byAuthor.set(row.authorId, list);
  }
  return [...byAuthor.values()].map((list) => {
    const sorted = list.sort((a, b) => b.at.getTime() - a.at.getTime());
    return {
      kind,
      author: { username: sorted[0]!.authorUsername, displayName: sorted[0]!.authorDisplayName },
      count: sorted.length,
      sample: sorted.slice(0, AMBIENT_SAMPLE).map((row) => row.item),
      lastAt: sorted[0]!.at.toISOString(),
    };
  });
}

/**
 * Resumen de eventos ambiente recientes de la red del lector (seguidos con
 * relación aceptada, sin bloqueo). Una única fuente agrupada por autor: alta
 * en la colección física (audiencia `followers`/`public`). La actividad del
 * propio lector no aparece. Devuelve `{ groups: [] }` cuando no hay eventos.
 */
export const getFeedAmbientEvents = cache(
  async (viewerId: string): Promise<{ groups: AmbientGroup[] }> => {
    const followRows = await db
      .select({ id: userFollow.followedId })
      .from(userFollow)
      .where(and(eq(userFollow.followerId, viewerId), eq(userFollow.status, "accepted")));

    if (followRows.length === 0) return { groups: [] };

    const blockRows = await db
      .select({ blockerId: userBlock.blockerId, blockedId: userBlock.blockedId })
      .from(userBlock)
      .where(or(eq(userBlock.blockerId, viewerId), eq(userBlock.blockedId, viewerId)));

    const blocked = new Set<string>();
    for (const row of blockRows) {
      blocked.add(row.blockerId === viewerId ? row.blockedId : row.blockerId);
    }

    const followeeSet = new Set(followRows.map((row) => row.id).filter((id) => !blocked.has(id)));
    const followeeIds = [...followeeSet];
    if (followeeIds.length === 0) return { groups: [] };

    const cutoff = new Date(Date.now() - AMBIENT_WINDOW_DAYS * DAY_MS);

    const collectionRows = await db
      .select({
        authorId: collectionEntry.userId,
        authorUsername: appUser.username,
        authorDisplayName: appUser.displayName,
        releaseGroupId: releaseGroup.id,
        releaseTitle: releaseGroup.title,
        at: collectionEntry.createdAt,
      })
      .from(collectionEntry)
      .innerJoin(appUser, eq(appUser.id, collectionEntry.userId))
      .innerJoin(releaseGroup, eq(releaseGroup.id, collectionEntry.releaseGroupId))
      .where(
        and(
          inArray(collectionEntry.userId, followeeIds),
          inArray(collectionEntry.audience, ["followers", "public"]),
          gte(collectionEntry.createdAt, cutoff),
        ),
      );

    const collectionGroups = group(
      collectionRows.map((row) => ({
        authorId: row.authorId,
        authorUsername: row.authorUsername,
        authorDisplayName: row.authorDisplayName,
        item: { label: row.releaseTitle, href: `/album/${row.releaseGroupId}` },
        at: row.at,
      })),
      "collection",
    );

    const groups = collectionGroups
      .sort((a, b) => b.lastAt.localeCompare(a.lastAt))
      .slice(0, AMBIENT_MAX_GROUPS);

    return { groups };
  },
);
