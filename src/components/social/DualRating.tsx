"use client";

import { useState } from "react";
import type { SubmitEventHandler } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { deleteRating, getRatings, saveRating } from "@/lib/api/social";
import { ApiError } from "@/lib/api/client";
import type { RatingsResponse } from "@/lib/api/schemas";

interface DualRatingProps {
  target: "artist" | "release-group" | "recording";
  targetId: string;
  initial: RatingsResponse;
  authenticated: boolean;
}

export function DualRating({ target, targetId, initial, authenticated }: DualRatingProps) {
  const t = useTranslations("catalog.social");
  const tErrors = useTranslations("errors");
  const [ratings, setRatings] = useState(initial);
  const [stars, setStars] = useState(initial.own?.stars ?? 0);
  const [detailedScore, setDetailedScore] = useState(initial.own?.detailedScore?.toString() ?? "");
  const [pending, setPending] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleSave: SubmitEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    if (!stars) return;
    setPending(true);
    setErrorCode(null);
    setNotice(null);
    try {
       await saveRating(target, targetId, {
        stars,
        ...(detailedScore ? { detailedScore: Number(detailedScore) } : {}),
      });
       setRatings(await getRatings(target, targetId));
      setNotice("saved");
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setPending(false);
    }
  };

  async function handleDelete() {
    if (!window.confirm(t("deleteRatingConfirm"))) return;
    setPending(true);
    setErrorCode(null);
    setNotice(null);
    try {
      await deleteRating(target, targetId);
       setRatings(await getRatings(target, targetId));
      setStars(0);
      setDetailedScore("");
      setNotice("deleted");
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setPending(false);
    }
  }

  return (
    <section aria-labelledby="rating-heading" className="flex flex-col gap-4 border-t border-ink-border pt-6">
      <div>
        <h2 id="rating-heading" className="font-display text-xl text-paper">{t("ratingHeading")}</h2>
        <p className="font-data text-sm text-paper-muted">
          {ratings.aggregate.count ? t("aggregate", { count: ratings.aggregate.count, stars: ratings.aggregate.averageStars?.toFixed(1) ?? "-" }) : t("noRatings")}
        </p>
      </div>
      {authenticated ? (
        <form onSubmit={handleSave} className="flex max-w-xl flex-col gap-4" aria-label={t("ratingFormLabel")}>
          <fieldset>
            <legend className="mb-2 font-data text-sm text-paper">{t("starsLabel")}</legend>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 10 }, (_, index) => (index + 1) / 2).map((value) => (
                <label key={value} className="cursor-pointer font-data text-sm text-paper">
                  <input
                    type="radio"
                    name={`stars-${target}-${targetId}`}
                    value={value}
                    checked={stars === value}
                    onChange={() => setStars(value)}
                    className="sr-only peer"
                  />
                  <span className="inline-flex min-w-10 justify-center rounded border border-ink-border px-2 py-1 peer-checked:border-amber peer-checked:text-amber">{value}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex max-w-40 flex-col gap-2 font-data text-sm text-paper">
            {t("detailedLabel")}
            <input type="number" min="1" max="100" value={detailedScore} onChange={(event) => setDetailedScore(event.target.value)} className="rounded border border-ink-border bg-ink-surface px-3 py-2" />
          </label>
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={pending || !stars} className="rounded bg-amber px-4 py-2 font-display text-sm text-ink disabled:opacity-50">{pending ? t("saving") : t("save")}</button>
            {ratings.own && <button type="button" disabled={pending} onClick={handleDelete} className="rounded border border-danger px-4 py-2 font-display text-sm text-danger disabled:opacity-50">{t("delete")}</button>}
          </div>
          {notice && <p role="status" className="font-data text-sm text-petrol-hover">{t(notice)}</p>}
           {errorCode && <p role="alert" className="font-data text-sm text-danger">{tErrors(`${errorCode}.description`)}</p>}
        </form>
      ) : (
        <p className="font-body text-paper-muted"><Link href="/auth/login" className="text-amber underline">{t("loginToRate")}</Link></p>
      )}
    </section>
  );
}
