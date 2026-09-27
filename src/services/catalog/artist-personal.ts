import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { collectionEntry, listenEntry, releaseGroup, userList, userListItem, wantedEntry } from "@/db/schema";
import { isFavorited } from "@/services/favorites/favorites";
import { isFollowingArtist } from "@/services/social/artist-following";
import { isWantToListen } from "@/services/want-to-listen/want-to-listen";
import { getArtistJourneyDetail } from "@/services/artist-journeys/artist-journeys";
import type { AlbumListMembership } from "./album-personal";

// Estado personal del usuario sobre un artista para el panel "Tu relación" (openspec:
// redesign-artist-page, capability `artist-personal-panel`, design D7). Escuchas y colección
// se calculan desde los discos de la discografía propia, sin ningún total de la discografía
// (la regla de recorridos prohíbe "N de M" fuera de su página de gestión).

export interface ArtistListenSummary {
  /** Discos distintos de la discografía propia con al menos una escucha. */
  albumCount: number;
  /** La escucha más reciente, de un disco (con su título) o del artista mismo (`title: null`). */
  last: { title: string | null; at: string } | null;
}

export interface ArtistPersonalState {
  following: boolean;
  favorited: boolean;
  pending: boolean;
  listens: ArtistListenSummary;
  collection: { have: number; seeking: number };
  /** Listas propias (estándar) que contienen al artista, con su ítem para quitarlo. */
  ownListMemberships: AlbumListMembership[];
  /** Recorrido propio: estado y proporción escuchada (para una barra, nunca como cifra). */
  journey: { state: "in_progress" | "complete" | "archived"; progress: number } | null;
}

export async function getArtistPersonalState(
  userId: string,
  artistId: string,
  ownReleaseGroupIds: string[],
): Promise<ArtistPersonalState> {
  const hasAlbums = ownReleaseGroupIds.length > 0;
  const listenScope = and(
    eq(listenEntry.userId, userId),
    hasAlbums
      ? or(eq(listenEntry.artistId, artistId), inArray(listenEntry.releaseGroupId, ownReleaseGroupIds))
      : eq(listenEntry.artistId, artistId),
  );

  const [following, favorited, pending, albumRows, lastRows, haveRows, seekingRows, listRows, journey] = await Promise.all([
    isFollowingArtist(userId, artistId),
    isFavorited({ type: "artist", id: artistId }, userId),
    isWantToListen({ type: "artist", id: artistId }, userId),
    hasAlbums
      ? db
          .select({ n: sql<number>`count(distinct ${listenEntry.releaseGroupId})::int` })
          .from(listenEntry)
          .where(and(eq(listenEntry.userId, userId), inArray(listenEntry.releaseGroupId, ownReleaseGroupIds)))
      : Promise.resolve([{ n: 0 }]),
    db
      .select({ at: listenEntry.createdAt, title: releaseGroup.title })
      .from(listenEntry)
      .leftJoin(releaseGroup, eq(releaseGroup.id, listenEntry.releaseGroupId))
      .where(listenScope)
      .orderBy(desc(listenEntry.createdAt))
      .limit(1),
    hasAlbums
      ? db
          .select({ n: sql<number>`count(distinct ${collectionEntry.releaseGroupId})::int` })
          .from(collectionEntry)
          .where(and(eq(collectionEntry.userId, userId), inArray(collectionEntry.releaseGroupId, ownReleaseGroupIds)))
      : Promise.resolve([{ n: 0 }]),
    hasAlbums
      ? db
          .select({ n: sql<number>`count(distinct ${wantedEntry.releaseGroupId})::int` })
          .from(wantedEntry)
          .where(and(eq(wantedEntry.userId, userId), inArray(wantedEntry.releaseGroupId, ownReleaseGroupIds)))
      : Promise.resolve([{ n: 0 }]),
    db
      .select({ listId: userList.id, itemId: userListItem.id, title: userList.title })
      .from(userList)
      .innerJoin(userListItem, eq(userListItem.listId, userList.id))
      .where(and(eq(userList.ownerId, userId), eq(userListItem.artistId, artistId), eq(userList.kind, "standard")))
      .orderBy(desc(userList.createdAt), desc(userList.id)),
    getArtistJourneyDetail(userId, artistId),
  ]);

  const last = lastRows[0];
  const { selectedCount, listenedCount } = journey?.progress ?? { selectedCount: 0, listenedCount: 0 };
  return {
    following,
    favorited,
    pending,
    listens: {
      albumCount: albumRows[0]?.n ?? 0,
      last: last ? { title: last.title ?? null, at: new Date(last.at).toISOString() } : null,
    },
    collection: { have: haveRows[0]?.n ?? 0, seeking: seekingRows[0]?.n ?? 0 },
    ownListMemberships: listRows.map((row) => ({ ...row, kind: "standard" as const })),
    journey: journey ? { state: journey.state, progress: selectedCount > 0 ? listenedCount / selectedCount : 0 } : null,
  };
}
