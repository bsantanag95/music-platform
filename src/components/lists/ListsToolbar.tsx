"use client";

import { useTranslations } from "next-intl";
import { FilterSelect } from "@/components/ui/FilterSelect";
import type { ListEntityType, ListSort } from "@/lib/api/schemas";
import { entityTypeKey } from "./lists-shared";
import type { ListFiltersState } from "./use-list-filters";

const ENTITY_TYPES: ListEntityType[] = ["artist", "release-group", "recording"];
const SORTS: ListSort[] = ["recent", "alpha"];

interface ListsToolbarProps {
  filters: ListFiltersState;
  onChange: (update: (current: ListFiltersState) => ListFiltersState) => void;
  searchInput: string;
  onSearchInput: (value: string) => void;
  isFiltered: boolean;
  onClear: () => void;
  /** "Buscar en tus listas" en la gestión propia, "Buscar listas" en un perfil ajeno. */
  searchPlaceholder: string;
}

// Buscador + filtro de tipo + orden de un listado de listas. Presentacional:
// el estado vive en `useListFilters`.
export function ListsToolbar({
  filters,
  onChange,
  searchInput,
  onSearchInput,
  isFiltered,
  onClear,
  searchPlaceholder,
}: ListsToolbarProps) {
  const t = useTranslations("lists");

  return (
    <div className="flex flex-col gap-2">
      <input
        type="search"
        value={searchInput}
        onChange={(e) => onSearchInput(e.target.value)}
        placeholder={searchPlaceholder}
        aria-label={searchPlaceholder}
        className="w-full rounded-md border border-ink-border bg-ink-surface px-3.5 py-2 font-data text-sm text-paper placeholder:text-paper-muted"
      />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <FilterSelect
          value={filters.entityType}
          onChange={(v) => onChange((c) => ({ ...c, entityType: v as ListEntityType | "" }))}
          ariaLabel={t("typeFilterLabel")}
          widthClassName="w-[20ch]"
        >
          <option value="">{t("filterAllTypes")}</option>
          {ENTITY_TYPES.map((type) => (
            <option key={type} value={type}>
              {t(entityTypeKey(type))}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          value={filters.sort}
          onChange={(v) => onChange((c) => ({ ...c, sort: v as ListSort }))}
          ariaLabel={t("sortLabel")}
          widthClassName="w-[13ch]"
        >
          {SORTS.map((sort) => (
            <option key={sort} value={sort}>
              {t(`sort.${sort}`)}
            </option>
          ))}
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
