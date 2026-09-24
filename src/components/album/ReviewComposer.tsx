"use client";

import { useState } from "react";
import type { SubmitEventHandler } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { ApiError } from "@/lib/api/client";
import { deleteReview, saveReview, updateReview } from "@/lib/api/social";
import type { Review } from "@/lib/api/schemas";

// Editor de la reseña propia en la pestaña Reseñas del álbum (openspec: redesign-album-page).
// Mismas reglas que antes (spec album-review): cuerpo obligatorio, título opcional y
// estrellas solo si el usuario todavía no valoró el álbum. El índice de la comunidad
// vive aparte (`ReviewIndex`).

const STAR_VALUES = Array.from({ length: 10 }, (_, index) => (index + 1) / 2);

interface ReviewComposerProps {
  releaseGroupId: string;
  authenticated: boolean;
  /** Estrellas vigentes del usuario sobre el álbum (0 si no valoró). */
  ownStars: number;
  ownReview: Review | null;
}

export function ReviewComposer({ releaseGroupId, authenticated, ownStars, ownReview }: ReviewComposerProps) {
  const t = useTranslations("catalog.social");
  const tAlbum = useTranslations("catalog.album.reviews");
  const tErrors = useTranslations("errors");
  const router = useRouter();

  const [review, setReview] = useState(ownReview);
  const [editing, setEditing] = useState(ownReview === null);
  const [title, setTitle] = useState(ownReview?.title ?? "");
  const [body, setBody] = useState(ownReview?.body ?? "");
  const [stars, setStars] = useState(0);
  const [pending, setPending] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const needsStars = !review && ownStars === 0 && !stars;

  if (!authenticated) {
    return (
      <p className="font-body text-paper-muted">
        <Link href="/auth/login" className="text-amber underline">
          {t("loginToReview")}
        </Link>
      </p>
    );
  }

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    if (!body.trim() || needsStars) return;
    setPending(true);
    setErrorCode(null);
    try {
      const saved = review
        ? await updateReview(review.id, { body, title: title.trim() || null })
        : await saveReview("release-group", releaseGroupId, {
            body,
            title: title.trim() || null,
            ...(stars ? { stars } : {}),
          });
      setReview(saved);
      setEditing(false);
      router.refresh();
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setPending(false);
    }
  };

  async function handleDelete() {
    if (!review || !window.confirm(t("deleteReviewConfirm"))) return;
    setPending(true);
    setErrorCode(null);
    try {
      await deleteReview(review.id);
      setReview(null);
      setTitle("");
      setBody("");
      setEditing(true);
      router.refresh();
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setPending(false);
    }
  }

  return (
    <section id="your-review" aria-labelledby="your-review-heading" className="flex scroll-mt-24 flex-col gap-3">
      <h3 id="your-review-heading" className="font-display text-lg text-paper">
        {tAlbum("writeHeading")}
      </h3>

      {review && !editing ? (
        <div className="flex flex-col gap-2 rounded border border-ink-border bg-ink-surface p-4">
          {review.title && <p className="font-display text-paper">{review.title}</p>}
          <p className="line-clamp-4 whitespace-pre-wrap font-body text-sm text-paper">{review.body}</p>
          <div className="flex gap-3">
            <Link href={`/review/${review.id}`} className="font-data text-xs text-amber underline">
              {t("reviewShowMore")}
            </Link>
            <button type="button" onClick={() => setEditing(true)} className="font-data text-xs text-amber underline">
              {t("edit")}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => void handleDelete()}
              className="font-data text-xs text-danger underline disabled:opacity-50"
            >
              {t("delete")}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3" aria-label={t("reviewFormLabel")}>
          {!review && ownStars === 0 && (
            <fieldset>
              <legend className="mb-2 font-data text-sm text-paper">{t("starsLabel")}</legend>
              <div className="flex flex-wrap gap-2">
                {STAR_VALUES.map((value) => (
                  <label key={value} className="cursor-pointer font-data text-sm text-paper">
                    <input
                      type="radio"
                      name={`review-stars-${releaseGroupId}`}
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
          <label htmlFor={`review-title-${releaseGroupId}`} className="font-data text-sm text-paper">
            {t("reviewTitleLabel")}
          </label>
          <input
            id={`review-title-${releaseGroupId}`}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
            placeholder={t("reviewTitlePlaceholder")}
            className="rounded border border-ink-border bg-ink-surface px-3 py-2"
          />
          <label htmlFor={`review-body-${releaseGroupId}`} className="font-data text-sm text-paper">
            {t("reviewBodyLabel")}
          </label>
          <textarea
            id={`review-body-${releaseGroupId}`}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={10000}
            rows={6}
            className="rounded border border-ink-border bg-ink-surface px-3 py-2"
          />
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={pending || !body.trim() || needsStars}
              className="rounded bg-amber px-4 py-2 font-display text-sm text-ink disabled:opacity-50"
            >
              {pending ? t("saving") : review ? t("reviewUpdate") : t("reviewSubmit")}
            </button>
            {review && (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded border border-ink-border px-4 py-2 font-display text-sm text-paper"
              >
                {t("cancel")}
              </button>
            )}
          </div>
        </form>
      )}

      {errorCode && (
        <p role="alert" className="font-data text-sm text-danger">
          {tErrors(`${errorCode}.description`)}
        </p>
      )}
    </section>
  );
}
