import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { listenEntry, userList, userListItem } from "@/db/schema";
import type { ListenReaction } from "@/services/diary/types";
import type { AlbumListMembership } from "./album-personal";

// Estado personal del usuario sobre una canción para su panel "Tu relación" (openspec:
// redesign-song-page, capability `song-personal-panel`). Valoración y favorito se leen con
// los servicios de siempre desde la página; acá van las escuchas y las listas propias.

export interface SongListenSummary {
  count: number;
  /** ISO de la escucha más reciente; `null` sin escuchas. */
  lastAt: string | null;
  /** Reacción de la escucha más reciente, si la tiene. */
  lastReaction: ListenReaction | null;
}

export interface SongPersonalExtras {
  listens: SongListenSummary;
  /** Listas propias de canciones (cualquier audiencia) que la contienen, con su ítem. */
  ownListMemberships: AlbumListMembership[];
}

export async function getSongPersonalExtras(userId: string, recordingId: string): Promise<SongPersonalExtras> {
  const [countRows, lastRows, listRows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(listenEntry)
      .where(and(eq(listenEntry.userId, userId), eq(listenEntry.recordingId, recordingId))),
    db
      .select({ createdAt: listenEntry.createdAt, reaction: listenEntry.reaction })
      .from(listenEntry)
      .where(and(eq(listenEntry.userId, userId), eq(listenEntry.recordingId, recordingId)))
      .orderBy(desc(listenEntry.createdAt))
      .limit(1),
    db
      .select({ listId: userList.id, itemId: userListItem.id, title: userList.title })
      .from(userList)
      .innerJoin(userListItem, eq(userListItem.listId, userList.id))
      .where(
        and(eq(userList.ownerId, userId), eq(userListItem.recordingId, recordingId), eq(userList.kind, "standard")),
      )
      .orderBy(desc(userList.createdAt), desc(userList.id)),
  ]);

  const last = lastRows[0];
  return {
    listens: {
      count: countRows[0]?.count ?? 0,
      lastAt: last ? new Date(last.createdAt).toISOString() : null,
      lastReaction: (last?.reaction as ListenReaction | null | undefined) ?? null,
    },
    ownListMemberships: listRows.map((row) => ({ ...row, kind: "standard" as const })),
  };
}
