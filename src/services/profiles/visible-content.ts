import { listUserDiary } from "@/services/diary/diary";
import { getFavoritesPreview } from "@/services/favorites/favorites";
import { listUserLists } from "@/services/lists/lists";
import { listVisibleCaminos } from "@/services/camino/camino";
import { getCollectionPreview } from "@/services/collection/collection";
import { getConcertPreview } from "@/services/concerts/concerts";
import { getTasteFingerprint } from "@/services/profiles/stats";
import { getShowcase } from "@/services/profiles/showcase";
import { getProfileInRotation } from "@/services/profiles/in-rotation";
import { getProfileReviews } from "@/services/profiles/reviews";
import { listProfileFollowedArtists } from "@/services/profiles/exploration";
import { getProfileRatingHighlights } from "@/services/rating-highlights/rating-highlights";
import { hasMusicIdentity } from "@/lib/music-identity";
import type { ProfileView } from "@/services/profiles/profile-view";

// ¿Tiene el perfil algo visible para este visitante en el cuerpo o en la franja de identidad?
// (openspec: redesign-private-profile-phase2). Lo usa el estado vacío «Nada público por ahora»
// de quien no sigue un perfil público. Usa las mismas funciones que las secciones, así que
// respeta sus audiencias, y devuelve solo un booleano: nunca recuentos ni qué hay oculto
// (spec diary-visibility). Una sección nueva del perfil debe sumarse acá, o el estado vacío
// aparecería con contenido debajo (ver docs/05-features/user-profile.md).
export async function profileHasVisibleContent(
  profile: Pick<ProfileView, "id" | "username" | "selfRoles" | "genres" | "listeningFormats" | "prompts">,
  viewerId: string | null,
): Promise<boolean> {
  if (hasMusicIdentity(profile)) return true;
  const { username } = profile;
  const [
    diary,
    reviews,
    highlights,
    favorites,
    lists,
    caminos,
    collection,
    concerts,
    inRotation,
    showcase,
    fingerprint,
    artists,
  ] = await Promise.all([
    listUserDiary(username, viewerId, 1, 1),
    getProfileReviews(username, viewerId),
    getProfileRatingHighlights(username, viewerId),
    getFavoritesPreview(username, viewerId),
    listUserLists(username, viewerId, 1, 1),
    listVisibleCaminos(username, viewerId, 1, 1),
    getCollectionPreview(username, viewerId),
    getConcertPreview(username, viewerId),
    getProfileInRotation(username, viewerId),
    getShowcase(profile.id),
    getTasteFingerprint(username, viewerId),
    listProfileFollowedArtists(username, viewerId),
  ]);
  const favoritesTotal =
    favorites.counts.artist + favorites.counts["release-group"] + favorites.counts.recording;
  return (
    diary.entries.length > 0 ||
    Boolean(reviews && reviews.reviews.length > 0) ||
    highlights.length > 0 ||
    favoritesTotal > 0 ||
    lists.lists.length > 0 ||
    caminos.caminos.length > 0 ||
    collection.totalEntries > 0 ||
    concerts.total > 0 ||
    inRotation !== null ||
    showcase.pinned.length > 0 ||
    Boolean(fingerprint && (fingerprint.decades.length > 0 || fingerprint.summary.length > 0)) ||
    artists.artists.length > 0
  );
}
