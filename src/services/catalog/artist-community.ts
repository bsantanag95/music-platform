import { and, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { appUser, artistFollow, favorite, listenEntry } from "@/db/schema";
import { activeUserCondition } from "@/services/auth/account-status";
import { countPublicListsContainingItem } from "@/services/lists/discovery";
import { thresholdCount, type ThresholdedCount } from "./album-community-shared";

// Bloque de comunidad de la página de artista (openspec: redesign-artist-page, capability
// `artist-community-stats`, design D6). Personas distintas de cuentas activas, de cualquier
// audiencia y sin exponer identidades; el umbral de 5 se aplica acá, así la interfaz nunca
// recibe un conteo que no debe mostrar. Sin promedio de estrellas del artista, sin Pendiente
// y sin ningún agregado de recorridos.

export interface ArtistCommunityStats {
  /** Personas con al menos una escucha del artista o de un disco de su discografía propia. */
  listeners: ThresholdedCount;
  followers: ThresholdedCount;
  favorites: ThresholdedCount;
  listCount: number;
}

export async function getArtistCommunityStats(
  artistId: string,
  /** Discos de la discografía propia (crédito principal): las apariciones no suman oyentes. */
  ownReleaseGroupIds: string[],
): Promise<ArtistCommunityStats> {
  const listenTargets =
    ownReleaseGroupIds.length > 0
      ? or(eq(listenEntry.artistId, artistId), inArray(listenEntry.releaseGroupId, ownReleaseGroupIds))
      : eq(listenEntry.artistId, artistId);

  const [listenerRows, followerRows, favoriteRows, listCount] = await Promise.all([
    db
      .select({ n: sql<number>`count(distinct ${listenEntry.userId})::int` })
      .from(listenEntry)
      .innerJoin(appUser, eq(appUser.id, listenEntry.userId))
      .where(and(listenTargets, activeUserCondition())),
    db
      .select({ n: sql<number>`count(distinct ${artistFollow.userId})::int` })
      .from(artistFollow)
      .innerJoin(appUser, eq(appUser.id, artistFollow.userId))
      .where(and(eq(artistFollow.artistId, artistId), activeUserCondition())),
    db
      .select({ n: sql<number>`count(distinct ${favorite.userId})::int` })
      .from(favorite)
      .innerJoin(appUser, eq(appUser.id, favorite.userId))
      .where(and(eq(favorite.artistId, artistId), activeUserCondition())),
    countPublicListsContainingItem({ type: "artist", id: artistId }),
  ]);

  return {
    listeners: thresholdCount(listenerRows[0]?.n ?? 0),
    followers: thresholdCount(followerRows[0]?.n ?? 0),
    favorites: thresholdCount(favoriteRows[0]?.n ?? 0),
    listCount,
  };
}
