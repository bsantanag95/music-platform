"use client";

import { useEffect, useState } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { albumHref, reviewHref } from "@/lib/catalog-links";
import { getReviews } from "@/lib/api/social";
import { REVIEW_SORTS, type ReviewSort, type ReviewsResponse } from "@/lib/api/schemas";
import { StarRatingDisplay } from "@/components/social/StarRatingDisplay";
import { SEGMENT_GROUP, SEGMENT_OPTION } from "@/components/ui/segmented";
import { EmptyState } from "@/components/ui/EmptyState";
import { UserAvatar } from "@/components/social/UserAvatar";
import { formatStars, reviewHeadline } from "./album-format";

// Índice de reseñas de la pestaña Reseñas (openspec: redesign-album-page; lista con monograma y extracto desde
// refine-album-page-phase3): una fila por reseña con título (o extracto), nota, autor y fecha. Cada
// fila abre `/review/{id}`, que desde el álbum se intercepta como modal. El orden vive en
// la URL (`?sort=`) para que se pueda enlazar y el modal navegue en el mismo orden. La nota
// se dibuja con la fila de estrellas de `rating-display` (openspec: unify-rating-representation).

interface ReviewIndexProps {
  releaseGroupId: string;
  initial: ReviewsResponse;
  sort: ReviewSort;
  /** Título del álbum, para los enlaces canónicos de la pestaña y de cada reseña. */
  albumTitle?: string;
  /** Artista principal del álbum, para el segmento canónico de la pestaña. */
  albumArtistName?: string | null;
}

export function ReviewIndex({ releaseGroupId, initial, sort, albumTitle, albumArtistName }: ReviewIndexProps) {
  const t = useTranslations("catalog.album.reviews");
  const tSocial = useTranslations("catalog.social");
  const format = useFormatter();
  const locale = useLocale();
  const [reviews, setReviews] = useState(initial.reviews);
  const [page, setPage] = useState(initial.page);
  const [hasNext, setHasNext] = useState(initial.hasNext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // `initial` viene del Server Component y conserva la identidad entre renders locales,
  // pero cambia cuando llega un payload nuevo de RSC. `router.refresh()` (guardar, editar
  // o borrar una reseña) entrega datos frescos sin remontar este componente, así que el
  // índice se quedaría con la lista vieja hasta recargar. Sincronizamos aquí.
  useEffect(() => {
    setReviews(initial.reviews);
    setPage(initial.page);
    setHasNext(initial.hasNext);
  }, [initial]);

  async function loadMore() {
    setLoading(true);
    setError(false);
    try {
      const next = await getReviews("release-group", releaseGroupId, page + 1, initial.pageSize, sort);
      setReviews((current) => [...current, ...next.reviews]);
      setPage(next.page);
      setHasNext(next.hasNext);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  const sortQuery = sort === "recent" ? "" : `?sort=${sort}`;

  return (
    <section aria-labelledby="review-index-heading" className="flex w-full max-w-3xl flex-col gap-3">
      {/* La pestaña activa ya dice "Reseñas"; el orden solo aparece cuando hay algo que ordenar
          (openspec: refine-album-page-phase1). */}
      <h2 id="review-index-heading" className="sr-only">
        {t("heading")}
      </h2>
      {reviews.length > 1 && (
        <nav aria-label={t("sortLabel")} className={SEGMENT_GROUP}>
          {REVIEW_SORTS.map((option) => (
            <Link
              key={option}
              href={`${albumHref(albumArtistName ?? null, albumTitle ?? "", releaseGroupId)}/reviews${option === "recent" ? "" : `?sort=${option}`}`}
              scroll={false}
              aria-current={option === sort ? "true" : undefined}
              className={SEGMENT_OPTION}
            >
              {t(`sort.${option}`)}
            </Link>
          ))}
        </nav>
      )}

      {reviews.length === 0 ? (
        <EmptyState compact title={t("empty")} description={t("emptyDescription")} />
      ) : (
        // Lista y no tabla (openspec: refine-album-page-phase3, D1): con monograma y extracto se decide qué abrir.
        <ul className="flex flex-col divide-y divide-ink-border border-y border-ink-border">
          {reviews.map((review) => {
            const author = review.user.deactivated
              ? tSocial("deactivatedAccount")
              : (review.user.displayName ?? review.user.username);
            const date = format.dateTime(new Date(review.createdAt), { dateStyle: "medium" });
            return (
              <li key={review.id} className="grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-start gap-x-3 py-3">
                {review.user.deactivated ? (
                  <span aria-hidden="true" className="size-7 rounded-full bg-ink-border" />
                ) : (
                  <UserAvatar avatarUrl={null} username={review.user.username} name={author} size="nav" />
                )}
                <div className="flex min-w-0 flex-col gap-0.5">
                  <Link
                    href={`${reviewHref(review.user.username, albumTitle ?? "", review.id)}${sortQuery}`}
                    scroll={false}
                    className={`font-body hover:text-amber [overflow-wrap:anywhere] ${
                      review.title ? "text-paper" : "italic text-paper-muted"
                    }`}
                  >
                    {reviewHeadline(review)}
                  </Link>
                  <span className="font-data text-xs text-paper-muted">
                    <span>{author}</span>
                    <span aria-hidden="true"> · </span>
                    <time dateTime={review.createdAt}>{date}</time>
                  </span>
                  {review.title && (
                    <p className="mt-1 line-clamp-2 font-body text-sm text-paper-muted [overflow-wrap:anywhere]">
                      {review.body}
                    </p>
                  )}
                </div>
                <span className="pt-1 font-data text-sm">
                  {review.rating ? (
                    <StarRatingDisplay
                      value={review.rating.stars}
                      label={t("ratingLabel", { stars: formatStars(review.rating.stars, locale) })}
                    />
                  ) : (
                    <span className="text-paper-muted">—</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {hasNext && (
        <button
          type="button"
          disabled={loading}
          onClick={() => void loadMore()}
          className="self-start rounded border border-ink-border px-4 py-2 font-display text-sm text-paper disabled:opacity-50"
        >
          {loading ? t("loadingMore") : t("loadMore")}
        </button>
      )}
      {error && (
        <p role="alert" className="font-data text-xs text-danger">
          {t("loadError")}
        </p>
      )}
    </section>
  );
}
