"use client";

import { useTranslations } from "next-intl";
import type { WantToListenCounts, WantToListenTargetType } from "@/lib/api/schemas";

interface WantToListenTypeSegmentsProps {
  /** Tipo activo o `""` para todos. */
  value: WantToListenTargetType | "";
  onChange: (value: WantToListenTargetType | "") => void;
  /** Cantidad por tipo, calculada sin el filtro de tipo (`counts`). */
  counts: WantToListenCounts;
}

// Filtro de tipo como control segmentado con la cantidad de cada uno, calcado de
// `FavoritesTypeSegments` (openspec: redesign-want-to-listen-toolbar). Botones con `aria-pressed`: el
// activo no se desactiva al pulsarlo de nuevo; un tipo sin entradas queda deshabilitado salvo que esté
// activo.
export function WantToListenTypeSegments({ value, onChange, counts }: WantToListenTypeSegmentsProps) {
  const t = useTranslations("wantToListen");
  const options: { value: WantToListenTargetType | ""; label: string; count: number }[] = [
    { value: "", label: t("typeSegmentAll"), count: counts.artist + counts["release-group"] },
    { value: "artist", label: t("sectionArtists"), count: counts.artist },
    { value: "release-group", label: t("sectionAlbums"), count: counts["release-group"] },
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
            disabled={!selected && option.count === 0}
            onClick={() => {
              if (!selected) onChange(option.value);
            }}
            className={`inline-flex items-center justify-center gap-1.5 rounded px-2.5 py-1.5 font-data text-xs transition-colors disabled:opacity-40 [@media(pointer:coarse)]:min-h-11 ${
              selected ? "bg-amber/10 text-amber" : "text-paper-muted enabled:hover:text-paper"
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
