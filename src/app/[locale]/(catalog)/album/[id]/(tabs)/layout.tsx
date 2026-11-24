import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { formatReleaseDate, isUpcomingRelease } from "@/components/album/album-format";
import { GenreChips } from "@/components/genres/GenreChips";
import { getAlbumGenres } from "@/services/genres/display";
import { AlbumCover } from "@/components/catalog/AlbumCover";
import { AlbumFacts, AlbumIdentity, AlbumRateInvite, CommunityStats } from "@/components/album/AlbumHeader";
import { AlbumSleeve, AlbumStage } from "@/components/album/AlbumStage";
import { AlbumRelationPanel } from "@/components/album/AlbumRelationPanel";
import { AlbumTabs } from "@/components/album/AlbumTabs";
import { DiscographyStrip } from "@/components/album/DiscographyStrip";
import { Comments } from "@/components/social/Comments";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ShareAction } from "@/components/share/ShareAction";
import { EmptyState } from "@/components/ui/EmptyState";
import { artistHref } from "@/lib/catalog-links";
import { parseCatalogSegment } from "@/lib/slug";
import { itemListsHref } from "@/components/lists/lists-shared";
import { getRatings, listComments, resolveSocialTarget } from "@/services/social";
import {
  loadAlbumDetail,
  loadAlbumEditions,
  loadAlbumPersonnel,
  loadAlbumHref,
  loadCanModerate,
  loadCommunityStats,
  loadDiscographyStrip,
  loadPersonalState,
  loadSession,
} from "../album-data";
import { withClientMessages } from "@/i18n/client-messages";
import { buildShareMetadata } from "@/services/share/metadata";

// Layout común de la página de álbum (openspec: redesign-album-page, D2 y D15): la portada
// (openspec: modernize-album-page-phase1: carátula en su funda, identidad, ficha, comunidad y la acción principal, el panel
// "Tu relación" con sesión o «Valorar este disco» y «Lo quiero escuchar» sin ella), la barra de pestañas, la franja de discografía y los
// comentarios se renderizan una vez; cada pestaña es un segmento propio. `modal` recibe la reseña interceptada desde el índice de reseñas.
// Con el panel abierto, la columna izquierda queda arriba (`items-start`) y el alto sobrante debajo (rework-album-relation-panel).

interface AlbumLayoutProps {
  children: ReactNode;
  modal: ReactNode;
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: AlbumLayoutProps): Promise<Metadata> {
  const { id } = await params;
  const parsed = parseCatalogSegment(id);
  if (!parsed) return {};
  const result = await loadAlbumDetail(parsed.id);
  if (result.kind !== "ok") return {};
  return { title: result.detail.releaseGroup.title, ...(await buildShareMetadata("album", parsed.id, await getLocale())) };
}

async function AlbumLayout({ children, modal, params }: AlbumLayoutProps) {
  const { id } = await params;
  const parsed = parseCatalogSegment(id);
  if (!parsed) notFound();

  const result = await loadAlbumDetail(parsed.id);
  if (result.kind === "not_found") notFound();

  const t = await getTranslations("catalog");
  const tCommon = await getTranslations("common");

  if (result.kind === "no_editions") {
    // Un disco anunciado (fecha exacta futura) todavía no tiene ediciones publicadas en
    // MusicBrainz: se muestra su fecha en vez del error (openspec: add-home-release-calendar).
    const { firstReleaseDate, title } = result.releaseGroup;
    const upcoming = isUpcomingRelease(firstReleaseDate);
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
        {upcoming ? (
          <EmptyState
            title={`${title} · ${t("album.noEditionsUpcomingTitle", {
              date: formatReleaseDate(firstReleaseDate, null, await getLocale()) ?? "",
            })}`}
            description={t("album.upcomingTracksDescription")}
          />
        ) : (
          <EmptyState title={t("album.noEditionsTitle")} description={t("album.noEditionsDescription")} />
        )}
      </main>
    );
  }

  const { detail } = result;
  const releaseGroupId = detail.releaseGroup.id;
  const session = await loadSession();
  const userId = session?.user.id ?? null;
  const socialTarget = await resolveSocialTarget("release-group", releaseGroupId);

  const [stats, ratings, personal, canModerate, comments, strip, editions, personnel, albumGenres, canonicalHref] = await Promise.all([
    loadCommunityStats(releaseGroupId),
    getRatings(socialTarget, userId ?? undefined),
    userId ? loadPersonalState(userId, releaseGroupId) : Promise.resolve(null),
    userId ? loadCanModerate(userId) : Promise.resolve(false),
    listComments(socialTarget, 1, 20, userId),
    detail.primaryArtist
      ? loadDiscographyStrip(detail.primaryArtist.id, releaseGroupId, detail.releaseGroup.category)
      : Promise.resolve(null),
    loadAlbumEditions(releaseGroupId),
    loadAlbumPersonnel(releaseGroupId),
    getAlbumGenres(releaseGroupId),
    loadAlbumHref(releaseGroupId, detail.releaseGroup.title),
  ]);

  // Créditos y Ediciones solo existen con datos (openspec: enrich-album-editions-and-credits).
  const availableTabs = { credits: personnel !== null, editions: editions.editions.length > 1 };
  const representativeLabel =
    editions.editions.find((e) => e.mbid === editions.representativeMbid)?.labels.find((l) => l.name)?.name ?? null;

  const breadcrumbItems = [
    { label: tCommon("home"), href: "/" },
    ...(detail.primaryArtist
      ? [{ label: detail.primaryArtist.name, href: artistHref(detail.primaryArtist.name, detail.primaryArtist.id) }]
      : []),
    { label: detail.releaseGroup.title },
  ];

  // Productores del disco para la ficha (openspec: modernize-album-page-phase1): el nivel producción, solo la relación «producer».
  const producers = (personnel?.levels.production ?? [])
    .filter((entry) => entry.roles.some((role) => role.relationType === "producer"))
    .map((entry) => ({ id: entry.artistId, name: entry.name }));
  const frame = "mx-auto w-full max-w-[88rem] px-4 sm:px-8 xl:px-12";

  return (
    <main className="flex min-h-screen w-full flex-col">
      <AlbumStage cover={detail.cover}>
        <div className={`${frame} flex flex-col gap-6 pb-6 pt-6 sm:gap-7 sm:pb-9`}>
          <Breadcrumbs items={breadcrumbItems} action={<ShareAction kind="album" refId={parsed.id} />} />
          <header className="grid grid-cols-1 items-start gap-7 lg:grid-cols-[minmax(0,1fr)_18rem]">
            {/* Funda y texto alineados arriba: la comunidad o un título largo crecen hacia abajo sin mover la carátula. El texto deja
                el margen por el que asoma el vinilo. */}
            <div className="flex min-w-0 flex-col items-start gap-6 sm:flex-row sm:gap-8">
              <AlbumSleeve>
                <AlbumCover
                  cover={detail.cover}
                  coverLabel={t("album.coverLabel")}
                  coverPlaceholderAlt={t("album.coverPlaceholderAlt")}
                  coverFailed={t("album.coverFailed")}
                  className="aspect-square w-full"
                />
              </AlbumSleeve>
              <div className="relative z-10 flex min-w-0 flex-1 flex-col gap-4 sm:pl-10">
                <AlbumIdentity
                  title={detail.releaseGroup.title}
                  category={detail.releaseGroup.category as "studio" | "compilation" | "live_other" | "single_ep"}
                  artists={detail.primaryArtists}
                  year={detail.releaseGroup.firstReleaseYear}
                />
                <AlbumFacts
                  releaseGroupId={releaseGroupId}
                  firstReleaseDate={detail.releaseGroup.firstReleaseDate}
                  firstReleaseYear={detail.releaseGroup.firstReleaseYear}
                  tracks={detail.tracks}
                  editionLabel={detail.release.editionLabel}
                  editionsAvailable={availableTabs.editions}
                  editionCount={editions.editions.length}
                  label={representativeLabel}
                  producers={producers}
                  genres={
                    albumGenres.genres.length > 0 ? (
                      <GenreChips
                        genres={albumGenres.genres}
                        descriptors={albumGenres.descriptors}
                        inheritedFrom={detail.primaryArtist?.name ?? null}
                      />
                    ) : null
                  }
                />
                <CommunityStats stats={stats} listsHref={itemListsHref({ type: "release-group", id: releaseGroupId })} />
              </div>
            </div>
            {/* Sin sesión, «Valorar este disco» y «Lo quiero escuchar» en lugar del panel; con sesión, el panel entero en la columna derecha. */}
            {personal ? (
              <AlbumRelationPanel
                releaseGroupId={releaseGroupId}
                reviewsHref={`${canonicalHref}/reviews`}
                state={{
                  ratings,
                  ownReviewId: personal.ownReviewId,
                  listens: personal.listens,
                  favorited: personal.favorited,
                  pending: personal.pending,
                  collectionEntries: personal.collectionEntries,
                  wantedEntries: personal.wantedEntries,
                  ownListMemberships: personal.ownListMemberships,
                }}
              />
            ) : (
              <div className="lg:self-end">
                <AlbumRateInvite />
              </div>
            )}
          </header>
        </div>
      </AlbumStage>

      <div className={`${frame} flex flex-col gap-8 pb-12 pt-2`}>
        {/* Alturas de las barras fijas: el encabezado del sitio y las pestañas, las mismas que en artista
            (openspec: refine-album-page-phase1, D1). */}
        <div className="flex flex-col gap-6 [--album-tabs-h:2.375rem] [--site-header-h:3.625rem]">
          <AlbumTabs releaseGroupId={releaseGroupId} available={availableTabs} reviewCount={stats.reviewCount} />
          {children}
        </div>

        {strip && detail.primaryArtist && <DiscographyStrip artistName={detail.primaryArtist.name} strip={strip} authenticated={userId !== null} />}

        <div className="w-full max-w-3xl">
          <Comments
            target="release-group"
            targetId={releaseGroupId}
            initial={comments}
            authenticated={Boolean(userId)}
            userId={userId ?? undefined}
            canModerate={canModerate}
          />
        </div>

        {modal}
      </div>
    </main>
  );
}

export default withClientMessages("(catalog)/album/[id]/(tabs)/layout", AlbumLayout);
