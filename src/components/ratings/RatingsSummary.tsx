"use client";

import { useLocale, useTranslations } from "next-intl";
import { formatStars } from "@/components/album/album-format";
import type { MyRatingsCounts, MyRatingsStarsBucket } from "@/lib/api/schemas";
import { averageStars } from "./ratings-shared";

interface RatingsSummaryProps {
  total: number;
  counts: MyRatingsCounts;
  /** Hay búsqueda o filtros que reducen el conjunto: la cabecera cuenta resultados, no la biblioteca. */
  narrowed: boolean;
  /** Diez cubos de ½★ (`facets.stars`), calculados sin el filtro de estrellas. */
  stars: MyRatingsStarsBucket[];
  /** Filtro de estrellas activo (`"4.5"`) o `""`. */
  starsFilter: string;
  onStarsChange: (value: string) => void;
}

// Altura máxima de una barra del histograma, en px; la más alta la usa entera.
const BAR_MAX_PX = 36;
const BAR_MIN_PX = 3;

// Resumen bajo el título (openspec: redesign-ratings-header-toolbar): el total y el desglose por tipo
// (con los contadores honestos de la Fase 1), el promedio del conjunto visible y un histograma de diez
// barras de media estrella que además filtra: cada barra es un botón que activa o quita `stars`.
// El promedio sale de las mismas facetas que el histograma, así que nunca discrepan.
export function RatingsSummary({ total, counts, narrowed, stars, starsFilter, onStarsChange }: RatingsSummaryProps) {
  const t = useTranslations("ratings");
  const locale = useLocale();
  const average = averageStars(stars, starsFilter ? Number(starsFilter) : undefined);
  const peak = Math.max(...stars.map((bucket) => bucket.count), 0);
  // Con la biblioteca vacía no hay distribución que mostrar; con un filtro activo siempre se muestra,
  // para poder quitarlo aunque el resto de las barras esté en cero.
  const showHistogram = peak > 0 || starsFilter !== "";

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-1">
        <p className="font-data text-xs text-paper-muted">
          <span>{narrowed ? t("resultsLabel", { count: total }) : t("totalLabel", { count: total })}</span>
          {total > 0 ? (
            <>
              <span aria-hidden> · </span>
              <span>{t("countAlbums", { count: counts["release-group"] })}</span>
              <span aria-hidden> · </span>
              <span>{t("countSongs", { count: counts.recording })}</span>
            </>
          ) : null}
        </p>
        {average !== null ? (
          <p className="font-display text-xl text-paper">{t("averageLabel", { value: formatStars(average, locale) })}</p>
        ) : null}
      </div>

      {showHistogram ? (
        <div role="group" aria-label={t("histogramLabel")} className="flex w-full items-end gap-1 sm:w-auto">
          {stars.map((bucket) => {
            const key = String(bucket.value);
            const active = starsFilter === key;
            const whole = Number.isInteger(bucket.value);
            const height = bucket.count === 0 ? BAR_MIN_PX : Math.max(BAR_MIN_PX, Math.round((bucket.count / peak) * BAR_MAX_PX));
            return (
              <button
                key={key}
                type="button"
                aria-pressed={active}
                aria-label={t("histogramBar", { value: formatStars(bucket.value, locale), count: bucket.count })}
                onClick={() => onStarsChange(key)}
                className={`flex min-w-0 flex-1 flex-col items-center justify-end gap-1 rounded px-0.5 pb-0.5 pt-1 font-data transition-colors hover:bg-ink-surface sm:w-7 sm:flex-none [@media(pointer:coarse)]:min-h-11 ${
                  active ? "bg-amber/10" : ""
                }`}
              >
                <span className={`text-[0.65rem] leading-none ${bucket.count > 0 ? "text-paper-muted" : "text-transparent"}`} aria-hidden>
                  {bucket.count}
                </span>
                <span
                  aria-hidden
                  className={`block w-full rounded-sm ${active ? "bg-amber" : starsFilter ? "bg-paper-muted/20" : "bg-paper-muted/50"}`}
                  style={{ height }}
                />
                <span className={`text-[0.65rem] leading-none ${active ? "text-amber" : "text-paper-muted"}`} aria-hidden>
                  {whole ? `${bucket.value}★` : " "}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
