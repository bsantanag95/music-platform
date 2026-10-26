"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import type { ListSort } from "@/lib/api/schemas";

const SORTS: ListSort[] = ["recent", "alpha"];

// Orden de un listado de listas con el mismo marco y alto que los segmentos de tipo, con la etiqueta dentro, calcado de
// `WantToListenSortSelect` (openspec: redesign-me-lists-toolbar, D6).
export function ListSortSelect({ value, onChange }: { value: ListSort; onChange: (value: ListSort) => void }) {
  const t = useTranslations("lists");
  const id = useId();
  return (
    <div className="relative flex shrink-0 items-center gap-1.5 rounded-md border border-ink-border py-0.5 pl-2.5 pr-0.5 [@media(pointer:coarse)]:min-h-12">
      {/* En pantallas angostas la etiqueta queda solo para lectores de pantalla: así el orden cabe junto al buscador. */}
      <label htmlFor={id} className="sr-only font-data text-xs text-paper-muted/70 sm:not-sr-only">
        {t("sortLabel")}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as ListSort)}
        className="filter-select cursor-pointer appearance-none rounded bg-transparent py-1.5 pl-1.5 pr-6 font-data text-xs text-paper transition-colors hover:text-amber [@media(pointer:coarse)]:min-h-11"
      >
        {SORTS.map((sort) => (
          <option key={sort} value={sort}>
            {t(`sort.${sort}`)}
          </option>
        ))}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-paper-muted"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </div>
  );
}
