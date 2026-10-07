import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AlbumCover } from "@/components/catalog/AlbumCover";
import { itemListsHref } from "@/components/lists/lists-shared";
import { SongAppearances } from "@/components/song/SongAppearances";
import { SongComposition, SongRecordingCredits } from "@/components/song/SongCredits";
import { GenreChips } from "@/components/genres/GenreChips";
import { getSongGenres } from "@/services/genres/display";
import { SongCommunity, SongFacts, SongIdentity } from "@/components/song/SongHeader";
import { SongRelationPanel } from "@/components/song/SongRelationPanel";
import { SongTrackStrip } from "@/components/song/SongTrackStrip";
import { SongVersions } from "@/components/song/SongVersions";
import { Comments } from "@/components/social/Comments";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { albumHref, artistHref } from "@/lib/catalog-links";
import { resolveCatalogRoute } from "@/lib/catalog-route";
import { parseCatalogSegment } from "@/lib/slug";
import { discYear, groupAppearances, scheduleSongCreditsSync } from "@/services/catalog/recording-detail";
import { getRatings, listComments, resolveSocialTarget } from "@/services/social";
import {
  loadCanModerate,
  loadPrincipalRelease,
  loadRecordingCredits,
  loadRecordingDetail,
  loadSession,
  loadSongCommunity,
  loadSongPersonalState,
  loadSongSegment,
  loadTrackStrip,
  loadVersionLine,
  loadVersions,
} from "./song-data";

// Página de canción como ficha compacta de biblioteca (openspec: redesign-song-page): sin
// pestañas; cabecera con carátula del disco principal, identidad, ficha técnica y comunidad
// junto al panel "Tu relación"; después la tira de pistas, composición y créditos, los discos
// que la contienen, las otras versiones de su obra y los comentarios. Sin reseñas. Ninguna
// zona vacía se renderiza (salvo cabecera, panel y comentarios).

interface SongPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: SongPageProps): Promise<Metadata> {
  const { id } = await params;
  const parsed = parseCatalogSegment(id);
  if (!parsed) return {};
  const result = await loadRecordingDetail(parsed.id);
  return result.kind === "ok" ? { title: result.detail.recording.title } : {};
}

export default async function SongPage({ params }: SongPageProps) {
  const { id: segment } = await params;
  const parsed = parseCatalogSegment(segment);
  if (!parsed) notFound();

  const result = await loadRecordingDetail(parsed.id);
  if (result.kind === "not_found") notFound();

  const { detail } = result;
  const recordingId = detail.recording.id;
  resolveCatalogRoute({
    locale: await getLocale(),
    kind: "song",
    segment,
    canonical: await loadSongSegment(recordingId, detail.recording.title),
  });
  const t = await getTranslations("catalog");
  const tCommon = await getTranslations("common");

  const principalRelease = detail.principalDisc ? await loadPrincipalRelease(detail.principalDisc.releaseGroupId) : null;
  // Créditos y autoría se ingieren por disco: si faltan, se piden en segundo plano (design D7).
  scheduleSongCreditsSync(principalRelease);

  const primaryArtists = detail.credits.filter((credit) => credit.role === "primary");
  const session = await loadSession();
  const userId = session?.user.id ?? null;
  const socialTarget = await resolveSocialTarget("recording", recordingId);

  const [strip, credits, versions, versionLine, stats, ratings, personal, canModerate, comments, songGenres] = await Promise.all([
    principalRelease ? loadTrackStrip(recordingId, principalRelease.id) : Promise.resolve(null),
    loadRecordingCredits(
      recordingId,
      primaryArtists.map((artist) => artist.artistId),
      principalRelease?.id ?? null,
    ),
    loadVersions(recordingId),
    loadVersionLine(recordingId, detail.versionAttributes),
    loadSongCommunity(recordingId),
    getRatings(socialTarget, userId ?? undefined),
    userId ? loadSongPersonalState(userId, recordingId) : Promise.resolve(null),
    userId ? loadCanModerate(userId) : Promise.resolve(false),
    listComments(socialTarget, 1, 20, userId),
    getSongGenres(detail.principalDisc?.releaseGroupId ?? null),
  ]);

  const firstAppearance = detail.containingAlbums[0] ?? null;
  const grouped = groupAppearances(detail.containingAlbums);
  const years = Object.fromEntries(detail.containingAlbums.map((disc) => [disc.releaseGroupId, discYear(disc)]));

  const cover = (
    <AlbumCover
      cover={detail.principalDisc?.coverThumbUrl ?? null}
      coverLabel={t("album.coverLabel")}
      coverPlaceholderAlt={t("album.coverPlaceholderAlt")}
      coverFailed={t("album.coverFailed")}
      className="size-32 sm:size-[160px] lg:size-[200px]"
    />
  );

  const albumHrefValue = detail.principalDisc
    ? albumHref(detail.primaryArtist?.name ?? null, detail.principalDisc.title, detail.principalDisc.releaseGroupId)
    : null;
  const breadcrumbItems = [
    { label: tCommon("home"), href: "/" },
    ...(detail.primaryArtist ? [{ label: detail.primaryArtist.name, href: artistHref(detail.primaryArtist.name, detail.primaryArtist.id) }] : []),
    ...(detail.principalDisc && albumHrefValue
      ? [{ label: detail.principalDisc.title, href: albumHrefValue }]
      : []),
    { label: detail.recording.title },
  ];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:py-12">
      <Breadcrumbs items={breadcrumbItems} />

      <header className="grid grid-cols-1 gap-5 [grid-template-areas:'cover'_'identity'_'community'_'panel'_'facts'] sm:grid-cols-[160px_minmax(0,1fr)] sm:[grid-template-areas:'cover_identity'_'cover_facts'_'community_community'_'panel_panel'] lg:grid-cols-[200px_minmax(0,1fr)_18rem] lg:grid-rows-[auto_auto_auto_1fr] lg:[grid-template-areas:'cover_identity_panel'_'cover_facts_panel'_'cover_community_panel'_'._._panel']">
        <div className="[grid-area:cover]">
          {detail.principalDisc ? (
            // La carátula es del disco principal: lleva a él (openspec: polish-song-header).
            <Link
              href={albumHrefValue!}
              title={detail.principalDisc.title}
              aria-label={t("song.coverLink", { title: detail.principalDisc.title })}
              className="block w-fit rounded transition-opacity hover:opacity-90"
            >
              {cover}
            </Link>
          ) : (
            cover
          )}
        </div>
        <div className="[grid-area:identity]">
          <SongIdentity
            title={detail.recording.title}
            artists={primaryArtists}
          />
          <div className="mt-2">
            <GenreChips genres={songGenres.genres} />
          </div>
        </div>
        <div className="[grid-area:facts]">
          <SongFacts
            durationSec={detail.recording.durationSec}
            songwriters={credits.groups.songwriting}
            firstAppearance={firstAppearance}
            principalDiscId={detail.principalDisc?.releaseGroupId ?? null}
            versionLine={versionLine}
          />
        </div>
        <div className="[grid-area:community]">
          <SongCommunity stats={stats} listsHref={itemListsHref({ type: "recording", id: recordingId })} />
        </div>
        <div className="[grid-area:panel]">
          <SongRelationPanel
            recordingId={recordingId}
            state={
              personal
                ? {
                    ratings,
                    listens: personal.listens,
                    favorited: personal.favorited,
                    ownListMemberships: personal.ownListMemberships,
                  }
                : null
            }
          />
        </div>
      </header>

      {strip && detail.principalDisc && <SongTrackStrip strip={strip} disc={detail.principalDisc} />}

      {/* Apilados a ancho completo: Composición es corta y los créditos usan dos columnas. */}
      <div className="flex flex-col gap-4 empty:hidden">
        <SongComposition credits={credits} />
        <SongRecordingCredits credits={credits} principalReleaseGroupId={detail.principalDisc?.releaseGroupId ?? null} />
      </div>

      <SongAppearances grouped={grouped} years={years} />

      {versions && <SongVersions versions={versions} songTitle={detail.recording.title} songArtistIds={primaryArtists.map((artist) => artist.artistId)} />}

      <Comments
        target="recording"
        targetId={recordingId}
        initial={comments}
        authenticated={Boolean(userId)}
        userId={userId ?? undefined}
        canModerate={canModerate}
      />
    </main>
  );
}
