"use client";

import { useTranslations } from "next-intl";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { COLLECTION_FORMATS, EDITION_ATTRIBUTES } from "@/services/collection/vocabulary";
import type { CollectionFormat, EditionAttribute } from "@/services/collection/vocabulary";
import type { CollectionGrouping, CollectionSort } from "@/services/collection/types";

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
  group: "artist",
};

export function collectionFiltersActive(filters: CollectionFiltersState): boolean {
  return Boolean(
    filters.q.trim() ||
      filters.format ||
      filters.attribute ||
      filters.sort !== "recent" ||
      filters.group !== "artist",
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

// Barra de herramientas de la estantería: buscador (con debounce en el
// orquestador) más selects livianos de formato, atributo, orden y agrupación.
// Misma disposición que /me/favorites y /me/diary.
export function CollectionToolbar({
  filters,
  onChange,
  searchInput,
  onSearchInput,
  onClear,
}: CollectionToolbarProps) {
  const t = useTranslations("collection");
  const isFiltered = collectionFiltersActive(filters);

  return (
    <div className="flex flex-col gap-2">
      <input
        type="search"
        value={searchInput}
        onChange={(event) => onSearchInput(event.target.value)}
        placeholder={t("searchPlaceholder")}
        aria-label={t("searchPlaceholder")}
        className="w-full rounded-md border border-ink-border bg-ink-surface px-3.5 py-2 font-data text-sm text-paper placeholder:text-paper-muted"
      />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <FilterSelect
          value={filters.format}
          onChange={(value) => onChange({ ...filters, format: value as CollectionFormat | "" })}
          ariaLabel={t("filterFormatLabel")}
          widthClassName="w-[20ch]"
        >
          <option value="">{t("allFormats")}</option>
          {COLLECTION_FORMATS.map((format) => (
            <option key={format} value={format}>
              {t(`format.${format}`)}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          value={filters.attribute}
          onChange={(value) =>
            onChange({ ...filters, attribute: value as EditionAttribute | "" })
          }
          ariaLabel={t("filterAttributeLabel")}
          widthClassName="w-[21ch]"
        >
          <option value="">{t("allAttributes")}</option>
          {EDITION_ATTRIBUTES.map((attribute) => (
            <option key={attribute} value={attribute}>
              {t(`attribute.${attribute}`)}
            </option>
          ))}
        </FilterSelect>
        {/* Agrupar va antes que Ordenar: define la estructura externa (las
            secciones), mientras que Ordenar solo decide la secuencia de los
            elementos DENTRO de cada grupo — el orden de lectura izquierda a
            derecha reflejar esa jerarquía evita que se lean como dos formas
            redundantes de "lo mismo". La etiqueta visible de cada uno refuerza
            la distinción sin depender de que se infiera del texto de las
            opciones (antes solo vivía en el `aria-label`, invisible). */}
        <div className="flex items-center gap-1">
          <span aria-hidden className="font-data text-xs text-paper-muted">
            {t("groupLabel")}
          </span>
          <FilterSelect
            value={filters.group}
            onChange={(value) => {
              const group = value as CollectionGrouping;
              // La opción de orden que coincide con el nuevo grupo deja de
              // tener sentido (ver `availableSortOptions`): si era la
              // elegida, cae al default en vez de quedar seleccionada pero
              // oculta.
              const sort = filters.sort === group ? "recent" : filters.sort;
              onChange({ ...filters, group, sort });
            }}
            ariaLabel={t("groupLabel")}
            widthClassName="w-[13ch]"
          >
            <option value="artist">{t("group.artist")}</option>
            <option value="format">{t("group.format")}</option>
            <option value="date">{t("group.date")}</option>
          </FilterSelect>
        </div>
        <div className="flex items-center gap-1">
          <span aria-hidden className="font-data text-xs text-paper-muted">
            {t("sortLabel")}
          </span>
          <FilterSelect
            value={filters.sort}
            onChange={(value) => onChange({ ...filters, sort: value as CollectionSort })}
            ariaLabel={t("sortLabel")}
            widthClassName="w-[12ch]"
          >
            {availableSortOptions(filters).map((option) => (
              <option key={option} value={option}>
                {t(`sort.${option}`)}
              </option>
            ))}
          </FilterSelect>
        </div>
        {isFiltered ? (
          <button
            type="button"
            onClick={onClear}
            className="font-data text-xs text-paper-muted transition-colors hover:text-paper"
          >
            {t("clearFilters")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
