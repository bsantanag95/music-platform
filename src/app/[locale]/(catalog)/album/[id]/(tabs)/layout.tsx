import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AlbumCover } from "@/components/catalog/AlbumCover";
import { AlbumFacts, AlbumIdentity, CommunityStats } from "@/components/album/AlbumHeader";
import { AlbumRelationPanel } from "@/components/album/AlbumRelationPanel";
import { AlbumTabs } from "@/components/album/AlbumTabs";
import { DiscographyStrip } from "@/components/album/DiscographyStrip";
import { Comments } from "@/components/social/Comments";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { EmptyState } from "@/components/ui/EmptyState";
import { isValidUuid } from "@/lib/validation";
import { itemListsHref } from "@/components/lists/lists-shared";
import { getRatings, listComments, resolveSocialTarget } from "@/services/social";
import {
  loadAlbumDetail,
  loadAlbumEditions,
  loadAlbumPersonnel,
  loadCanModerate,
  loadCommunityStats,
  loadDiscographyStrip,
  loadPersonalState,
  loadSession,
} from "../album-data";

// Layout común de la página de álbum (openspec: redesign-album-page, D2 y D15): la cabecera
// (carátula, identidad, ficha, comunidad y panel "Tu relación"), la barra de pestañas, la
// franja de discografía y los comentarios se renderizan una vez; cada pestaña es un
// segmento propio. `modal` recibe la reseña interceptada desde el índice de reseñas.
// En escritorio, la cuarta fila (`1fr`) absorbe el alto sobrante cuando el panel lateral
// crece, para que identidad, ficha y comunidad no se separen (rework-album-relation-panel).

interface AlbumLayoutProps {
  children: ReactNode;
  modal: ReactNode;
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: AlbumLayoutProps): Promise<Metadata> {
  const { id } = await params;
  if (!isValidUuid(id)) return {};
  const result = await loadAlbumDetail(id);
  if (result.kind !== "ok") return {};
  return { title: result.detail.releaseGroup.title };
}

export default async function AlbumLayout({ children, modal, params }: AlbumLayoutProps) {
  const { id } = await params;
  if (!isValidUuid(id)) notFound();

  const result = await loadAlbumDetail(id);
  if (result.kind === "not_found") notFound();

  const t = await getTranslations("catalog");
  const tCommon = await getTranslations("common");

  if (result.kind === "no_editions") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <EmptyState title={t("album.noEditionsTitle")} description={t("album.noEditionsDescription")} />
      </main>
    );
  }

  const { detail } = result;
  const releaseGroupId = detail.releaseGroup.id;
  const session = await loadSession();
  const userId = session?.user.id ?? null;
  const socialTarget = await resolveSocialTarget("release-group", releaseGroupId);

  const [stats, ratings, personal, canModerate, comments, strip, editions, personnel] = await Promise.all([
    loadCommunityStats(releaseGroupId),
    getRatings(socialTarget, userId ?? undefined),
    userId ? loadPersonalState(userId, releaseGroupId) : Promise.resolve(null),
    userId ? loadCanModerate(userId) : Promise.resolve(false),
    listComments(socialTarget),
    detail.primaryArtist
      ? loadDiscographyStrip(detail.primaryArtist.id, releaseGroupId, detail.releaseGroup.category)
      : Promise.resolve(null),
    loadAlbumEditions(releaseGroupId),
    loadAlbumPersonnel(releaseGroupId),
  ]);

  // Créditos y Ediciones solo existen con datos (openspec: enrich-album-editions-and-credits).
  const availableTabs = { credits: personnel !== null, editions: editions.editions.length > 1 };
  const representativeLabel =
    editions.editions.find((e) => e.mbid === editions.representativeMbid)?.labels.find((l) => l.name)?.name ?? null;

  const breadcrumbItems = [
    { label: tCommon("home"), href: "/" },
    ...(detail.primaryArtist
      ? [{ label: detail.primaryArtist.name, href: `/artist/${detail.primaryArtist.id}` }]
      : []),
    { label: detail.releaseGroup.title },
  ];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:py-12">
      <Breadcrumbs items={breadcrumbItems} />

      <header
        className="grid grid-cols-1 gap-5 [grid-template-areas:'cover'_'identity'_'community'_'panel'_'facts'] sm:grid-cols-[200px_minmax(0,1fr)] sm:[grid-template-areas:'cover_identity'_'cover_facts'_'community_community'_'panel_panel'] lg:grid-cols-[250px_minmax(0,1fr)_18rem] lg:grid-rows-[auto_auto_auto_1fr] lg:[grid-template-areas:'cover_identity_panel'_'cover_facts_panel'_'cover_community_panel'_'._._panel']"
      >
        <div className="[grid-area:cover]">
          <AlbumCover
            cover={detail.cover}
            coverLabel={t("album.coverLabel")}
            coverPlaceholderAlt={t("album.coverPlaceholderAlt")}
            coverFailed={t("album.coverFailed")}
            className="size-40 sm:size-[200px] lg:size-[250px]"
          />
        </div>
        <div className="[grid-area:identity]">
          <AlbumIdentity
            title={detail.releaseGroup.title}
            category={detail.releaseGroup.category as "studio" | "compilation" | "live_other" | "single_ep"}
            artists={detail.primaryArtists}
          />
        </div>
        <div className="[grid-area:facts]">
          <AlbumFacts
            releaseGroupId={releaseGroupId}
            firstReleaseDate={detail.releaseGroup.firstReleaseDate}
            firstReleaseYear={detail.releaseGroup.firstReleaseYear}
            tracks={detail.tracks}
            editionLabel={detail.release.editionLabel}
            editionsAvailable={availableTabs.editions}
            label={representativeLabel}
          />
        </div>
        <div className="[grid-area:community]">
          <CommunityStats stats={stats} listsHref={itemListsHref({ type: "release-group", id: releaseGroupId })} />
        </div>
        <div className="[grid-area:panel]">
          <AlbumRelationPanel
            releaseGroupId={releaseGroupId}
            state={
              personal
                ? {
                    ratings,
                    ownReviewId: personal.ownReviewId,
                    listens: personal.listens,
                    favorited: personal.favorited,
                    pending: personal.pending,
                    collectionEntries: personal.collectionEntries,
                    wantedEntries: personal.wantedEntries,
                    ownListMemberships: personal.ownListMemberships,
                  }
                : null
            }
          />
        </div>
      </header>

      <div className="flex flex-col gap-6">
        <AlbumTabs releaseGroupId={releaseGroupId} available={availableTabs} reviewCount={stats.reviewCount} />
        {children}
      </div>

      {strip && detail.primaryArtist && <DiscographyStrip artistName={detail.primaryArtist.name} strip={strip} />}

      <Comments
        target="release-group"
        targetId={releaseGroupId}
        initial={comments}
        authenticated={Boolean(userId)}
        userId={userId ?? undefined}
        canModerate={canModerate}
      />

      {modal}
    </main>
  );
}
