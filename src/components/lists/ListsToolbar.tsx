"use client";

import { useTranslations } from "next-intl";
import { FilterSelect } from "@/components/ui/FilterSelect";
import type { ListEntityType, ListSort, ListTypeCounts } from "@/lib/api/schemas";
import { entityTypeKey } from "./lists-shared";
import { ListSortSelect } from "./ListSortSelect";
import { ListTypeSegments } from "./ListTypeSegments";
import type { ListFiltersState } from "./use-list-filters";

const ENTITY_TYPES: ListEntityType[] = ["artist", "release-group", "recording"];

interface ListsToolbarProps {
  filters: ListFiltersState;
  onChange: (update: (current: ListFiltersState) => ListFiltersState) => void;
  searchInput: string;
  onSearchInput: (value: string) => void;
  isFiltered: boolean;
  onClear: () => void;
  /** "Buscar en tus listas" en la gestión propia, "Buscar listas" en un perfil ajeno. */
  searchPlaceholder: string;
  /** Cifras por tipo (Mis listas, Guardadas): con ellas el tipo es un control segmentado; sin ellas, un selector. */
  counts?: ListTypeCounts;
}

// Buscador + filtro de tipo + orden de un listado de listas, en una sola fila que se parte en pantallas angostas.
// Presentacional: el estado vive en `useListFilters` (openspec: redesign-me-lists-toolbar, D6).
export function ListsToolbar({
  filters,
  onChange,
  searchInput,
  onSearchInput,
  isFiltered,
  onClear,
  searchPlaceholder,
  counts,
}: ListsToolbarProps) {
  const t = useTranslations("lists");
  const setType = (v: ListEntityType | "") => onChange((c) => ({ ...c, entityType: v }));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="search"
        autoComplete="off"
        value={searchInput}
        onChange={(e) => onSearchInput(e.target.value)}
        placeholder={searchPlaceholder}
        aria-label={searchPlaceholder}
        className="min-h-9 min-w-0 flex-[1_1_10rem] rounded-md border border-ink-border bg-ink-surface px-3.5 py-1.5 font-data text-sm text-paper placeholder:text-paper-muted [@media(pointer:coarse)]:min-h-12"
      />
      {counts ? (
        <ListTypeSegments value={filters.entityType} onChange={setType} counts={counts} />
      ) : (
        <FilterSelect
          value={filters.entityType}
          onChange={(v) => setType(v as ListEntityType | "")}
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
      )}
      <ListSortSelect value={filters.sort} onChange={(sort: ListSort) => onChange((c) => ({ ...c, sort }))} />
      {isFiltered ? (
        <button
          type="button"
          onClick={onClear}
          className="min-h-8 px-1 font-data text-xs text-paper-muted transition-colors hover:text-paper [@media(pointer:coarse)]:min-h-11"
        >
          {t("clearFilters")}
        </button>
      ) : null}
    </div>
  );
}
