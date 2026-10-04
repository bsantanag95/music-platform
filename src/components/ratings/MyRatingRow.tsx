"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { StarRatingInput } from "@/components/social/StarRatingInput";
import { albumHref, songHref, artistHref } from "@/lib/catalog-links";
import { formatStars } from "@/components/album/album-format";
import { isScoreCoherent } from "@/lib/rating-range";
import { saveRating } from "@/lib/api/social";
import type { MyRatingEntry } from "@/lib/api/schemas";

interface MyRatingRowProps {
  entry: MyRatingEntry;
  onUpdate: (id: string, entry: MyRatingEntry) => void;
  /** Abre el diálogo de puntaje (elevado al orquestador) con la valoración de la fila. */
  onEdit: (entry: MyRatingEntry) => void;
  /** El artista y el tipo se omiten cuando el encabezado de la sección ya los dice. */
  showArtist?: boolean;
  showType?: boolean;
}

export function MyRatingRow({ entry, onUpdate, onEdit, showArtist = true, showType = true }: MyRatingRowProps) {
  const t = useTranslations("ratings");
  const locale = useLocale();
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

  const showMeta = (showArtist && Boolean(target.artistName)) || showType;

  // Fila compacta: en pantallas anchas el título y la nota comparten línea (≈ el alto de la
  // carátula); en angostas la nota baja bajo el título.
  return (
    <article className="flex items-start gap-3 sm:items-center" aria-busy={busy}>
      <CoverThumb cover={target.coverThumbUrl} label={coverLabel} className="size-12" />

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
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

            {showMeta ? (
              <div className="flex items-center gap-2 font-data text-xs text-paper-muted">
                {showArtist && artistLink ? (
                  <Link href={artistLink} className="truncate hover:text-paper hover:underline">
                    {target.artistName}
                  </Link>
                ) : showArtist && target.artistName ? (
                  <span className="truncate">{target.artistName}</span>
                ) : null}
                {showArtist && target.artistName && showType ? <span aria-hidden>·</span> : null}
                {showType ? <span>{typeLabel}</span> : null}
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <StarRatingInput
              size="sm"
              value={entry.stars}
              onChange={handleStarsChange}
              legend={t("starsLegend", { title: entry.target.title })}
              valueLabel={(value) => t("starValue", { value: formatStars(value, locale) })}
              disabled={busy}
            />

            <button
              type="button"
              onClick={() => onEdit(entry)}
              className={`w-20 whitespace-nowrap rounded px-2 py-1 text-left font-data text-xs transition-colors ${
                entry.detailedScore !== null
                  ? "text-paper-muted hover:text-paper"
                  : "text-paper-muted italic underline decoration-dotted hover:text-paper"
              }`}
              aria-label={entry.detailedScore !== null ? `${entry.detailedScore}/100` : t("untunedAction")}
            >
              {entry.detailedScore !== null ? `${entry.detailedScore}/100` : t("untuned")}
            </button>
          </div>
        </div>

        {scoreRemovedMsg ? (
          <p role="status" className="font-data text-xs text-paper-muted">
            {scoreRemovedMsg}
          </p>
        ) : null}
      </div>
    </article>
  );
}
