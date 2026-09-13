import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getAlbumDetail } from "@/services/catalog/album-detail";
import { AlbumCover } from "@/components/catalog/AlbumCover";
import { TrackList } from "@/components/catalog/TrackList";
import { WorkTypeBadge } from "@/components/catalog/WorkTypeBadge";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { EmptyState } from "@/components/ui/EmptyState";
import { isValidUuid } from "@/lib/validation";
import type { ReleaseGroupCategory } from "@/lib/api/schemas";
import { SocialSection } from "@/components/social/SocialSection";
import { MarkAsListened } from "@/components/diary/MarkAsListened";
import { FavoriteButton } from "@/components/favorites/FavoriteButton";
import { WantToListenButton } from "@/components/want-to-listen/WantToListenButton";
import { AddToListButton } from "@/components/lists/AddToListButton";
import { ShowInListsButton } from "@/components/lists/ShowInListsButton";
import { ViewAllListsLink } from "@/components/lists/ViewAllListsLink";
import { CollectionAlbumAction } from "@/components/collection/CollectionAlbumAction";
import { resolveSession } from "@/services/auth/sessions";
import { getUserPermissions } from "@/services/auth/authorization";
import { isFavorited } from "@/services/favorites/favorites";
import { isWantToListen } from "@/services/want-to-listen/want-to-listen";
import { listOwnEntriesForReleaseGroup } from "@/services/collection/collection";
import { getRatings, listComments, resolveSocialTarget } from "@/services/social";
import { listReviews } from "@/services/reviews";

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
  const canModerate = session?.user
    ? (await getUserPermissions(session.user.id)).includes("moderation.suspend_social")
    : false;
  const socialTarget = await resolveSocialTarget("release-group", detail.releaseGroup.id);
  const [ratings, comments, reviews, collectionEntries, favorited, wantToListen] = await Promise.all([
    getRatings(socialTarget, session?.user.id),
    listComments(socialTarget),
    listReviews(socialTarget),
    session?.user.id
      ? listOwnEntriesForReleaseGroup(session.user.id, detail.releaseGroup.id)
      : Promise.resolve([]),
    session?.user.id
      ? isFavorited({ type: "release-group", id: detail.releaseGroup.id }, session.user.id)
      : Promise.resolve(false),
    session?.user.id
      ? isWantToListen({ type: "release-group", id: detail.releaseGroup.id }, session.user.id)
      : Promise.resolve(false),
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
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {detail.releaseGroup.firstReleaseYear !== null && (
              <time className="font-data text-sm text-paper-muted" dateTime={detail.releaseGroup.firstReleaseDate ?? String(detail.releaseGroup.firstReleaseYear)}>
                {detail.releaseGroup.firstReleaseYear}
              </time>
            )}
            <WorkTypeBadge
              category={detail.releaseGroup.category as ReleaseGroupCategory}
              labels={{
                compilation: t("album.workType.compilation"),
                live_other: t("album.workType.live_other"),
                single_ep: t("album.workType.single_ep"),
              }}
            />
          </div>
          <div className="mt-4 flex flex-col items-start gap-3">
            <MarkAsListened
              target={{ type: "release-group", id: detail.releaseGroup.id }}
              authenticated={Boolean(session?.user.id)}
            />
            <FavoriteButton
              target={{ type: "release-group", id: detail.releaseGroup.id }}
              authenticated={Boolean(session?.user.id)}
              initialActive={favorited}
            />
            <WantToListenButton
              target={{ type: "release-group", id: detail.releaseGroup.id }}
              authenticated={Boolean(session?.user.id)}
              initialActive={wantToListen}
            />
            <AddToListButton
              target={{ type: "release-group", id: detail.releaseGroup.id }}
              authenticated={Boolean(session?.user.id)}
            />
            <ShowInListsButton
              target={{ type: "release-group", id: detail.releaseGroup.id }}
              authenticated={Boolean(session?.user.id)}
            />
            <ViewAllListsLink target={{ type: "release-group", id: detail.releaseGroup.id }} />
            <CollectionAlbumAction
              releaseGroupId={detail.releaseGroup.id}
              authenticated={Boolean(session?.user.id)}
              initialEntries={collectionEntries}
            />
          </div>
        </div>
      </div>
      <TrackList
        tracks={detail.tracks}
        tracklistHeading={t("album.tracklistHeading")}
        discLabels={Object.fromEntries(
          Array.from(new Set(detail.tracks.map((track) => track.discNumber))).map((n) => [
            n,
            t("album.discLabel", { number: n }),
          ]),
        )}
        durationLabel={t("album.durationLabel")}
        durationUnknown={t("album.durationUnknown")}
        creditsLabel={t("album.creditsLabel")}
        authenticated={Boolean(session?.user.id)}
      />
      <SocialSection target="release-group" targetId={detail.releaseGroup.id} ratings={ratings} comments={comments} reviews={reviews} userId={session?.user.id} canModerate={canModerate} />
    </main>
  );
}
