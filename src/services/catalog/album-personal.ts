import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { favorite, listenEntry, review, userList, userListItem } from "@/db/schema";

// Estado personal del usuario sobre un álbum para el panel "Tu relación" y las marcas por
// pista (openspec: redesign-album-page, capability `album-personal-panel`). Solo consultas
// que no existían: rating, favorito, Pendiente, colección y búsqueda se leen con los
// servicios de siempre desde la página.

export interface AlbumListenSummary {
  count: number;
  /** ISO de la entrada más reciente; `null` sin escuchas. */
  lastAt: string | null;
}

export interface AlbumPersonalExtras {
  listens: AlbumListenSummary;
  /** Id de la reseña propia sobre el álbum, si existe. */
  ownReviewId: string | null;
  /** Cantidad de listas propias (cualquier audiencia) que contienen el álbum. */
  ownListCount: number;
  /** Grabaciones del álbum con al menos una entrada de diario del usuario. */
  listenedRecordingIds: Set<string>;
  /** Grabaciones del álbum marcadas como favoritas por el usuario (menú por pista). */
  favoriteRecordingIds: Set<string>;
}

export async function getAlbumPersonalExtras(
  userId: string,
  releaseGroupId: string,
  recordingIds: string[],
): Promise<AlbumPersonalExtras> {
  const [listenRows, reviewRows, listRows, listenedRows, favoriteRows] = await Promise.all([
    db
      .select({
        count: sql<number>`count(*)::int`,
        lastAt: sql<Date | null>`max(${listenEntry.createdAt})`,
      })
      .from(listenEntry)
      .where(and(eq(listenEntry.userId, userId), eq(listenEntry.releaseGroupId, releaseGroupId))),
    db
      .select({ id: review.id })
      .from(review)
      .where(and(eq(review.userId, userId), eq(review.releaseGroupId, releaseGroupId)))
      .orderBy(desc(review.createdAt))
      .limit(1),
    db
      .select({ n: sql<number>`count(distinct ${userList.id})::int` })
      .from(userList)
      .innerJoin(userListItem, eq(userListItem.listId, userList.id))
      .where(and(eq(userList.ownerId, userId), eq(userListItem.releaseGroupId, releaseGroupId))),
    recordingIds.length === 0
      ? Promise.resolve([])
      : db
          .selectDistinct({ recordingId: listenEntry.recordingId })
          .from(listenEntry)
          .where(
            and(
              eq(listenEntry.userId, userId),
              inArray(listenEntry.recordingId, recordingIds),
              isNotNull(listenEntry.recordingId),
            ),
          ),
    recordingIds.length === 0
      ? Promise.resolve([])
      : db
          .select({ recordingId: favorite.recordingId })
          .from(favorite)
          .where(and(eq(favorite.userId, userId), inArray(favorite.recordingId, recordingIds))),
  ]);

  const listen = listenRows[0];
  return {
    listens: {
      count: listen?.count ?? 0,
      lastAt: listen?.lastAt ? new Date(listen.lastAt).toISOString() : null,
    },
    ownReviewId: reviewRows[0]?.id ?? null,
    ownListCount: listRows[0]?.n ?? 0,
    listenedRecordingIds: new Set(
      listenedRows.flatMap((row) => (row.recordingId ? [row.recordingId] : [])),
    ),
    favoriteRecordingIds: new Set(
      favoriteRows.flatMap((row) => (row.recordingId ? [row.recordingId] : [])),
    ),
  };
}
