import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AlbumCover } from "@/components/catalog/AlbumCover";
import { itemListsHref } from "@/components/lists/lists-shared";
import { SongAppearances } from "@/components/song/SongAppearances";
import { SongComposition, SongRecordingCredits, hasCompositionBlock, hasRecordingCreditsBlock } from "@/components/song/SongCredits";
import { SongOnDisc } from "@/components/song/SongOnDisc";
import { GenreChips } from "@/components/genres/GenreChips";
import { getSongGenres } from "@/services/genres/display";
import { SongCommunity, SongFacts, SongIdentity, SongRateInvite } from "@/components/song/SongHeader";
import { SongRelationPanel } from "@/components/song/SongRelationPanel";
import { SongTrackStrip } from "@/components/song/SongTrackStrip";
import { SongVersions } from "@/components/song/SongVersions";
import { Comments } from "@/components/social/Comments";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ShareAction } from "@/components/share/ShareAction";
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
import { withClientMessages } from "@/i18n/client-messages";
import { buildShareMetadata } from "@/services/share/metadata";

// Página de canción como ficha compacta de biblioteca (openspec: redesign-song-page): sin
// pestañas; una tarjeta con la carátula del disco principal, la identidad, la ficha en dos columnas y la comunidad, y una
// columna lateral con «Recorrer el disco» y la acción principal («Valorar esta canción» o el panel "Tu relación")
// (openspec: modernize-song-page-phase1); después composición y créditos, los discos que la contienen, las otras versiones
// de su obra y los comentarios. Sin reseñas. Ninguna zona vacía se renderiza (salvo la tarjeta y los comentarios).

interface SongPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: SongPageProps): Promise<Metadata> {
  const { id } = await params;
  const parsed = parseCatalogSegment(id);
  if (!parsed) return {};
  const result = await loadRecordingDetail(parsed.id);
  return result.kind === "ok"
    ? { title: result.detail.recording.title, ...(await buildShareMetadata("song", parsed.id, await getLocale())) }
    : {};
}

async function SongPage({ params }: SongPageProps) {
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
      className="size-[5.5rem] sm:size-32 lg:size-[168px]"
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
  // Productores de la ficha: quienes tienen el rol de producción, no los demás del grupo (ingeniería de producción, etc.).
  const producers = credits.groups.production.filter((person) => person.roles.some((role) => role.relationType === "producer"));
  const versionsCount = versions ? versions.covers.length + versions.live.length + versions.others.length : 0;
  // Cuerpo (openspec: modernize-song-page-phase2): créditos a la izquierda y «En el disco» a la derecha cuando hay de los dos.
  const principalDiscId = detail.principalDisc?.releaseGroupId ?? null;
  const hasCredits = hasCompositionBlock(credits) || hasRecordingCreditsBlock(credits, principalDiscId);
  const onDisc =
    strip && detail.principalDisc && albumHrefValue ? (
      <SongOnDisc strip={strip} disc={detail.principalDisc} discHref={albumHrefValue} />
    ) : null;
  const genres = songGenres.genres.length > 0 ? <GenreChips genres={songGenres.genres} max={3} /> : null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[88rem] flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-8 sm:py-10 xl:px-12">
      <Breadcrumbs items={breadcrumbItems} action={<ShareAction kind="song" refId={parsed.id} />} />

      {/* Tarjeta: carátula · identidad y ficha · columna lateral. En el teléfono la carátula va junto a la identidad y el
          resto a todo el ancho. Sin fondo desenfocado: es lo que la distingue de la portada del álbum. */}
      <header className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-4 gap-y-3 rounded-lg border border-ink-border bg-ink-surface p-4 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-x-6 sm:gap-y-4 sm:p-5 lg:grid-cols-[168px_minmax(0,1fr)_17rem] lg:gap-x-7 lg:p-6">
        <div className="sm:row-span-2">
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
        <div className="min-w-0 self-center sm:self-start">
          <SongIdentity title={detail.recording.title} artists={primaryArtists} />
        </div>
        <div className="col-span-2 flex min-w-0 flex-col gap-4 sm:col-span-1 sm:col-start-2">
          <SongFacts
            durationSec={detail.recording.durationSec}
            disc={detail.principalDisc}
            position={strip ? { index: strip.index, total: strip.total } : null}
            genres={genres}
            producers={producers}
            versionsCount={versionsCount}
            versionsHref="#song-versions"
            songwriters={credits.groups.songwriting}
            firstAppearance={firstAppearance}
            principalDiscId={principalDiscId}
            versionLine={versionLine}
          />
          <SongCommunity stats={stats} listsHref={itemListsHref({ type: "recording", id: recordingId })} />
        </div>
        <div className="col-span-2 flex min-w-0 flex-col gap-4 border-t border-ink-border pt-3 empty:hidden sm:pt-4 lg:col-span-1 lg:col-start-3 lg:row-span-2 lg:row-start-1 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
          {strip && <SongTrackStrip strip={strip} />}
          {personal ? (
            <SongRelationPanel
              recordingId={recordingId}
              bare
              state={{
                ratings,
                listens: personal.listens,
                favorited: personal.favorited,
                ownListMemberships: personal.ownListMemberships,
              }}
            />
          ) : (
            <SongRateInvite />
          )}
        </div>
      </header>

      {/* Composición y Créditos apilados, con «En el disco» al lado en escritorio y debajo en el teléfono. */}
      {hasCredits && onDisc ? (
        <div className="grid grid-cols-1 gap-x-14 gap-y-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="flex min-w-0 flex-col gap-8">
            <SongComposition credits={credits} />
            <SongRecordingCredits credits={credits} principalReleaseGroupId={principalDiscId} />
          </div>
          {onDisc}
        </div>
      ) : hasCredits ? (
        <div className="flex flex-col gap-8">
          <SongComposition credits={credits} />
          <SongRecordingCredits credits={credits} principalReleaseGroupId={principalDiscId} />
        </div>
      ) : (
        onDisc && <div className="w-full max-w-[20rem]">{onDisc}</div>
      )}

      <SongAppearances grouped={grouped} years={years} />

      {versions && <SongVersions versions={versions} songTitle={detail.recording.title} songArtistIds={primaryArtists.map((artist) => artist.artistId)} />}

      {/* Ancho de lectura, como en álbum y artista (openspec: refine-song-page-phase1). */}
      <div className="w-full max-w-3xl">
        <Comments
          target="recording"
          targetId={recordingId}
          initial={comments}
          authenticated={Boolean(userId)}
          userId={userId ?? undefined}
          canModerate={canModerate}
        />
      </div>
    </main>
  );
}

export default withClientMessages("(catalog)/song/[id]/page", SongPage);
