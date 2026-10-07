import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { isUpcomingRelease } from "@/components/album/album-format";
import { EmptyState } from "@/components/ui/EmptyState";
import { TrackList } from "@/components/catalog/TrackList";
import { EditionExtraTracks } from "@/components/album/EditionExtraTracks";
import { resolveCatalogRoute } from "@/lib/catalog-route";
import { parseCatalogSegment } from "@/lib/slug";
import {
  loadAlbumDetail,
  loadAlbumEditions,
  loadAlbumSegment,
  loadCommunityFavorites,
  loadPersonalState,
  loadSession,
} from "../album-data";

// Pestaña Canciones, la pestaña por defecto de la página de álbum (openspec:
// redesign-album-page). El detalle y la sesión vienen de las mismas cargas cacheadas que
// usa el layout: no se vuelve a ingerir ni a consultar.

interface AlbumSongsPageProps {
  params: Promise<{ id: string }>;
}

export default async function AlbumSongsPage({ params }: AlbumSongsPageProps) {
  const { id: segment } = await params;
  const parsed = parseCatalogSegment(segment);
  if (!parsed) notFound();
  const result = await loadAlbumDetail(parsed.id);
  if (result.kind !== "ok") return null;

  const { detail } = result;
  resolveCatalogRoute({
    locale: await getLocale(),
    kind: "album",
    segment,
    canonical: await loadAlbumSegment(detail.releaseGroup.id, detail.releaseGroup.title),
  });
  const session = await loadSession();
  const userId = session?.user.id ?? null;
  const [communityFavorites, personal, editions] = await Promise.all([
    loadCommunityFavorites(detail.releaseGroup.id),
    userId ? loadPersonalState(userId, detail.releaseGroup.id) : Promise.resolve(null),
    loadAlbumEditions(detail.releaseGroup.id),
  ]);
  const totalTracks = new Map(editions.editions.map((e) => [e.id, e.trackCount]));

  // Disco anunciado cuya edición todavía no tiene pistas en MusicBrainz.
  if (detail.tracks.length === 0 && isUpcomingRelease(detail.releaseGroup.firstReleaseDate)) {
    const t = await getTranslations("catalog.album");
    return <EmptyState title={t("upcomingTracksTitle")} description={t("upcomingTracksDescription")} />;
  }

  return (
    <div className="flex flex-col gap-8">
      <TrackList
        releaseGroupId={detail.releaseGroup.id}
        tracks={detail.tracks}
        albumArtistIds={detail.primaryArtists.map((artist) => artist.id)}
        editionLabel={detail.release.editionLabel}
        editionsAvailable={editions.editions.length > 1}
        authenticated={Boolean(userId)}
        communityFavoriteIds={[...communityFavorites]}
        listenedIds={personal ? [...personal.listenedRecordingIds] : []}
        favoriteIds={personal ? [...personal.favoriteRecordingIds] : []}
        ownRatings={personal ? Object.fromEntries(personal.ownTrackRatings) : {}}
      />
      <EditionExtraTracks
        releaseGroupId={detail.releaseGroup.id}
        variants={editions.variants.map((variant) => ({
          ...variant,
          totalTracks: totalTracks.get(variant.editionId) ?? null,
        }))}
      />
    </div>
  );
}
