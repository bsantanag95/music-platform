// Principal y secundarios de los géneros de un álbum (openspec: add-genre-votes, capabilities
// `genre-display` y `genre-votes`). Regla pura, sin base de datos: la usan las cabeceras y el
// panel de votación.

export type GenreRank = "primary" | "secondary" | "other";

/** Un secundario alcanza al menos esta fracción del puntaje del principal (y nunca menos de 1). */
export const SECONDARY_RATIO = 0.5;

/** Votantes distintos desde los que se publican las cifras de votos (privacidad del voto). */
export const MIN_VOTERS_FOR_COUNTS = 5;

/**
 * Clasifica géneros ya ordenados por puntaje descendente: el primero es el principal, los que
 * alcanzan `max(1, SECONDARY_RATIO × principal)` son secundarios y el resto "otros". Los heredados
 * no tienen puntaje propio y no se clasifican (todos "other").
 */
export function rankGenres<T extends { score: number; inherited: boolean }>(
  genres: readonly T[],
): Array<T & { rank: GenreRank }> {
  const principal = genres.find((g) => !g.inherited);
  const threshold = principal ? Math.max(1, principal.score * SECONDARY_RATIO) : Infinity;
  return genres.map((g) => {
    if (g.inherited) return { ...g, rank: "other" as const };
    if (g === principal) return { ...g, rank: "primary" as const };
    return { ...g, rank: g.score >= threshold ? ("secondary" as const) : ("other" as const) };
  });
}
