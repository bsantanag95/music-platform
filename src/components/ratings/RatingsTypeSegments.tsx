"use client";

import { useTranslations } from "next-intl";
import type { MyRatingsCounts } from "@/lib/api/schemas";

interface RatingsTypeSegmentsProps {
  /** Tipo activo (`"release-group"` / `"recording"`) o `""` para todos. */
  value: string;
  onChange: (value: string) => void;
  /** Cantidad por tipo, calculada sin el filtro de tipo (`facets.types`). */
  counts: MyRatingsCounts;
}

// Filtro de tipo como control segmentado con la cantidad de cada uno (openspec:
// redesign-ratings-header-toolbar). Son botones con `aria-pressed`: el segmento activo no se desactiva al
// pulsarlo de nuevo, para volver a todos se elige "Todo". Los artistas no se valoran, así que no hay segmento.
export function RatingsTypeSegments({ value, onChange, counts }: RatingsTypeSegmentsProps) {
  const t = useTranslations("ratings");
  const options = [
    { value: "", label: t("typeSegmentAll"), count: counts["release-group"] + counts.recording },
    { value: "release-group", label: t("sectionAlbums"), count: counts["release-group"] },
    { value: "recording", label: t("sectionSongs"), count: counts.recording },
  ];

  return (
    <div
      role="group"
      aria-label={t("typeFilterLabel")}
      className="flex shrink-0 items-center gap-1 rounded-md border border-ink-border p-0.5"
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
