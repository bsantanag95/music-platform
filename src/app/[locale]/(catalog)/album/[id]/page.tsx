import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getAlbumDetail } from "@/services/catalog/album-detail";
import { AlbumCover } from "@/components/catalog/AlbumCover";
import { TrackList } from "@/components/catalog/TrackList";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { EmptyState } from "@/components/ui/EmptyState";
import { isValidUuid } from "@/lib/validation";
import { SocialSection } from "@/components/social/SocialSection";
import { resolveSession } from "@/services/auth/sessions";
import { getRatings, listComments, resolveSocialTarget } from "@/services/social";

interface AlbumPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: AlbumPageProps): Promise<Metadata> {
  const { id } = await params;
  if (!isValidUuid(id)) return {};
  const result = await getAlbumDetail(id);
  if (result.kind !== "ok") return {};
  return { title: result.detail.releaseGroup.title };
}

export default async function AlbumPage({ params }: AlbumPageProps) {
  const { id } = await params;
  const t = await getTranslations("catalog");
  const tCommon = await getTranslations("common");

  if (!isValidUuid(id)) notFound();

  const result = await getAlbumDetail(id);

  if (result.kind === "not_found") {
    notFound();
  }

  if (result.kind === "no_editions") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <EmptyState
          title={t("album.noEditionsTitle")}
          description={t("album.noEditionsDescription")}
        />
      </main>
    );
  }

  const { detail } = result;
  const session = await resolveSession();
  const socialTarget = await resolveSocialTarget("release-group", detail.releaseGroup.id);
  const [ratings, comments] = await Promise.all([
    getRatings(socialTarget, session?.user.id),
    listComments(socialTarget),
  ]);

  const breadcrumbItems = [
    { label: tCommon("home"), href: "/" },
    ...(detail.primaryArtist
      ? [{ label: detail.primaryArtist.name, href: `/artist/${detail.primaryArtist.id}` }]
      : []),
    { label: detail.releaseGroup.title },
  ];

  return (
    <main className="flex min-h-screen flex-col items-start gap-8 px-4 py-12">
      <Breadcrumbs items={breadcrumbItems} />
      <div className="flex flex-col items-start gap-6 sm:flex-row">
        <AlbumCover
          cover={detail.cover}
          coverLabel={t("album.coverLabel")}
          coverPlaceholderAlt={t("album.coverPlaceholderAlt")}
          coverFailed={t("album.coverFailed")}
          className="h-48 w-48 shrink-0 sm:h-64 sm:w-64"
        />
        <div className="min-w-0">
          <h1 className="font-display text-3xl text-paper">{detail.releaseGroup.title}</h1>
        </div>
      </div>
      <TrackList
        tracks={detail.tracks}
        tracklistHeading={t("album.tracklistHeading")}
        discLabel={(n) => t("album.discLabel", { number: n })}
        durationLabel={t("album.durationLabel")}
        durationUnknown={t("album.durationUnknown")}
        creditsLabel={t("album.creditsLabel")}
      />
      <SocialSection target="release-group" targetId={detail.releaseGroup.id} ratings={ratings} comments={comments} userId={session?.user.id} />
    </main>
  );
}
