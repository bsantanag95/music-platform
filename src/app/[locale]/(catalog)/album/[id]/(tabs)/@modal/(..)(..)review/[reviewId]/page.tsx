import { ReviewArticle } from "@/components/album/ReviewArticle";
import { ReviewModal } from "@/components/album/ReviewModal";
import { reviewHeadline } from "@/components/album/album-format";
import { getLocale } from "next-intl/server";
import { ReviewSortSchema } from "@/lib/api/schemas";
import { localeHref, reviewHref } from "@/lib/catalog-links";
import { parseCatalogSegment } from "@/lib/slug";
import { getReviewDetail, listReviewNeighbors, resolveSocialTarget } from "@/services/reviews";
import { loadCanModerate, loadSession } from "../../../../album-data";

// Reseña abierta desde el índice del álbum (openspec: redesign-album-page, capability
// `review-detail`): ruta interceptada que muestra `/review/{slug-id}` como modal sobre la
// página del álbum. Abrir la URL directamente muestra la página completa
// (`app/[locale]/review`). Es navegación blanda: solo parsea el segmento, sin canonicalizar.

interface InterceptedReviewPageProps {
  params: Promise<{ reviewId: string }>;
  searchParams: Promise<{ sort?: string }>;
}

export default async function InterceptedReviewPage({ params, searchParams }: InterceptedReviewPageProps) {
  const { reviewId: segment } = await params;
  const parsed = parseCatalogSegment(segment);
  if (!parsed) return null;
  const reviewId = parsed.id;
  const detail = await getReviewDetail(reviewId);
  if (!detail) return null;

  const sort = ReviewSortSchema.catch("recent").parse((await searchParams).sort);
  const sortQuery = sort === "recent" ? "" : `?sort=${sort}`;
  const target = await resolveSocialTarget("release-group", detail.album.id);
  const [{ previous, next }, session] = await Promise.all([
    listReviewNeighbors(target, detail.album.title, reviewId, sort),
    loadSession(),
  ]);
  const userId = session?.user.id ?? null;
  const canModerate = userId ? await loadCanModerate(userId) : false;

  return (
    <ReviewModal
      title={reviewHeadline(detail.review)}
      fullPageHref={localeHref(
        await getLocale(),
        reviewHref(detail.review.user.username, detail.album.title, reviewId),
      )}
      previousHref={previous ? `${previous.href}${sortQuery}` : null}
      nextHref={next ? `${next.href}${sortQuery}` : null}
    >
      <ReviewArticle detail={detail} viewerId={userId} canModerate={canModerate} showTitle={false} />
    </ReviewModal>
  );
}
