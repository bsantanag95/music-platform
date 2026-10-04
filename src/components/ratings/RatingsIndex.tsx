"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatStars } from "@/components/album/album-format";
import { StarRatingDisplay } from "@/components/social/StarRatingDisplay";
import { ratingHref, typeLabelKey } from "./ratings-shared";
import type { RatingsRendererProps } from "./ratings-view";

// Modo Índice: filas de texto compactas para escanear una lista larga, sin carátulas —
// mismo tratamiento que `FavoritesIndex`. El título lleva el artista como subtítulo; tipo y
// año aparecen en pantallas anchas; la nota va a la derecha y su puntaje (o "Sin afinar")
// abre el diálogo de puntaje.
export function RatingsIndex({ entries, actions, display }: RatingsRendererProps) {
  const t = useTranslations("ratings");
  const locale = useLocale();

  return (
    <ul className="flex flex-col">
      {entries.map((entry) => {
        const { target } = entry;
        const starsLabel = t("starValue", { value: formatStars(entry.stars, locale) });
        return (
          <li
            key={entry.id}
            className="flex items-center gap-3 rounded-md border-b border-ink-border px-2 py-2 transition-colors last:border-b-0 hover:bg-ink-surface"
          >
            <Link
              href={ratingHref(entry)}
              className="min-w-0 flex-1 truncate font-display text-sm text-paper transition-colors hover:text-amber"
            >
              {target.title}
              {display.showArtist && target.artistName ? (
                <span className="ml-1.5 font-data text-xs text-paper-muted">{target.artistName}</span>
              ) : null}
            </Link>

            {display.showType || target.year ? (
              <span className="hidden shrink-0 font-data text-xs text-paper-muted sm:inline">
                {[display.showType ? t(typeLabelKey(entry.targetType)) : null, target.year]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            ) : null}

            <StarRatingDisplay value={entry.stars} label={starsLabel} />

            <button
              type="button"
              onClick={() => actions.onEdit(entry)}
              aria-label={
                entry.detailedScore !== null
                  ? t("editRatingFor", { title: target.title })
                  : t("untunedAction")
              }
              className={`w-20 shrink-0 whitespace-nowrap rounded px-1 py-0.5 text-right font-data text-xs transition-colors ${
                entry.detailedScore !== null
                  ? "text-paper-muted hover:text-paper"
                  : "italic text-paper-muted underline decoration-dotted hover:text-paper"
              }`}
            >
              {entry.detailedScore !== null ? `${entry.detailedScore}/100` : t("untuned")}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
