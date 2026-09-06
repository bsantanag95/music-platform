// Vocabulario de pestañas de /search. Módulo sin "use client" para que tanto
// la página (Server Component, que lee `?type=` de la URL) como `SearchResults`
// (client, que filtra la lista ya resuelta) lo compartan.

export type SearchTab = "all" | "artists" | "albums";
export const SEARCH_TABS: SearchTab[] = ["all", "artists", "albums"];

export function parseSearchTab(value: string | string[] | undefined): SearchTab {
  return SEARCH_TABS.includes(value as SearchTab) ? (value as SearchTab) : "all";
}
