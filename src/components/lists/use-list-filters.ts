"use client";

import { useEffect, useMemo, useState } from "react";
import type { ListFiltersParams } from "@/lib/api/lists";
import type { ListEntityType, ListSort } from "@/lib/api/schemas";

export interface ListFiltersState {
  q: string;
  entityType: ListEntityType | "";
  sort: ListSort;
}

export const EMPTY_LIST_FILTERS: ListFiltersState = { q: "", entityType: "", sort: "recent" };

function toParams(filters: ListFiltersState): ListFiltersParams {
  return {
    q: filters.q.trim() || undefined,
    entityType: filters.entityType || undefined,
    sort: filters.sort === "recent" ? undefined : filters.sort,
  };
}

// Estado de los filtros de un listado de listas (buscador con debounce, tipo,
// orden) y su forma como parámetros de API. Lo comparten `/me/lists`
// (`MyListsTab`) y el listado de un perfil ajeno (`ListsList`) para que el
// mismo buscador se comporte igual en ambos.
export function useListFilters() {
  const [filters, setFilters] = useState<ListFiltersState>(EMPTY_LIST_FILTERS);
  const [searchInput, setSearchInput] = useState("");

  // Debounce del buscador: espera a que el usuario deje de tipear.
  useEffect(() => {
    const id = window.setTimeout(() => {
      setFilters((current) => (current.q === searchInput ? current : { ...current, q: searchInput }));
    }, 300);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  const isFiltered = Boolean(filters.q.trim() || filters.entityType || filters.sort !== "recent");
  const params = useMemo(() => toParams(filters), [filters]);

  const clear = () => {
    setSearchInput("");
    setFilters(EMPTY_LIST_FILTERS);
  };

  return { filters, setFilters, searchInput, setSearchInput, isFiltered, params, clear };
}
