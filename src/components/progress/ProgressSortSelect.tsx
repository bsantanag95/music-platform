"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";

// Orden de un listado de /me/progress con la etiqueta dentro del marco, calcado de `ListSortSelect` (openspec:
// redesign-progress-toolbar, D6). Cada pestaña pasa sus opciones; las etiquetas salen de `camino.sortOption.*`.
export function ProgressSortSelect<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}) {
  const t = useTranslations("camino");
  const id = useId();
  return (
    <div className="relative flex shrink-0 items-center gap-1.5 rounded-md border border-ink-border py-0.5 pl-2.5 pr-0.5 [@media(pointer:coarse)]:min-h-12">
      {/* En pantallas angostas la etiqueta queda solo para lectores de pantalla: así el orden cabe junto al conmutador. */}
      <label htmlFor={id} className="sr-only font-data text-xs text-paper-muted/70 sm:not-sr-only">
        {t("sortLabel")}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="filter-select cursor-pointer appearance-none rounded bg-transparent py-1.5 pl-1.5 pr-6 font-data text-xs text-paper transition-colors hover:text-amber [@media(pointer:coarse)]:min-h-11"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {t(`sortOption.${option}` as "sortOption.recent")}
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
