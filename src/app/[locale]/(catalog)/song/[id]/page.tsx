import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getRecordingDetail } from "@/services/catalog/recording-detail";
import { getRecordingReactionSummary } from "@/services/catalog/recording-reactions";
import { listMyListensForRecording } from "@/services/diary/diary";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { isValidUuid } from "@/lib/validation";
import { RecordingDetailSchema } from "@/lib/api/schemas";
import {
  SongAlbums,
  SongListenHistory,
  SongReactionSummary,
  SongTechnicalDetails,
} from "@/components/catalog/SongSections";
import { SongStarDisclosure } from "@/components/social/SongStarDisclosure";
import { Comments } from "@/components/social/Comments";
import { MarkAsListened } from "@/components/diary/MarkAsListened";
import { FavoriteButton } from "@/components/favorites/FavoriteButton";
import { AddToListButton } from "@/components/lists/AddToListButton";
import { ShowInListsButton } from "@/components/lists/ShowInListsButton";
import { ViewAllListsLink } from "@/components/lists/ViewAllListsLink";
import { resolveSession } from "@/services/auth/sessions";
import { getUserPermissions } from "@/services/auth/authorization";
import { getRatings, listComments, resolveSocialTarget } from "@/services/social";
import { isFavorited } from "@/services/favorites/favorites";

interface SongPageProps { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: SongPageProps): Promise<Metadata> {
  const { id } = await params;
  if (!isValidUuid(id)) return {};
  const result = await getRecordingDetail(id);
  return result.kind === "ok" ? { title: result.detail.recording.title } : {};
}

// Página de canción MÍNIMA (openspec: rebalance-catalog-detail-pages, D2/D6):
// lidera con el/los álbum(es) que la contienen; la reacción cualitativa
// (registrada desde el diario) es la expresión primaria; las estrellas quedan
// detrás de una divulgación; créditos y ediciones van en la ficha técnica
// plegada. No hay bloque de reseñas.
export default async function SongPage({ params }: SongPageProps) {
  const { id } = await params;
  const t = await getTranslations("catalog");
  const common = await getTranslations("common");
  if (!isValidUuid(id)) notFound();

  const result = await getRecordingDetail(id);
  if (result.kind === "not_found") notFound();

  const detail = RecordingDetailSchema.parse({
    recording: result.detail.recording,
    credits: result.detail.credits,
    containingAlbums: result.detail.containingAlbums,
    appearances: result.detail.appearances,
    primaryArtist: result.detail.primaryArtist,
  });

  const session = await resolveSession();
  const userId = session?.user.id;
  const canModerate = session?.user
    ? (await getUserPermissions(session.user.id)).includes("moderation.suspend_social")
    : false;
  const socialTarget = await resolveSocialTarget("recording", detail.recording.id);
  const [ratings, comments, reactionSummary, listenHistory, favorited] = await Promise.all([
    getRatings(socialTarget, userId),
    listComments(socialTarget),
    getRecordingReactionSummary(detail.recording.id),
    userId ? listMyListensForRecording(userId, detail.recording.id) : Promise.resolve([]),
    userId
      ? isFavorited({ type: "recording", id: detail.recording.id }, userId)
      : Promise.resolve(false),
  ]);

  const mainAlbum = detail.containingAlbums[0];
  const breadcrumbItems = [
    { label: common("home"), href: "/" },
    ...(detail.primaryArtist
      ? [{ label: detail.primaryArtist.name, href: `/artist/${detail.primaryArtist.id}` }]
      : []),
    ...(mainAlbum
      ? [{ label: mainAlbum.title, href: `/album/${mainAlbum.releaseGroupId}` }]
      : []),
    { label: detail.recording.title },
  ];

  return (
    <main className="flex min-h-screen flex-col items-start gap-8 px-4 py-12">
      <Breadcrumbs items={breadcrumbItems} />

      <header className="flex flex-col gap-2">
        <h1 className="font-display text-4xl text-paper">{detail.recording.title}</h1>
        {detail.primaryArtist && (
          <p className="font-body text-lg text-paper-muted">
            <Link href={`/artist/${detail.primaryArtist.id}`} className="hover:text-amber">
              {detail.primaryArtist.name}
            </Link>
          </p>
        )}
        {detail.recording.variantType !== "original" && (
          <p className="font-data text-xs uppercase tracking-wider text-paper-muted">
            {t("song.variant")}: {detail.recording.variantType}
          </p>
        )}
      </header>

      <SongAlbums albums={detail.containingAlbums} />

      <div className="flex flex-col items-start gap-3">
        <MarkAsListened target={{ type: "recording", id: detail.recording.id }} authenticated={Boolean(userId)} />
        <FavoriteButton target={{ type: "recording", id: detail.recording.id }} authenticated={Boolean(userId)} initialActive={favorited} />
        <AddToListButton target={{ type: "recording", id: detail.recording.id }} authenticated={Boolean(userId)} />
        <ShowInListsButton target={{ type: "recording", id: detail.recording.id }} authenticated={Boolean(userId)} />
        <ViewAllListsLink target={{ type: "recording", id: detail.recording.id }} />
      </div>

      <SongListenHistory entries={listenHistory} />
      <SongReactionSummary summary={reactionSummary} />

      <Comments
        target="recording"
        targetId={detail.recording.id}
        initial={comments}
        authenticated={Boolean(userId)}
        userId={userId}
        canModerate={canModerate}
      />

      <SongStarDisclosure
        targetId={detail.recording.id}
        initial={ratings}
        authenticated={Boolean(userId)}
      />

      <SongTechnicalDetails credits={detail.credits} appearances={detail.appearances} />
    </main>
  );
}
