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
import { RatingScore } from "./RatingScore";
import type { MyRatingEntry } from "@/lib/api/schemas";

interface MyRatingRowProps {
  entry: MyRatingEntry;
  onUpdate: (id: string, entry: MyRatingEntry) => void;
  /** Abre el diálogo de puntaje (elevado al orquestador) con la valoración de la fila. */
  onEdit: (entry: MyRatingEntry) => void;
  /** El artista y el tipo se omiten cuando el encabezado de la sección ya los dice. */
  showArtist?: boolean;
  showType?: boolean;
  /** Carga la carátula sin diferirla (las filas de arriba, sin scroll). */
  priority?: boolean;
}

export function MyRatingRow({
  entry,
  onUpdate,
  onEdit,
  showArtist = true,
  showType = true,
  priority = false,
}: MyRatingRowProps) {
  const t = useTranslations("ratings");
  const locale = useLocale();
  const [busy, setBusy] = useState(false);
  const [scoreRemovedMsg, setScoreRemovedMsg] = useState("");
  const [saveFailed, setSaveFailed] = useState(false);

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
    setSaveFailed(false);
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
      // Las estrellas quedan como estaban (no se llamó a `onUpdate`): se avisa y se puede reintentar.
      setSaveFailed(true);
    } finally {
      setBusy(false);
    }
  }

  const showMeta = (showArtist && Boolean(target.artistName)) || showType;

  // Fila compacta (la separa de la siguiente un divisor de `RatingsDetailed`, no un hueco): desde `sm` el
  // título, las estrellas y el puntaje (de ancho fijo, alineado entre filas) comparten línea; en angostas
  // el puntaje sube junto al título y las estrellas ocupan la línea de abajo, en vez de bajar el puntaje
  // a una tercera línea. La carátula se achica desde `sm`.
  return (
    <article className="flex items-start gap-3 py-2 sm:items-center" aria-busy={busy}>
      <CoverThumb cover={target.coverThumbUrl} label={coverLabel} className="size-12 sm:size-10" priority={priority} />

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 sm:flex sm:flex-row sm:gap-3">
          <div className="flex min-w-0 flex-col gap-0.5 sm:flex-1">
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

          <div className="col-span-2 row-start-2 sm:col-auto sm:row-auto">
            <StarRatingInput
              size="sm"
              value={entry.stars}
              onChange={handleStarsChange}
              legend={t("starsLegend", { title: entry.target.title })}
              valueLabel={(value) => t("starValue", { value: formatStars(value, locale) })}
              disabled={busy}
            />
          </div>

          <RatingScore
            entry={entry}
            onEdit={onEdit}
            ariaLabel={entry.detailedScore !== null ? `${entry.detailedScore}/100` : t("untunedAction")}
            className="col-start-2 row-start-1 w-16 sm:col-auto sm:row-auto [@media(pointer:coarse)]:-my-2"
          />
        </div>

        {saveFailed ? (
          <p role="alert" className="font-data text-xs text-danger">
            {t("saveError")}
          </p>
        ) : null}

        {scoreRemovedMsg ? (
          <p role="status" className="font-data text-xs text-paper-muted">
            {scoreRemovedMsg}
          </p>
        ) : null}
      </div>
    </article>
  );
}
