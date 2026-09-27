// Regla de redirección por coincidencia exacta única (estilo Metal Archives,
// openspec: redesign-scoped-search). Pura: la usan la página /search y sus
// tests sin tocar la base.

import type { ArtistSearchResponse, ArtistSearchResult } from "./types";

/**
 * El único artista cuyo nombre es exactamente la consulta, o null si hay
 * homónimos, ninguno, o si la pata de MusicBrainz falló (sin ella no se puede
 * saber si hay homónimos).
 */
export function uniqueExactArtist(response: ArtistSearchResponse): ArtistSearchResult | null {
  if (response.remoteFailed) return null;
  const exact = response.results.filter((result) => result.exact);
  return exact.length === 1 ? exact[0]! : null;
}
