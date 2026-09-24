import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ReviewComposer } from "@/components/album/ReviewComposer";
import { ReviewIndex } from "@/components/album/ReviewIndex";
import { ReviewSortSchema } from "@/lib/api/schemas";
import { isValidUuid } from "@/lib/validation";
import { getReviewDetail, listReviews, resolveSocialTarget } from "@/services/reviews";
import { loadAlbumDetail, loadPersonalState, loadSession } from "../../album-data";

// Pestaña Reseñas (openspec: redesign-album-page): el editor de la reseña propia y el
// índice de la comunidad, ordenado según `?sort=`.

interface AlbumReviewsPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sort?: string }>;
}

export async function generateMetadata({ params }: AlbumReviewsPageProps): Promise<Metadata> {
  const { id } = await params;
  if (!isValidUuid(id)) return {};
  const result = await loadAlbumDetail(id);
  if (result.kind !== "ok") return {};
  const t = await getTranslations("catalog.album.tabs");
  return { title: `${t("reviews")} · ${result.detail.releaseGroup.title}` };
}

export default async function AlbumReviewsPage({ params, searchParams }: AlbumReviewsPageProps) {
  const { id } = await params;
  if (!isValidUuid(id)) notFound();
  const result = await loadAlbumDetail(id);
  if (result.kind !== "ok") return null;

  const sort = ReviewSortSchema.catch("recent").parse((await searchParams).sort);
  const releaseGroupId = result.detail.releaseGroup.id;
  const session = await loadSession();
  const userId = session?.user.id ?? null;
  const target = await resolveSocialTarget("release-group", releaseGroupId);

  const [reviews, personal] = await Promise.all([
    listReviews(target, 1, 20, sort),
    userId ? loadPersonalState(userId, releaseGroupId) : Promise.resolve(null),
  ]);
  const ownReview = personal?.ownReviewId ? await getReviewDetail(personal.ownReviewId) : null;

  return (
    <div className="flex flex-col gap-8">
      <ReviewIndex key={sort} releaseGroupId={releaseGroupId} initial={reviews} sort={sort} />
      <ReviewComposer
        releaseGroupId={releaseGroupId}
        authenticated={Boolean(userId)}
        ownStars={personal?.ownRating?.stars ?? 0}
        ownReview={ownReview?.review ?? null}
      />
    </div>
  );
}
