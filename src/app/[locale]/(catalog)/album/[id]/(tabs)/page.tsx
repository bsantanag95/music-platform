import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { isUpcomingRelease } from "@/components/album/album-format";
import { EmptyState } from "@/components/ui/EmptyState";
import { AlbumOnThisRecord, onThisRecordData } from "@/components/album/AlbumOnThisRecord";
import { TrackList } from "@/components/catalog/TrackList";
import { EditionExtraTracks } from "@/components/album/EditionExtraTracks";
import { resolveCatalogRoute } from "@/lib/catalog-route";
import { parseCatalogSegment } from "@/lib/slug";
import {
  loadAlbumDetail,
  loadAlbumEditions,
  loadAlbumHref,
  loadAlbumPersonnel,
  loadAlbumSegment,
  loadCommunityFavorites,
  loadPersonalState,
  loadSession,
} from "../album-data";
import { withClientMessages } from "@/i18n/client-messages";

// Pestaña Canciones, la pestaña por defecto de la página de álbum (openspec:
// redesign-album-page; compositores y «En este disco» desde modernize-album-page-phase2). El detalle y la sesión vienen de las mismas cargas cacheadas que
// usa el layout: no se vuelve a ingerir ni a consultar.

interface AlbumSongsPageProps {
  params: Promise<{ id: string }>;
}

async function AlbumSongsPage({ params }: AlbumSongsPageProps) {
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
  const [communityFavorites, personal, editions, personnel, albumHref] = await Promise.all([
    loadCommunityFavorites(detail.releaseGroup.id),
    userId ? loadPersonalState(userId, detail.releaseGroup.id) : Promise.resolve(null),
    loadAlbumEditions(detail.releaseGroup.id),
    loadAlbumPersonnel(detail.releaseGroup.id),
    loadAlbumHref(detail.releaseGroup.id, detail.releaseGroup.title),
  ]);
  // Compositores por pista y columna «En este disco» (openspec: modernize-album-page-phase2): las mismas lecturas cacheadas
  // que usan el layout y Créditos.
  const songwriters = Object.fromEntries(
    Object.entries(personnel?.byTrack.tracks ?? {}).map(([recordingId, groups]) => [
      recordingId,
      groups.songwriting.map((person) => ({ id: person.artistId, name: person.creditedAs ?? person.name })),
    ]),
  );
  const onThisRecord = onThisRecordData(personnel, editions);
  const totalTracks = new Map(editions.editions.map((e) => [e.id, e.trackCount]));

  // Disco anunciado cuya edición todavía no tiene pistas en MusicBrainz.
  if (detail.tracks.length === 0 && isUpcomingRelease(detail.releaseGroup.firstReleaseDate)) {
    const t = await getTranslations("catalog.album");
    return <EmptyState title={t("upcomingTracksTitle")} description={t("upcomingTracksDescription")} />;
  }

  const songs = (
    <div className="flex min-w-0 flex-col gap-8">
      <TrackList
        tracks={detail.tracks}
        albumArtistIds={detail.primaryArtists.map((artist) => artist.id)}
        authenticated={Boolean(userId)}
        communityFavoriteIds={[...communityFavorites]}
        listenedIds={personal ? [...personal.listenedRecordingIds] : []}
        favoriteIds={personal ? [...personal.favoriteRecordingIds] : []}
        ownRatings={personal ? Object.fromEntries(personal.ownTrackRatings) : {}}
        songwriters={songwriters}
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
  if (!onThisRecord) return songs;
  return (
    <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-14">
      {songs}
      <AlbumOnThisRecord data={onThisRecord} creditsHref={`${albumHref}/credits`} editionsHref={`${albumHref}/editions`} />
    </div>
  );
}

export default withClientMessages("(catalog)/album/[id]/(tabs)/page", AlbumSongsPage);
