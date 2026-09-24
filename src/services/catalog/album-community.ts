import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { appUser, collectionEntry, listenEntry, rating, review, wantedEntry } from "@/db/schema";
import { activeUserCondition } from "@/services/auth/account-status";
import { countPublicListsContainingItem } from "@/services/lists/discovery";
import {
  STRONG_REACTIONS,
  pickCommunityFavorites,
  summarizeRatings,
  thresholdCount,
  type AlbumCommunityStats,
} from "./album-community-shared";

export * from "./album-community-shared";

// Agregados de comunidad de un álbum para su cabecera (openspec: redesign-album-page,
// capability `album-community-stats`). Los umbrales se aplican acá, en el read-model, y
// no en el componente: la UI nunca recibe un conteo que no debe mostrar.

export async function getAlbumCommunityStats(releaseGroupId: string): Promise<AlbumCommunityStats> {
  const [aggregateRows, histogramRows, reviewRows, collectorRows, seekerRows, listCount] =
    await Promise.all([
      db
        .select({
          count: sql<number>`count(*)::int`,
          averageStars: sql<number | null>`avg(${rating.stars})::float`,
          averageDetailedScore: sql<number | null>`avg(${rating.detailedScore})::float`,
        })
        .from(rating)
        .where(eq(rating.releaseGroupId, releaseGroupId)),
      db
        .select({ stars: rating.stars, n: sql<number>`count(*)::int` })
        .from(rating)
        .where(eq(rating.releaseGroupId, releaseGroupId))
        .groupBy(rating.stars),
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(review)
        .where(and(eq(review.releaseGroupId, releaseGroupId), eq(review.moderationStatus, "visible"))),
      // Personas distintas, cualquier audiencia; cuentas desactivadas fuera.
      db
        .select({ n: sql<number>`count(distinct ${collectionEntry.userId})::int` })
        .from(collectionEntry)
        .innerJoin(appUser, eq(appUser.id, collectionEntry.userId))
        .where(and(eq(collectionEntry.releaseGroupId, releaseGroupId), activeUserCondition())),
      db
        .select({ n: sql<number>`count(distinct ${wantedEntry.userId})::int` })
        .from(wantedEntry)
        .innerJoin(appUser, eq(appUser.id, wantedEntry.userId))
        .where(and(eq(wantedEntry.releaseGroupId, releaseGroupId), activeUserCondition())),
      countPublicListsContainingItem({ type: "release-group", id: releaseGroupId }),
    ]);

  const aggregate = aggregateRows[0] ?? { count: 0, averageStars: null, averageDetailedScore: null };
  return {
    ratings: summarizeRatings(aggregate, histogramRows),
    reviewCount: reviewRows[0]?.n ?? 0,
    collectors: thresholdCount(collectorRows[0]?.n ?? 0),
    seekers: thresholdCount(seekerRows[0]?.n ?? 0),
    listCount,
  };
}

/**
 * Favoritas de la comunidad entre las grabaciones de un álbum: una sola consulta agrupada
 * por grabación sobre entradas de diario públicas con reacción fuerte.
 */
export async function getCommunityFavoriteRecordings(recordingIds: string[]): Promise<Set<string>> {
  if (recordingIds.length === 0) return new Set();
  const rows = await db
    .select({ recordingId: listenEntry.recordingId, n: sql<number>`count(*)::int` })
    .from(listenEntry)
    .where(
      and(
        inArray(listenEntry.recordingId, recordingIds),
        eq(listenEntry.audience, "public"),
        inArray(listenEntry.reaction, [...STRONG_REACTIONS]),
        isNotNull(listenEntry.recordingId),
      ),
    )
    .groupBy(listenEntry.recordingId);

  return pickCommunityFavorites(
    rows.flatMap((row) => (row.recordingId ? [{ recordingId: row.recordingId, n: row.n }] : [])),
  );
}
