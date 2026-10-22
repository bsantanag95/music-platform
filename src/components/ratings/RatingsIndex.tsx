"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatStars } from "@/components/album/album-format";
import { StarRatingDisplay } from "@/components/social/StarRatingDisplay";
import { RatingScore } from "./RatingScore";
import { ratingHref, typeLabelKey } from "./ratings-shared";
import type { RatingsRendererProps } from "./ratings-view";

const HEAD = "px-2 py-1.5 text-left font-data text-[0.65rem] font-normal uppercase tracking-wide text-paper-muted/70";

// Modo Índice (openspec: redesign-ratings-views): una tabla real para escanear una lista larga sin
// carátulas. Las columnas — título, tipo, año, estrellas y nota — quedan alineadas de una fila a otra. Los
// encabezados se ven desde `sm` y solo los oye un lector de pantalla debajo. El título lleva el artista como
// subtítulo (bajo `sm`, en una segunda línea; desde `sm`, en la misma); tipo y año aparecen en pantallas
// anchas, y el tipo solo cuando el encabezado de la sección no lo dice. El puntaje (o el guion de "sin
// afinar") abre el diálogo de puntaje.
export function RatingsIndex({ entries, actions, display }: RatingsRendererProps) {
  const t = useTranslations("ratings");
  const locale = useLocale();

  return (
    <table className="w-full border-collapse">
      <thead className="sr-only sm:not-sr-only">
        <tr className="border-b border-ink-border">
          <th scope="col" className={HEAD}>
            {t("colTitle")}
          </th>
          {display.showType ? (
            <th scope="col" className={`${HEAD} hidden sm:table-cell`}>
              {t("colType")}
            </th>
          ) : null}
          <th scope="col" className={`${HEAD} hidden sm:table-cell`}>
            {t("colYear")}
          </th>
          <th scope="col" className={HEAD}>
            {t("colStars")}
          </th>
          <th scope="col" className={`${HEAD} text-right`}>
            {t("colScore")}
          </th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => {
          const { target } = entry;
          const starsLabel = t("starValue", { value: formatStars(entry.stars, locale) });
          return (
            <tr
              key={entry.id}
              className="border-b border-ink-border transition-colors last:border-b-0 hover:bg-ink-surface"
            >
              <td className="w-full max-w-0 px-2 py-2">
                <Link
                  href={ratingHref(entry)}
                  className="block font-display text-sm text-paper transition-colors hover:text-amber sm:truncate"
                >
                  <span className="block truncate sm:inline">{target.title}</span>
                  {display.showArtist && target.artistName ? (
                    <span className="block truncate font-data text-xs text-paper-muted sm:ml-1.5 sm:inline">
                      {target.artistName}
                    </span>
                  ) : null}
                </Link>
              </td>
              {display.showType ? (
                <td className="hidden whitespace-nowrap px-2 py-2 font-data text-xs text-paper-muted sm:table-cell">
                  {t(typeLabelKey(entry.targetType))}
                </td>
              ) : null}
              <td className="hidden whitespace-nowrap px-2 py-2 font-data text-xs tabular-nums text-paper-muted sm:table-cell">
                {target.year ?? ""}
              </td>
              <td className="whitespace-nowrap px-2 py-2">
                <StarRatingDisplay value={entry.stars} label={starsLabel} />
              </td>
              <td className="whitespace-nowrap px-1 py-1 text-right">
                <RatingScore
                  entry={entry}
                  onEdit={actions.onEdit}
                  ariaLabel={
                    entry.detailedScore !== null
                      ? t("editRatingFor", { title: target.title })
                      : t("untunedAction")
                  }
                  className="w-16"
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
