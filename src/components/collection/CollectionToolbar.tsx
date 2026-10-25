"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { EDITION_ATTRIBUTES } from "@/services/collection/vocabulary";
import type { CollectionFormat, EditionAttribute } from "@/services/collection/vocabulary";
import type { CollectionGrouping, CollectionSort } from "@/services/collection/types";
import { ToolbarSelect } from "./ToolbarSelect";

export interface CollectionFiltersState {
  q: string;
  format: CollectionFormat | "";
  attribute: EditionAttribute | "";
  sort: CollectionSort;
  group: CollectionGrouping;
}

export const EMPTY_COLLECTION_FILTERS: CollectionFiltersState = {
  q: "",
  format: "",
  attribute: "",
  sort: "recent",
  group: "none",
};

export function collectionFiltersActive(filters: CollectionFiltersState): boolean {
  return Boolean(filters.q.trim() || filters.format || toolbarFiltersActive(filters) > 0);
}

/**
 * Filtros que viven detrás de "Filtros" en pantallas angostas (edición, agrupación y orden distintos del defecto).
 * El buscador y el formato quedan a la vista, así que no cuentan.
 */
export function toolbarFiltersActive(filters: CollectionFiltersState): number {
  return (
    (filters.attribute ? 1 : 0) +
    (filters.group !== EMPTY_COLLECTION_FILTERS.group ? 1 : 0) +
    (filters.sort !== EMPTY_COLLECTION_FILTERS.sort ? 1 : 0)
  );
}

interface CollectionToolbarProps {
  filters: CollectionFiltersState;
  onChange: (next: CollectionFiltersState) => void;
  searchInput: string;
  onSearchInput: (value: string) => void;
  onClear: () => void;
}

const SORT_OPTIONS: CollectionSort[] = ["recent", "alpha", "artist", "format"];
const GROUP_OPTIONS: CollectionGrouping[] = ["none", "artist", "format", "date"];

/**
 * Oculta del "Ordenar" la opción que coincide con el "Agrupar" activo: dentro
 * de un grupo por artista, todos los elementos ya comparten artista, así que
 * "Por artista" no aporta un orden distinto — mismo caso para formato. La
 * opción ya elegida se conserva igual para que el `<select>` nunca quede sin
 * ninguna coincidiendo con su `value` (ver el reseteo en el `onChange` de
 * Agrupar, que la saca de en medio apenas deja de tener sentido).
 */
function availableSortOptions(filters: CollectionFiltersState): CollectionSort[] {
  return SORT_OPTIONS.filter((option) => option !== filters.group || option === filters.sort);
}

// Barra de la estantería en una sola fila (openspec: redesign-collection-header-toolbar, D5): buscador (con debounce
// en el orquestador) y Edición, Agrupar y Orden con la etiqueta dentro. El modo de vista y "Seleccionar" van en la
// fila del retrato por formato. El formato se elige con los segmentos del encabezado. En pantallas angostas Edición, Agrupar y Orden
// quedan detrás de "Filtros", que dice cuántos hay activos. Agrupar va antes que Ordenar: define las secciones, y
// Ordenar solo la secuencia dentro de cada una.
export function CollectionToolbar({
  filters,
  onChange,
  searchInput,
  onSearchInput,
  onClear,
}: CollectionToolbarProps) {
  const t = useTranslations("collection");
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const active = toolbarFiltersActive(filters);
  const isFiltered = collectionFiltersActive(filters);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="search"
        autoComplete="off"
        value={searchInput}
        onChange={(event) => onSearchInput(event.target.value)}
        placeholder={t("searchPlaceholder")}
        aria-label={t("searchPlaceholder")}
        className="h-10 min-w-0 flex-1 basis-48 rounded-md border border-ink-border bg-ink-surface px-3.5 font-data text-sm text-paper placeholder:text-paper-muted [@media(pointer:coarse)]:h-11"
      />

      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md border px-3 font-data text-xs transition-colors sm:hidden [@media(pointer:coarse)]:h-11 ${
          open || active > 0 ? "border-amber text-amber" : "border-ink-border text-paper-muted"
        }`}
      >
        {t("filtersButton")}
        {active > 0 ? (
          <>
            {" "}
            <span className="tabular-nums">{active}</span>
          </>
        ) : null}
      </button>

      <div
        id={panelId}
        className={`${open ? "flex" : "hidden"} w-full flex-wrap items-center gap-2 sm:flex sm:w-auto`}
      >
        <ToolbarSelect
          label={t("editionLabel")}
          value={filters.attribute}
          onChange={(value) => onChange({ ...filters, attribute: value as EditionAttribute | "" })}
        >
          <option value="">{t("allEditions")}</option>
          {EDITION_ATTRIBUTES.map((attribute) => (
            <option key={attribute} value={attribute}>
              {t(`attribute.${attribute}`)}
            </option>
          ))}
        </ToolbarSelect>
        <ToolbarSelect
          label={t("groupLabel")}
          value={filters.group}
          onChange={(value) => {
            const group = value as CollectionGrouping;
            // La opción de orden que coincide con el nuevo grupo deja de tener sentido (ver
            // `availableSortOptions`): si era la elegida, cae al defecto en vez de quedar elegida pero oculta.
            const sort = filters.sort === group ? "recent" : filters.sort;
            onChange({ ...filters, group, sort });
          }}
        >
          {GROUP_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {t(`group.${option}`)}
            </option>
          ))}
        </ToolbarSelect>
        <ToolbarSelect
          label={t("sortLabel")}
          value={filters.sort}
          onChange={(value) => onChange({ ...filters, sort: value as CollectionSort })}
        >
          {availableSortOptions(filters).map((option) => (
            <option key={option} value={option}>
              {t(`sort.${option}`)}
            </option>
          ))}
        </ToolbarSelect>
      </div>

      {isFiltered ? (
        <button
          type="button"
          onClick={onClear}
          className="basis-full text-left font-data text-xs text-paper-muted underline decoration-dotted transition-colors hover:text-paper sm:basis-auto [@media(pointer:coarse)]:min-h-11"
        >
          {t("clearFilters")}
        </button>
      ) : null}
    </div>
  );
}
