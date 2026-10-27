"use client";

import { useTranslations } from "next-intl";
import { OWN_STATES, type OwnStateFilter } from "./progress-tabs";

// Filtro de estado de Discografías y Listas para completar como control segmentado con la cantidad de cada estado,
// calcado de `ListTypeSegments` (openspec: redesign-progress-toolbar, D5). Botones con `aria-pressed`; un estado sin
// entradas queda deshabilitado salvo que esté activo. Las cifras cuentan todas las entradas, sin la búsqueda. En un
// teléfono ocupan su propia fila y se desplazan si no caben.
export function ProgressStateSegments({
  value,
  onChange,
  counts,
}: {
  value: OwnStateFilter;
  onChange: (value: OwnStateFilter) => void;
  /** Cantidad por estado; `all` es el total. */
  counts: Record<OwnStateFilter, number>;
}) {
  const t = useTranslations("camino");

  return (
    <div
      role="group"
      aria-label={t("stateFilterLabel")}
      className="flex w-full items-stretch gap-0.5 rounded-md border border-ink-border p-0.5 sm:w-auto sm:gap-1 sm:self-start"
    >
      {OWN_STATES.map((state) => {
        const selected = value === state;
        return (
          <button
            key={state}
            type="button"
            aria-pressed={selected}
            disabled={!selected && counts[state] === 0}
            onClick={() => {
              if (!selected) onChange(state);
            }}
            // En un teléfono la cifra va debajo de la etiqueta para que los cuatro estados quepan en una fila.
            className={`inline-flex min-w-0 flex-1 flex-col items-center justify-center whitespace-nowrap rounded px-1 py-1 font-data text-xs leading-tight transition-colors disabled:opacity-40 sm:flex-none sm:flex-row sm:gap-1.5 sm:px-2.5 sm:py-1.5 [@media(pointer:coarse)]:min-h-11 ${
              selected ? "bg-amber/10 text-amber" : "text-paper-muted enabled:hover:text-paper"
            }`}
          >
            {t(`stateSegment.${state}`)}{" "}
            <span className={selected ? "text-amber/80" : "text-paper-muted/70"}>{counts[state]}</span>
          </button>
        );
      })}
    </div>
  );
}
