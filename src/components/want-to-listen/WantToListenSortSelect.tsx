"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { WANT_TO_LISTEN_SORTS, type WantToListenSort } from "@/lib/api/schemas";

// Orden de Pendientes con el mismo marco, alto y tipografía que los segmentos de tipo y el conmutador de modo, para
// que la barra se lea como una sola fila de controles. El nombre ("Orden") va dentro del marco, no encima.
export function WantToListenSortSelect({
  value,
  onChange,
}: {
  value: WantToListenSort;
  onChange: (value: WantToListenSort) => void;
}) {
  const t = useTranslations("wantToListen");
  const id = useId();
  return (
    <div className="relative flex shrink-0 items-center gap-1.5 rounded-md border border-ink-border py-0.5 pl-2.5 pr-0.5 [@media(pointer:coarse)]:min-h-12">
      <label htmlFor={id} className="font-data text-xs text-paper-muted/70">
        {t("sortLabel")}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as WantToListenSort)}
        className="filter-select cursor-pointer appearance-none rounded bg-transparent py-1.5 pl-1.5 pr-6 font-data text-xs text-paper transition-colors hover:text-amber [@media(pointer:coarse)]:min-h-11"
      >
        {WANT_TO_LISTEN_SORTS.map((sort) => (
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
