"use client";

import { useTranslations } from "next-intl";
import type { FavoriteCounts, SocialTargetType } from "@/lib/api/schemas";

interface FavoritesTypeSegmentsProps {
  /** Tipo activo o `""` para todos. */
  value: SocialTargetType | "";
  onChange: (value: SocialTargetType | "") => void;
  /** Cantidad por tipo, calculada sin el filtro de tipo (`counts`). */
  counts: FavoriteCounts;
}

// Filtro de tipo como control segmentado con la cantidad de cada uno (openspec:
// redesign-favorites-summary-toolbar). Botones con `aria-pressed`: el segmento activo no se desactiva al
// pulsarlo de nuevo, para volver a todos se elige "Todo".
export function FavoritesTypeSegments({ value, onChange, counts }: FavoritesTypeSegmentsProps) {
  const t = useTranslations("favorites");
  const options: { value: SocialTargetType | ""; label: string; count: number }[] = [
    { value: "", label: t("typeSegmentAll"), count: counts.artist + counts["release-group"] + counts.recording },
    { value: "artist", label: t("sectionArtists"), count: counts.artist },
    { value: "release-group", label: t("sectionAlbums"), count: counts["release-group"] },
    { value: "recording", label: t("sectionSongs"), count: counts.recording },
  ];

  return (
    <div
      role="group"
      aria-label={t("typeFilterLabel")}
      className="flex shrink-0 flex-wrap items-center gap-1 rounded-md border border-ink-border p-0.5"
    >
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value || "all"}
            type="button"
            aria-pressed={selected}
            onClick={() => {
              if (!selected) onChange(option.value);
            }}
            className={`inline-flex items-center justify-center gap-1.5 rounded px-2.5 py-1.5 font-data text-xs transition-colors [@media(pointer:coarse)]:min-h-11 ${
              selected ? "bg-amber/10 text-amber" : "text-paper-muted hover:text-paper"
            }`}
          >
            {option.label}
            <span className={selected ? "text-amber/80" : "text-paper-muted/70"}>{option.count}</span>
          </button>
        );
      })}
    </div>
  );
}
