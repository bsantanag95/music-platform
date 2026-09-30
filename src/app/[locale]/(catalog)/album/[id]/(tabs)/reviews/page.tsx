import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ReviewComposer } from "@/components/album/ReviewComposer";
import { ReviewIndex } from "@/components/album/ReviewIndex";
import { ReviewSortSchema } from "@/lib/api/schemas";
import { resolveCatalogRoute } from "@/lib/catalog-route";
import { parseCatalogSegment } from "@/lib/slug";
import { getReviewDetail, listReviews, resolveSocialTarget } from "@/services/reviews";
import { loadAlbumDetail, loadAlbumSegment, loadPersonalState, loadSession } from "../../album-data";

// Pestaña Reseñas (openspec: redesign-album-page): el editor de la reseña propia y el
// índice de la comunidad, ordenado según `?sort=`.

interface AlbumReviewsPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sort?: string }>;
}

export async function generateMetadata({ params }: AlbumReviewsPageProps): Promise<Metadata> {
  const { id } = await params;
  const parsed = parseCatalogSegment(id);
  if (!parsed) return {};
  const result = await loadAlbumDetail(parsed.id);
  if (result.kind !== "ok") return {};
  const t = await getTranslations("catalog.album.tabs");
  return { title: `${t("reviews")} · ${result.detail.releaseGroup.title}` };
}

export default async function AlbumReviewsPage({ params, searchParams }: AlbumReviewsPageProps) {
  const { id: segment } = await params;
  const parsed = parseCatalogSegment(segment);
  if (!parsed) notFound();
  const query = await searchParams;
  const result = await loadAlbumDetail(parsed.id);
  if (result.kind !== "ok") return null;

  resolveCatalogRoute({
    locale: await getLocale(),
    kind: "album",
    segment,
    canonical: await loadAlbumSegment(result.detail.releaseGroup.id, result.detail.releaseGroup.title),
    subpath: "/reviews",
    searchParams: query,
  });

  const sort = ReviewSortSchema.catch("recent").parse(query.sort);
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
      <ReviewIndex
        key={sort}
        releaseGroupId={releaseGroupId}
        initial={reviews}
        sort={sort}
        albumTitle={result.detail.releaseGroup.title}
        albumArtistName={result.detail.primaryArtist?.name ?? null}
      />
      <ReviewComposer
        releaseGroupId={releaseGroupId}
        authenticated={Boolean(userId)}
        ownStars={personal?.ownRating?.stars ?? 0}
        ownReview={ownReview?.review ?? null}
        albumTitle={result.detail.releaseGroup.title}
      />
    </div>
  );
}
