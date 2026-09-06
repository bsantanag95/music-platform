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
  group: "none",
};

export function collectionFiltersActive(filters: CollectionFiltersState): boolean {
  return Boolean(
    filters.q.trim() ||
      filters.format ||
      filters.attribute ||
      filters.sort !== "recent" ||
      filters.group !== "none",
  );
}

interface CollectionToolbarProps {
  filters: CollectionFiltersState;
  onChange: (next: CollectionFiltersState) => void;
  searchInput: string;
  onSearchInput: (value: string) => void;
  onClear: () => void;
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
        <FilterSelect
          value={filters.sort}
          onChange={(value) => onChange({ ...filters, sort: value as CollectionSort })}
          ariaLabel={t("sortLabel")}
          widthClassName="w-[12ch]"
        >
          <option value="recent">{t("sort.recent")}</option>
          <option value="alpha">{t("sort.alpha")}</option>
          <option value="artist">{t("sort.artist")}</option>
          <option value="format">{t("sort.format")}</option>
        </FilterSelect>
        <FilterSelect
          value={filters.group}
          onChange={(value) => onChange({ ...filters, group: value as CollectionGrouping })}
          ariaLabel={t("groupLabel")}
          widthClassName="w-[13ch]"
        >
          <option value="none">{t("group.none")}</option>
          <option value="format">{t("group.format")}</option>
          <option value="artist">{t("group.artist")}</option>
        </FilterSelect>
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
