import { ReviewArticle } from "@/components/album/ReviewArticle";
import { ReviewModal } from "@/components/album/ReviewModal";
import { reviewHeadline } from "@/components/album/album-format";
import { ReviewSortSchema } from "@/lib/api/schemas";
import { isValidUuid } from "@/lib/validation";
import { getReviewDetail, listReviewIds, resolveSocialTarget } from "@/services/reviews";
import { loadCanModerate, loadSession } from "../../../../album-data";

// Reseña abierta desde el índice del álbum (openspec: redesign-album-page, capability
// `review-detail`): ruta interceptada que muestra `/review/{id}` como modal sobre la página
// del álbum. Abrir la URL directamente muestra la página completa (`app/[locale]/review`).

interface InterceptedReviewPageProps {
  params: Promise<{ reviewId: string }>;
  searchParams: Promise<{ sort?: string }>;
}

export default async function InterceptedReviewPage({ params, searchParams }: InterceptedReviewPageProps) {
  const { reviewId } = await params;
  if (!isValidUuid(reviewId)) return null;
  const detail = await getReviewDetail(reviewId);
  if (!detail) return null;

  const sort = ReviewSortSchema.catch("recent").parse((await searchParams).sort);
  const target = await resolveSocialTarget("release-group", detail.album.id);
  const [ids, session] = await Promise.all([listReviewIds(target, sort), loadSession()]);
  const userId = session?.user.id ?? null;
  const canModerate = userId ? await loadCanModerate(userId) : false;
  const index = ids.indexOf(reviewId);

  return (
    <ReviewModal
      title={reviewHeadline(detail.review)}
      reviewId={reviewId}
      previousId={index > 0 ? (ids[index - 1] ?? null) : null}
      nextId={index >= 0 ? (ids[index + 1] ?? null) : null}
      sortQuery={sort === "recent" ? "" : `?sort=${sort}`}
    >
      <ReviewArticle detail={detail} viewerId={userId} canModerate={canModerate} showTitle={false} />
    </ReviewModal>
  );
}
