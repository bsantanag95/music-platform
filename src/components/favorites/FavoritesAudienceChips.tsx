"use client";

import { useTranslations } from "next-intl";
import type { DiaryAudience, FavoriteAudienceFacet } from "@/lib/api/schemas";

interface FavoritesAudienceChipsProps {
  /** Audiencia activa o `""`. */
  value: DiaryAudience | "";
  onChange: (value: DiaryAudience | "") => void;
  /** Cantidad por audiencia, calculada sin el filtro de audiencia (`facets.audience`). */
  facet: FavoriteAudienceFacet;
}

const ORDER: DiaryAudience[] = ["public", "followers", "private"];

// Filtro de audiencia como tres fichas con la cantidad de cada una (openspec:
// redesign-favorites-summary-toolbar): dicen cómo se reparte lo que compartes. Botones con `aria-pressed` que
// alternan: pulsar la ficha activa quita el filtro.
export function FavoritesAudienceChips({ value, onChange, facet }: FavoritesAudienceChipsProps) {
  const t = useTranslations("favorites");

  return (
    <div role="group" aria-label={t("audienceFilterLabel")} className="flex flex-wrap items-center gap-1.5">
      {ORDER.map((audience) => {
        const active = value === audience;
        return (
          <button
            key={audience}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? "" : audience)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-data text-xs transition-colors [@media(pointer:coarse)]:min-h-11 ${
              active
                ? "border-amber bg-amber/10 text-amber"
                : "border-ink-border text-paper-muted hover:border-paper-muted/40 hover:text-paper"
            }`}
          >
            {t(`audience.${audience}`)}
            <span className={active ? "text-amber/80" : "text-paper-muted/70"}>{facet[audience]}</span>
          </button>
        );
      })}
    </div>
  );
}
