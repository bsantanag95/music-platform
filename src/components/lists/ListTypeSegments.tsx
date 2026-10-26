"use client";

import { useTranslations } from "next-intl";
import type { ListEntityType, ListTypeCounts } from "@/lib/api/schemas";
import { entityTypeKey } from "./lists-shared";

const TYPES: ListEntityType[] = ["release-group", "artist", "recording"];

// Filtro de tipo de un listado de listas como control segmentado con la cantidad de cada uno, calcado de
// `WantToListenTypeSegments` (openspec: redesign-me-lists-toolbar, D6). Botones con `aria-pressed`; un tipo sin listas
// queda deshabilitado salvo que esté activo. Las cifras vienen de `counts`, contadas sin filtros.
export function ListTypeSegments({
  value,
  onChange,
  counts,
}: {
  /** Tipo activo o `""` para todos. */
  value: ListEntityType | "";
  onChange: (value: ListEntityType | "") => void;
  counts: ListTypeCounts;
}) {
  const t = useTranslations("lists");
  const options: { value: ListEntityType | ""; label: string; count: number }[] = [
    { value: "", label: t("typeSegmentAll"), count: counts.artist + counts["release-group"] + counts.recording },
    ...TYPES.map((type) => ({ value: type, label: t(entityTypeKey(type)), count: counts[type] })),
  ];

  return (
    <div
      role="group"
      aria-label={t("typeFilterLabel")}
      className="order-last flex w-full items-center gap-1 rounded-md border border-ink-border p-0.5 sm:order-none sm:w-auto sm:shrink-0"
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
            className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded px-2 py-1.5 sm:flex-none sm:px-2.5 font-data text-xs transition-colors disabled:opacity-40 [@media(pointer:coarse)]:min-h-11 ${
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
