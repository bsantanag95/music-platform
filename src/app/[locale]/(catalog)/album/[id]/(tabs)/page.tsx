import { notFound } from "next/navigation";
import { TrackList } from "@/components/catalog/TrackList";
import { isValidUuid } from "@/lib/validation";
import { loadAlbumDetail, loadCommunityFavorites, loadPersonalState, loadSession } from "../album-data";

// Pestaña Canciones, la pestaña por defecto de la página de álbum (openspec:
// redesign-album-page). El detalle y la sesión vienen de las mismas cargas cacheadas que
// usa el layout: no se vuelve a ingerir ni a consultar.

interface AlbumSongsPageProps {
  params: Promise<{ id: string }>;
}

export default async function AlbumSongsPage({ params }: AlbumSongsPageProps) {
  const { id } = await params;
  if (!isValidUuid(id)) notFound();
  const result = await loadAlbumDetail(id);
  if (result.kind !== "ok") return null;

  const { detail } = result;
  const session = await loadSession();
  const userId = session?.user.id ?? null;
  const [communityFavorites, personal] = await Promise.all([
    loadCommunityFavorites(detail.releaseGroup.id),
    userId ? loadPersonalState(userId, detail.releaseGroup.id) : Promise.resolve(null),
  ]);

  return (
    <TrackList
      releaseGroupId={detail.releaseGroup.id}
      tracks={detail.tracks}
      albumArtistIds={detail.primaryArtists.map((artist) => artist.id)}
      editionLabel={detail.release.editionLabel}
      editionsAvailable={false}
      authenticated={Boolean(userId)}
      communityFavoriteIds={[...communityFavorites]}
      listenedIds={personal ? [...personal.listenedRecordingIds] : []}
      favoriteIds={personal ? [...personal.favoriteRecordingIds] : []}
    />
  );
}
