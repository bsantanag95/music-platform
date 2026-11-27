// Cifra de resultados que muestra la búsqueda (openspec: redesign-search-phase1, design D5). El total de
// MusicBrainz no cuenta lo que solo está en el catálogo propio: con «radiohed» informa 0 mientras la lista trae
// ocho artistas locales. La cifra nunca es menor que lo listado.

/** El mayor entre el total informado (si lo hay) y la cantidad listada. */
export function displayCount(total: number | null | undefined, listed: number): number {
  return Math.max(total ?? 0, listed);
}
