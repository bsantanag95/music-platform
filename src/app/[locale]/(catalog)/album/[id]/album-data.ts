import { cache } from "react";
import { getAlbumDetail } from "@/services/catalog/album-detail";
import { getAlbumCommunityStats, getCommunityFavoriteRecordings } from "@/services/catalog/album-community";
import { getAlbumPersonalExtras } from "@/services/catalog/album-personal";
import { getDiscographyStrip } from "@/services/catalog/album-neighbors";
import { resolveSession } from "@/services/auth/sessions";
import { getUserPermissions } from "@/services/auth/authorization";
import { getOwnRatingRow, resolveSocialTarget } from "@/services/social";
import { isFavorited } from "@/services/favorites/favorites";
import { isWantToListen } from "@/services/want-to-listen/want-to-listen";
import { listOwnEntriesForReleaseGroup } from "@/services/collection/collection";
import { listOwnWantedForReleaseGroup } from "@/services/collection/wanted";

// Cargas de la página de álbum compartidas entre el layout de pestañas y cada pestaña
// (openspec: redesign-album-page). `cache()` deduplica por request: la cabecera y la
// pestaña Canciones piden el mismo detalle sin ingerirlo ni consultarlo dos veces.

export const loadAlbumDetail = cache((id: string) => getAlbumDetail(id));

export const loadSession = cache(() => resolveSession());

export const loadCanModerate = cache(async (userId: string) =>
  (await getUserPermissions(userId)).includes("moderation.suspend_social"),
);

export const loadCommunityStats = cache((releaseGroupId: string) => getAlbumCommunityStats(releaseGroupId));

async function recordingIdsOf(releaseGroupId: string): Promise<string[]> {
  const result = await loadAlbumDetail(releaseGroupId);
  return result.kind === "ok" ? result.detail.tracks.map((t) => t.recordingId) : [];
}

export const loadCommunityFavorites = cache(async (releaseGroupId: string) =>
  getCommunityFavoriteRecordings(await recordingIdsOf(releaseGroupId)),
);

export const loadDiscographyStrip = cache(
  (primaryArtistId: string, releaseGroupId: string, category: string) =>
    getDiscographyStrip(primaryArtistId, { id: releaseGroupId, category }),
);

/** Todo el estado personal del usuario sobre el álbum (panel "Tu relación" y marcas por pista). */
export const loadPersonalState = cache(async (userId: string, releaseGroupId: string) => {
  const target = { type: "release-group" as const, id: releaseGroupId };
  const socialTarget = await resolveSocialTarget("release-group", releaseGroupId);
  const [ownRating, favorited, pending, collectionEntries, wantedEntries, extras] = await Promise.all([
    getOwnRatingRow(socialTarget, userId),
    isFavorited(target, userId),
    isWantToListen(target, userId),
    listOwnEntriesForReleaseGroup(userId, releaseGroupId),
    listOwnWantedForReleaseGroup(userId, releaseGroupId),
    getAlbumPersonalExtras(userId, releaseGroupId, await recordingIdsOf(releaseGroupId)),
  ]);
  return {
    ownRating: ownRating
      ? { stars: Number(ownRating.stars), detailedScore: ownRating.detailedScore }
      : null,
    favorited,
    pending,
    collectionEntries,
    wantedEntries,
    ...extras,
  };
});

export type AlbumPersonalState = Awaited<ReturnType<typeof loadPersonalState>>;
