// Búsqueda del catálogo por tipo (openspec: redesign-scoped-search). Punto de
// entrada único para la página /search y GET /api/catalog/search: cada
// búsqueda ejecuta UN tipo, con su propio presupuesto de MusicBrainz.

import { searchAlbums } from "./albums";
import { searchArtists } from "./artists";
import type { CatalogSearchParams } from "./params";
import { searchSongs } from "./songs";
import type { CatalogSearchResponse } from "./types";

export function searchCatalogByType({
  type,
  q,
  offset,
  artistType,
  category,
  decade,
}: CatalogSearchParams): Promise<CatalogSearchResponse> {
  if (type === "artist") return searchArtists(q, { artistType });
  if (type === "album") return searchAlbums(q, { category, decade, offset });
  return searchSongs(q, { offset });
}

export { searchAlbums, searchArtists, searchSongs };
export { uniqueExactArtist } from "./exact";
export * from "./types";
