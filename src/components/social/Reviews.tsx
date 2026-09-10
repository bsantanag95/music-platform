"use client";

import { useState } from "react";
import type { SubmitEventHandler } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ApiError } from "@/lib/api/client";
import { deleteReview, getReviews, saveReview, updateReview } from "@/lib/api/social";
import type { Review, ReviewsResponse } from "@/lib/api/schemas";
import { ContentActions } from "./ContentActions";

interface ReviewsProps {
  target: "artist" | "release-group" | "recording";
  targetId: string;
  initial: ReviewsResponse;
  authenticated: boolean;
  userId?: string;
  /** Estrellas vigentes del usuario sobre este objetivo (0 si no valoró). */
  ownStars: number;
  /** El visitante tiene `moderation.suspend_social`. */
  canModerate?: boolean;
}

const STAR_VALUES = Array.from({ length: 10 }, (_, index) => (index + 1) / 2);

function StarValue({ value }: { value: number }) {
  const full = Math.floor(value);
  return (
    <span aria-hidden className="text-amber">
      {"★".repeat(full)}
      {value % 1 ? "½" : ""}
    </span>
  );
}

export function Reviews({
  target,
  targetId,
  initial,
  authenticated,
  userId,
  ownStars,
  canModerate = false,
}: ReviewsProps) {
  const t = useTranslations("catalog.social");
  const tErrors = useTranslations("errors");

  const [reviews, setReviews] = useState(initial.reviews);
  const [page, setPage] = useState(initial.page);
  const [hasNext, setHasNext] = useState(initial.hasNext);

  const ownReview = userId ? reviews.find((r) => r.user.id === userId) : undefined;
  const [body, setBody] = useState("");
  const [title, setTitle] = useState("");
  // Solo se pide (y se envía) una valoración cuando el usuario aún no valoró
  // el álbum; si ya lo hizo, la reseña se cuelga de ese rating vigente.
  const [stars, setStars] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [editingTitle, setEditingTitle] = useState("");
  const [pending, setPending] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const needsStars = ownStars === 0 && !stars;

  function replaceOwn(saved: Review) {
    setReviews((current) => {
      const rest = current.filter((r) => r.user.id !== saved.user.id);
      return [saved, ...rest];
    });
  }

  const handleCreate: SubmitEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    if (!body.trim() || needsStars) return;
    setPending(true);
    setErrorCode(null);
    try {
      const saved = await saveReview(target, targetId, {
        body,
        title: title.trim() || null,
        ...(stars ? { stars } : {}),
      });
      replaceOwn(saved);
      setBody("");
      setTitle("");
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setPending(false);
    }
  };

  async function handleUpdate(id: string) {
    if (!editingBody.trim()) return;
    setPending(true);
    setErrorCode(null);
    try {
      const saved = await updateReview(id, {
        body: editingBody,
        title: editingTitle.trim() || null,
      });
      setReviews((current) => current.map((r) => (r.id === id ? saved : r)));
      setEditingId(null);
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setPending(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t("deleteReviewConfirm"))) return;
    setPending(true);
    setErrorCode(null);
    try {
      await deleteReview(id);
      setReviews((current) => current.filter((r) => r.id !== id));
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setPending(false);
    }
  }

  async function handleLoadMore() {
    setPending(true);
    setErrorCode(null);
    try {
      const next = await getReviews(target, targetId, page + 1, initial.pageSize);
      setReviews((current) => [...current, ...next.reviews]);
      setPage(next.page);
      setHasNext(next.hasNext);
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      aria-labelledby="reviews-heading"
      className="flex w-full flex-col gap-4 border-t border-ink-border pt-6"
    >
      <h2 id="reviews-heading" className="font-display text-xl text-paper">
        {t("reviewsHeading")}
      </h2>

      {authenticated ? (
        <form
          onSubmit={handleCreate}
          className="flex flex-col gap-3"
          aria-label={t("reviewFormLabel")}
        >
          {ownStars === 0 && (
            <fieldset>
              <legend className="mb-2 font-data text-sm text-paper">{t("starsLabel")}</legend>
              <div className="flex flex-wrap gap-2">
                {STAR_VALUES.map((value) => (
                  <label key={value} className="cursor-pointer font-data text-sm text-paper">
                    <input
                      type="radio"
                      name={`review-stars-${target}-${targetId}`}
                      value={value}
                      checked={stars === value}
                      onChange={() => setStars(value)}
                      className="peer sr-only"
                    />
                    <span className="inline-flex min-w-10 justify-center rounded border border-ink-border px-2 py-1 peer-checked:border-amber peer-checked:text-amber">
                      {value}
                    </span>
                  </label>
                ))}
              </div>
              <p className="mt-1 font-data text-xs text-paper-muted">{t("reviewStarsHint")}</p>
            </fieldset>
          )}
          <label
            htmlFor={`review-title-${target}-${targetId}`}
            className="font-data text-sm text-paper"
          >
            {t("reviewTitleLabel")}
          </label>
          <input
            id={`review-title-${target}-${targetId}`}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
            placeholder={t("reviewTitlePlaceholder")}
            className="rounded border border-ink-border bg-ink-surface px-3 py-2"
          />
          <label
            htmlFor={`review-body-${target}-${targetId}`}
            className="font-data text-sm text-paper"
          >
            {t("reviewBodyLabel")}
          </label>
          <textarea
            id={`review-body-${target}-${targetId}`}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={10000}
            rows={6}
            className="rounded border border-ink-border bg-ink-surface px-3 py-2"
          />
          <button
            type="submit"
            disabled={pending || !body.trim() || needsStars}
            className="self-start rounded bg-amber px-4 py-2 font-display text-sm text-ink disabled:opacity-50"
          >
            {pending ? t("saving") : ownReview ? t("reviewUpdate") : t("reviewSubmit")}
          </button>
        </form>
      ) : (
        <p className="font-body text-paper-muted">
          <Link href="/auth/login" className="text-amber underline">
            {t("loginToReview")}
          </Link>
        </p>
      )}

      {errorCode && (
        <p role="alert" className="font-data text-sm text-danger">
          {tErrors(`${errorCode}.description`)}
        </p>
      )}

      {reviews.length === 0 ? (
        <p className="font-body text-paper-muted">{t("noReviews")}</p>
      ) : (
        <ul className="flex flex-col gap-6">
          {reviews.map((review) => {
            const authorName = review.user.displayName ?? review.user.username;
            const isLong = review.body.length > 600;
            const isExpanded = expanded.has(review.id);
            return (
              <li key={review.id} className="flex flex-col gap-2">
                <p className="flex flex-wrap items-baseline gap-x-2 font-data text-xs text-paper-muted">
                  <span>{t("reviewByLabel", { name: authorName })}</span>
                  {review.rating && (
                    <span>
                      <StarValue value={review.rating.stars} />
                      <span className="sr-only">{review.rating.stars}</span>
                    </span>
                  )}
                  {review.title && <span className="text-paper">· {review.title}</span>}
                </p>

                {editingId === review.id ? (
                  <div className="flex flex-col gap-2">
                    <input
                      aria-label={t("reviewTitleLabel")}
                      value={editingTitle}
                      onChange={(event) => setEditingTitle(event.target.value)}
                      maxLength={120}
                      placeholder={t("reviewTitlePlaceholder")}
                      className="rounded border border-ink-border bg-ink px-3 py-2"
                    />
                    <textarea
                      aria-label={t("editReviewLabel")}
                      value={editingBody}
                      onChange={(event) => setEditingBody(event.target.value)}
                      maxLength={10000}
                      rows={5}
                      className="rounded border border-ink-border bg-ink px-3 py-2"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => void handleUpdate(review.id)}
                        className="rounded bg-amber px-3 py-1 font-data text-xs text-ink"
                      >
                        {t("save")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded border border-ink-border px-3 py-1 font-data text-xs text-paper"
                      >
                        {t("cancel")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p
                      className={`whitespace-pre-wrap font-body text-paper ${
                        isLong && !isExpanded ? "line-clamp-6" : ""
                      }`}
                    >
                      {review.body}
                    </p>
                    {isLong && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpanded((current) => {
                            const next = new Set(current);
                            if (next.has(review.id)) next.delete(review.id);
                            else next.add(review.id);
                            return next;
                          })
                        }
                        className="self-start font-data text-xs text-amber underline"
                      >
                        {isExpanded ? t("reviewShowLess") : t("reviewShowMore")}
                      </button>
                    )}
                  </>
                )}

                {userId === review.user.id && editingId !== review.id && (
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(review.id);
                        setEditingBody(review.body);
                        setEditingTitle(review.title ?? "");
                      }}
                      className="font-data text-xs text-amber underline"
                    >
                      {t("edit")}
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => void handleDelete(review.id)}
                      className="font-data text-xs text-danger underline"
                    >
                      {t("delete")}
                    </button>
                  </div>
                )}

                {authenticated && userId !== review.user.id && editingId !== review.id ? (
                  <ContentActions
                    targetType="review"
                    targetId={review.id}
                    authorUsername={review.user.username}
                    authorId={review.user.id}
                    canModerate={canModerate}
                    onBlocked={() => setReviews((current) => current.filter((r) => r.user.id !== review.user.id))}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {hasNext && (
        <button
          type="button"
          disabled={pending}
          onClick={() => void handleLoadMore()}
          className="self-start rounded border border-ink-border px-4 py-2 font-display text-sm text-paper disabled:opacity-50"
        >
          {pending ? t("loadingMore") : t("reviewLoadMore")}
        </button>
      )}
    </section>
  );
}
