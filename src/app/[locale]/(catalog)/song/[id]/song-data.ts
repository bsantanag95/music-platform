import { cache } from "react";
import { ensureAnchorTracks } from "@/services/catalog/award-anchor-tracks";
import { getRecordingDetail, getTrackStrip, loadRepresentativeRelease } from "@/services/catalog/recording-detail";
import { getRecordingCredits } from "@/services/catalog/personnel-levels";
import { getRecordingVersions, resolveVersionLine } from "@/services/catalog/recording-versions";
import { getSongCommunityStats } from "@/services/catalog/song-community";
import { getSongPersonalExtras } from "@/services/catalog/song-personal";
import { resolvePrimaryArtists, slugArtistName } from "@/services/catalog/primary-artists";
import { songSegment } from "@/lib/catalog-links";
import { resolveSession } from "@/services/auth/sessions";
import { getUserPermissions } from "@/services/auth/authorization";
import { isFavorited } from "@/services/favorites/favorites";

// Cargas de la página de canción (openspec: redesign-song-page, design D10). `cache()`
// deduplica por request entre `generateMetadata` y la página.

// Una grabación llegada por los premios no tiene pistas: se ingiere antes el disco ancla de su nominación para que
// la ficha tenga disco, carátula y apariciones (`ensureAnchorTracks`; no hace nada si ya las tiene).
export const loadRecordingDetail = cache(async (id: string) => {
  await ensureAnchorTracks(id);
  return getRecordingDetail(id);
});

/**
 * Segmento canónico de la canción para la canonicalización (openspec: add-catalog-slugs):
 * el artista principal por el resolvedor por lotes, que marca `various` como sin artista.
 */
export const loadSongSegment = cache(async (recordingId: string, title: string) => {
  const { recordings } = await resolvePrimaryArtists({ recordingIds: [recordingId] });
  return songSegment(slugArtistName(recordings.get(recordingId)), title, recordingId);
});

export const loadSession = cache(() => resolveSession());

export const loadCanModerate = cache(async (userId: string) =>
  (await getUserPermissions(userId)).includes("moderation.suspend_social"),
);

/** Edición representativa ingerida del disco principal, o `null`. */
export const loadPrincipalRelease = cache((releaseGroupId: string) => loadRepresentativeRelease(releaseGroupId));

export const loadTrackStrip = cache((recordingId: string, representativeReleaseId: string) =>
  getTrackStrip(recordingId, representativeReleaseId),
);

export const loadRecordingCredits = cache(
  (recordingId: string, primaryArtistIds: string[], representativeReleaseId: string | null) =>
    getRecordingCredits(recordingId, primaryArtistIds, representativeReleaseId),
);

export const loadVersions = cache((recordingId: string) => getRecordingVersions(recordingId));

export const loadVersionLine = cache((recordingId: string, attributes: string[]) =>
  resolveVersionLine(recordingId, attributes),
);

export const loadSongCommunity = cache((recordingId: string) => getSongCommunityStats(recordingId));

/** Estado personal para el panel (sin la valoración, que llega con `getRatings`). */
export const loadSongPersonalState = cache(async (userId: string, recordingId: string) => {
  const [favorited, extras] = await Promise.all([
    isFavorited({ type: "recording", id: recordingId }, userId),
    getSongPersonalExtras(userId, recordingId),
  ]);
  return { favorited, ...extras };
});
