"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getReviews } from "@/lib/api/social";
import { REVIEW_SORTS, type ReviewSort, type ReviewsResponse } from "@/lib/api/schemas";
import { reviewHeadline } from "./album-format";

// Índice de reseñas de la pestaña Reseñas (openspec: redesign-album-page, patrón
// Metal-Archives): una fila por reseña con título (o extracto), nota, autor y fecha. Cada
// fila abre `/review/{id}`, que desde el álbum se intercepta como modal. El orden vive en
// la URL (`?sort=`) para que se pueda enlazar y el modal navegue en el mismo orden.

function Stars({ value }: { value: number }) {
  return (
    <>
      <span aria-hidden="true" className="text-amber">
        {"★".repeat(Math.floor(value))}
        {value % 1 ? "½" : ""}
      </span>
      <span className="sr-only">{value}</span>
    </>
  );
}

interface ReviewIndexProps {
  releaseGroupId: string;
  initial: ReviewsResponse;
  sort: ReviewSort;
}

export function ReviewIndex({ releaseGroupId, initial, sort }: ReviewIndexProps) {
  const t = useTranslations("catalog.album.reviews");
  const tSocial = useTranslations("catalog.social");
  const format = useFormatter();
  const [reviews, setReviews] = useState(initial.reviews);
  const [page, setPage] = useState(initial.page);
  const [hasNext, setHasNext] = useState(initial.hasNext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

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
    <section aria-labelledby="review-index-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="review-index-heading" className="font-display text-xl text-paper">
          {t("heading")}
        </h2>
        <nav aria-label={t("sortLabel")} className="flex flex-wrap items-baseline gap-3 font-data text-xs">
          <span className="text-paper-muted">{t("sortLabel")}:</span>
          {REVIEW_SORTS.map((option) => (
            <Link
              key={option}
              href={`/album/${releaseGroupId}/reviews${option === "recent" ? "" : `?sort=${option}`}`}
              scroll={false}
              aria-current={option === sort ? "true" : undefined}
              className={option === sort ? "text-paper underline" : "text-amber hover:underline"}
            >
              {t(`sort.${option}`)}
            </Link>
          ))}
        </nav>
      </div>

      {reviews.length === 0 ? (
        <p className="font-body text-paper-muted">{t("empty")}</p>
      ) : (
        <table className="w-full table-fixed border-collapse text-left">
          <thead>
            <tr className="border-b border-ink-border font-data text-xs text-paper-muted">
              <th scope="col" className="py-2 pr-3 font-normal">{t("columns.review")}</th>
              <th scope="col" className="w-20 py-2 pr-3 font-normal">{t("columns.rating")}</th>
              <th scope="col" className="hidden w-36 py-2 pr-3 font-normal sm:table-cell">{t("columns.author")}</th>
              <th scope="col" className="hidden w-28 py-2 font-normal sm:table-cell">{t("columns.date")}</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((review) => {
              const author = review.user.deactivated
                ? tSocial("deactivatedAccount")
                : (review.user.displayName ?? review.user.username);
              const date = format.dateTime(new Date(review.createdAt), { dateStyle: "medium" });
              return (
                <tr key={review.id} className="border-b border-ink-border align-baseline">
                  <td className="py-2 pr-3">
                    <Link
                      href={`/review/${review.id}${sortQuery}`}
                      scroll={false}
                      className={`block font-body text-sm hover:text-amber [overflow-wrap:anywhere] ${
                        review.title ? "text-paper" : "italic text-paper-muted"
                      }`}
                    >
                      {reviewHeadline(review)}
                    </Link>
                    <span className="font-data text-xs text-paper-muted sm:hidden">
                      {author} · {date}
                    </span>
                  </td>
                  <td className="py-2 pr-3 font-data text-sm">{review.rating ? <Stars value={review.rating.stars} /> : "—"}</td>
                  <td className="hidden truncate py-2 pr-3 font-data text-xs text-paper-muted sm:table-cell">{author}</td>
                  <td className="hidden py-2 font-data text-xs text-paper-muted sm:table-cell">{date}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
