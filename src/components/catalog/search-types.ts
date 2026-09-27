// Vocabulario de tipos de búsqueda (openspec: redesign-scoped-search). Módulo
// sin "use client" para que lo compartan la página /search (Server Component,
// que lee `?type=`), el buscador del Header y el de la página.

import type { SearchType } from "@/services/catalog/search/types";

export type { SearchType };
export { DEFAULT_SEARCH_TYPE, SEARCH_TYPES, parseSearchType } from "@/services/catalog/search/params";

/** URL de resultados de un tipo; `extra` agrega filtros o `all=1`. */
export function searchHref(
  type: SearchType,
  query: string,
  extra: Record<string, string | number | undefined> = {},
): string {
  const params = new URLSearchParams({ type, q: query });
  for (const [key, value] of Object.entries(extra)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  return `/search?${params.toString()}`;
}
