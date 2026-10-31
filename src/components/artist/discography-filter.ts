// Filtro personal de la discografía (openspec: refine-artist-page-phase3, design D3): "Sin valorar" y "Tuyos" atenúan
// los demás discos en lugar de esconderlos, para que la discografía no cambie de forma. El panel "Tu relación" lo activa
// desde otra zona de la página con un evento; desde otra pestaña, llega como `?filter=unrated` a la Discografía.

export type DiscographyFilter = "all" | "unrated" | "yours";

export const DISCOGRAPHY_FILTER_EVENT = "artist-discography-filter";

/** Anclaje de la sección de la discografía (también lo usa el panel para saber si está en la página). */
export const DISCOGRAPHY_ANCHOR = "discography";

export function isDiscographyFilter(value: unknown): value is DiscographyFilter {
  return value === "all" || value === "unrated" || value === "yours";
}

/** Filtro pedido en la dirección (`?filter=`), o "all". */
export function filterFromSearch(search: string): DiscographyFilter {
  const value = new URLSearchParams(search).get("filter");
  return isDiscographyFilter(value) ? value : "all";
}
