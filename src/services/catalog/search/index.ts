// Búsqueda del catálogo por tipo (openspec: redesign-scoped-search). Punto de
// entrada único para la página /search y GET /api/catalog/search: cada
// búsqueda ejecuta UN tipo, con su propio presupuesto de MusicBrainz.
//
// `signal` (openspec: speed-up-quick-actions-search): si quien buscó abandona, las
// requests a MusicBrainz que aún esperan turno se descartan y la búsqueda no escribe.

import { searchAlbums } from "./albums";
import { searchArtists } from "./artists";
import type { CatalogSearchParams } from "./params";
import { searchSongs } from "./songs";
import type { CatalogSearchResponse } from "./types";

export function searchCatalogByType(
  { type, q, offset, artistType, category, decade, filters, purpose }: CatalogSearchParams,
  signal?: AbortSignal,
): Promise<CatalogSearchResponse> {
  // `filters` solo trae los del tipo pedido (openspec: add-advanced-search-phase1).
  if (type === "artist") return searchArtists(q, { artistType, filters, signal });
  if (type === "album") return searchAlbums(q, { category, decade, ...filters, offset, signal });
  return searchSongs(q, { offset, purpose, filters, signal });
}

export { searchAlbums, searchArtists, searchSongs };
export { uniqueExactArtist } from "./exact";
export * from "./types";
