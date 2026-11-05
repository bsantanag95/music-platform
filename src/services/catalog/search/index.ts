// Búsqueda del catálogo por tipo (openspec: redesign-scoped-search). Punto de
// entrada único para la página /search y GET /api/catalog/search: cada
// búsqueda ejecuta UN tipo, con su propio presupuesto de MusicBrainz.
//
// `signal` (openspec: speed-up-quick-actions-search): si quien buscó abandona, las
// requests a MusicBrainz que aún esperan turno se descartan y la búsqueda no escribe.

import { searchAlbums } from "./albums";
import { searchArtists } from "./artists";
import { albumCatalogFilters, albumOptions, artistCatalogFilters, artistFilters, songFilters } from "./filters";
import type { CatalogSearchParams } from "./params";
import { searchSongs } from "./songs";
import type { CatalogSearchResponse } from "./types";

export function searchCatalogByType(
  { type, q, offset, decade, criteria, purpose }: CatalogSearchParams,
  signal?: AbortSignal,
): Promise<CatalogSearchResponse> {
  if (type === "artist") {
    return searchArtists(q, { filters: artistFilters(criteria), catalog: artistCatalogFilters(criteria), offset, signal });
  }
  if (type === "album") {
    return searchAlbums(q, { ...albumOptions(criteria), catalog: albumCatalogFilters(criteria), decade, offset, signal });
  }
  return searchSongs(q, { offset, purpose, filters: songFilters(criteria), signal });
}

export { searchAlbums, searchArtists, searchSongs };
export { uniqueExactArtist } from "./exact";
export * from "./types";
