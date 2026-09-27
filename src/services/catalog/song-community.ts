import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { appUser, favorite, rating } from "@/db/schema";
import { activeUserCondition } from "@/services/auth/account-status";
import { countPublicListsContainingItem } from "@/services/lists/discovery";
import type { ListenReaction } from "@/services/diary/types";
import { COMMUNITY_MIN_COUNT, thresholdCount, type ThresholdedCount } from "./album-community-shared";
import { getRecordingReactionSummary } from "./recording-reactions";

// Agregados de comunidad de una canción para su cabecera (openspec: redesign-song-page,
// capability `song-community-stats`). Como en el álbum, los umbrales se aplican acá: la UI
// nunca recibe una cifra que no debe mostrar. Todo se refiere a ESTA grabación, no a las
// demás versiones de su obra.

export interface SongCommunityStats {
  ratings: {
    count: number;
    /** `null` por debajo del umbral. */
    averageStars: number | null;
  };
  reactions: {
    /** Reacciones en entradas públicas del diario. */
    count: number;
    /** Reacción predominante; `null` por debajo del umbral. */
    top: ListenReaction | null;
  };
  favorites: ThresholdedCount;
  listCount: number;
}

/** Aplica los umbrales de la canción. Pura. */
export function summarizeSongCommunity(input: {
  ratingCount: number;
  averageStars: number | null;
  reactionCount: number;
  topReaction: ListenReaction | null;
  favoriteCount: number;
  listCount: number;
}): SongCommunityStats {
  return {
    ratings: {
      count: input.ratingCount,
      averageStars: input.ratingCount >= COMMUNITY_MIN_COUNT ? input.averageStars : null,
    },
    reactions: {
      count: input.reactionCount,
      top: input.reactionCount >= COMMUNITY_MIN_COUNT ? input.topReaction : null,
    },
    favorites: thresholdCount(input.favoriteCount),
    listCount: input.listCount,
  };
}

export async function getSongCommunityStats(recordingId: string): Promise<SongCommunityStats> {
  const [ratingRows, reactionSummary, favoriteRows, listCount] = await Promise.all([
    db
      .select({
        count: sql<number>`count(*)::int`,
        averageStars: sql<number | null>`avg(${rating.stars})::float`,
      })
      .from(rating)
      .where(eq(rating.recordingId, recordingId)),
    getRecordingReactionSummary(recordingId),
    // Personas distintas, cualquier audiencia; cuentas desactivadas fuera.
    db
      .select({ n: sql<number>`count(distinct ${favorite.userId})::int` })
      .from(favorite)
      .innerJoin(appUser, eq(appUser.id, favorite.userId))
      .where(and(eq(favorite.recordingId, recordingId), activeUserCondition())),
    countPublicListsContainingItem({ type: "recording", id: recordingId }),
  ]);

  return summarizeSongCommunity({
    ratingCount: ratingRows[0]?.count ?? 0,
    averageStars: ratingRows[0]?.averageStars ?? null,
    reactionCount: reactionSummary.total,
    topReaction: reactionSummary.top,
    favoriteCount: favoriteRows[0]?.n ?? 0,
    listCount,
  });
}
