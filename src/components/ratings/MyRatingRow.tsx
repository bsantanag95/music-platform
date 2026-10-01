"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { StarRatingInput } from "@/components/social/StarRatingInput";
import { RatingDetailDialog } from "@/components/album/RatingDetailDialog";
import { albumHref, songHref, artistHref } from "@/lib/catalog-links";
import { formatStars } from "@/components/album/album-format";
import { isScoreCoherent } from "@/lib/rating-range";
import { saveRating } from "@/lib/api/social";
import type { RatingsResponse } from "@/lib/api/schemas";
import type { MyRatingEntry } from "@/lib/api/schemas";

interface MyRatingRowProps {
  entry: MyRatingEntry;
  onUpdate: (id: string, entry: MyRatingEntry) => void;
  onDelete: (id: string) => void;
}

export function MyRatingRow({ entry, onUpdate, onDelete }: MyRatingRowProps) {
  const t = useTranslations("ratings");
  const locale = useLocale();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [scoreRemovedMsg, setScoreRemovedMsg] = useState("");

  const { target } = entry;
  const coverLabel = target.title;
  const titleHref =
    entry.targetType === "release-group"
      ? albumHref(target.artistName, target.title, target.id)
      : songHref(target.artistName, target.title, target.id);
  const artistLink =
    target.artistName && target.artistId
      ? artistHref(target.artistName, target.artistId)
      : null;

  const typeLabel = entry.targetType === "release-group" ? t("typeAlbum") : t("typeSong");

  async function handleStarsChange(newStars: number) {
    if (newStars === entry.stars) return;
    setBusy(true);
    setScoreRemovedMsg("");
    const keptScore = isScoreCoherent(newStars, entry.detailedScore) ? entry.detailedScore : null;
    const removedScore = entry.detailedScore !== null && !isScoreCoherent(newStars, entry.detailedScore)
      ? entry.detailedScore
      : null;
    try {
      await saveRating(
        entry.targetType,
        target.id,
        { stars: newStars, detailedScore: keptScore ?? undefined },
      );
      onUpdate(entry.id, {
        ...entry,
        stars: newStars,
        detailedScore: keptScore,
        updatedAt: new Date().toISOString(),
      });
      if (removedScore !== null) {
        setScoreRemovedMsg(t("scoreRemoved", { score: removedScore }));
      }
    } catch {
      // silencioso: el usuario puede reintentar
    } finally {
      setBusy(false);
    }
  }

  function handleDialogChange(ratings: RatingsResponse) {
    if (ratings.own) {
      onUpdate(entry.id, {
        ...entry,
        stars: ratings.own.stars,
        detailedScore: ratings.own.detailedScore,
        updatedAt: ratings.own.updatedAt,
      });
    } else {
      onDelete(entry.id);
    }
  }

  const ownForDialog: RatingsResponse["own"] = {
    id: entry.id,
    stars: entry.stars,
    detailedScore: entry.detailedScore,
    createdAt: entry.updatedAt,
    updatedAt: entry.updatedAt,
  };

  return (
    <article className="flex items-start gap-3" aria-busy={busy}>
      <CoverThumb cover={target.coverThumbUrl} label={coverLabel} className="size-12" />

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-baseline gap-2">
          <Link
            href={titleHref}
            className="truncate font-display text-sm text-paper hover:underline"
          >
            {target.title}
          </Link>
          {target.year ? (
            <span className="shrink-0 font-data text-xs text-paper-muted">{target.year}</span>
          ) : null}
        </div>

        <div className="flex items-center gap-2 font-data text-xs text-paper-muted">
          {artistLink ? (
            <Link href={artistLink} className="truncate hover:text-paper hover:underline">
              {target.artistName}
            </Link>
          ) : target.artistName ? (
            <span className="truncate">{target.artistName}</span>
          ) : null}
          <span aria-hidden>·</span>
          <span>{typeLabel}</span>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <StarRatingInput
              value={entry.stars}
              onChange={handleStarsChange}
              legend={t("starsLegend", { title: entry.target.title })}
              valueLabel={(value) => t("starValue", { value: formatStars(value, locale) })}
              disabled={busy}
            />
          </div>

          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className={`rounded px-2 py-1 font-data text-xs transition-colors ${
              entry.detailedScore !== null
                ? "text-paper-muted hover:text-paper"
                : "text-paper-muted italic underline decoration-dotted hover:text-paper"
            }`}
            aria-label={entry.detailedScore !== null ? `${entry.detailedScore}/100` : t("untunedAction")}
          >
            {entry.detailedScore !== null ? `${entry.detailedScore}/100` : t("untuned")}
          </button>
        </div>

        {scoreRemovedMsg ? (
          <p role="status" className="font-data text-xs text-paper-muted">
            {scoreRemovedMsg}
          </p>
        ) : null}
      </div>

      <RatingDetailDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        target={{ type: entry.targetType, id: target.id }}
        own={ownForDialog}
        onChange={handleDialogChange}
      />
    </article>
  );
}
