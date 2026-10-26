"use client";

import { useEffect, useMemo, useState } from "react";
import type { ListFiltersParams } from "@/lib/api/lists";
import type { ListEntityType, ListSort } from "@/lib/api/schemas";

export interface ListFiltersState {
  q: string;
  entityType: ListEntityType | "";
  sort: ListSort;
}

function writeFiltersToUrl(filters: ListFiltersState) {
  const params = new URLSearchParams(window.location.search);
  params.delete("q");
  params.delete("type");
  params.delete("sort");
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.entityType) params.set("type", filters.entityType);
  if (filters.sort !== "recent") params.set("sort", filters.sort);
  const query = params.toString();
  const next = `${window.location.pathname}${query ? `?${query}` : ""}`;
  if (next !== `${window.location.pathname}${window.location.search}`) {
    window.history.replaceState(window.history.state, "", next);
  }
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
//
// Con `syncUrl` (solo `/me/lists`) los filtros se escriben en la URL —`q`, `type`, `sort`, solo lo que difiere del
// defecto— con `replaceState`, sin crear historial, y conservando el resto (`tab`); la página los lee al abrir
// (openspec: refine-me-lists-page-phase1, D7).
export function useListFilters(initial?: Partial<ListFiltersState>, { syncUrl = false }: { syncUrl?: boolean } = {}) {
  const [filters, setFilters] = useState<ListFiltersState>(() => ({ ...EMPTY_LIST_FILTERS, ...initial }));
  const [searchInput, setSearchInput] = useState(() => initial?.q ?? "");

  useEffect(() => {
    if (syncUrl) writeFiltersToUrl(filters);
  }, [filters, syncUrl]);

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
