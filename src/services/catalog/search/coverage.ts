// Emparejamiento flexible artista + título (openspec: redesign-scoped-search,
// capacidad search-query-matching).
//
// La persona no tiene que separar artista y título: las palabras de la
// consulta pueden repartirse entre ambos, en cualquier orden. En vez de
// adivinar dónde corta el artista (la heurística anterior elegía el nombre
// más largo contenido en la consulta y fallaba con "dokken kiss of death"),
// cada candidato se clasifica por cuánto de la consulta explica.

import { tokenize } from "./normalize";

/**
 * Nivel de cobertura, del mejor al peor:
 * 1. un artista acreditado ocupa el inicio o el final de la consulta y el
 *    resto es exactamente el título, o la consulta completa es el nombre de
 *    un artista acreditado (quien escribe "pink floyd" busca sus discos);
 * 2. el título es exactamente la consulta completa (sin contar un artículo
 *    inicial: "dark side of the moon" = "The Dark Side of the Moon");
 * 3. todas las palabras aparecen en título ∪ artistas;
 * 4. cobertura parcial.
 */
export type CoverageLevel = 1 | 2 | 3 | 4;

export interface EdgeSplit {
  /** Tokens que ocuparía el artista. */
  artistTokens: string[];
  /** Tokens restantes (el título). */
  restTokens: string[];
  side: "start" | "end";
}

/**
 * Todas las formas de partir la consulta en (artista, resto) con el artista
 * en un extremo y un resto no vacío. Para 4 tokens son 6 particiones: el
 * costo es trivial y permite consultar artistas locales con un solo `IN`.
 */
export function edgeSplits(queryTokens: string[]): EdgeSplit[] {
  const splits: EdgeSplit[] = [];
  for (let size = 1; size < queryTokens.length; size++) {
    splits.push({
      artistTokens: queryTokens.slice(0, size),
      restTokens: queryTokens.slice(size),
      side: "start",
    });
    splits.push({
      artistTokens: queryTokens.slice(queryTokens.length - size),
      restTokens: queryTokens.slice(0, queryTokens.length - size),
      side: "end",
    });
  }
  return splits;
}

function sameTokens(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((token, index) => token === b[index]);
}

const LEADING_ARTICLES = new Set(["the", "a", "an", "el", "la", "los", "las", "un", "una", "le", "les", "der", "die", "das"]);

/** Quita un artículo inicial si queda al menos una palabra. */
function withoutLeadingArticle(tokens: string[]): string[] {
  const [first, ...rest] = tokens;
  return first !== undefined && rest.length > 0 && LEADING_ARTICLES.has(first) ? rest : tokens;
}

/** Resto de la consulta si `artistName` ocupa uno de sus extremos; null si no. */
export function restAfterEdgeArtist(queryTokens: string[], artistName: string): string[] | null {
  const artistTokens = tokenize(artistName);
  if (artistTokens.length === 0 || artistTokens.length >= queryTokens.length) return null;
  for (const split of edgeSplits(queryTokens)) {
    if (sameTokens(split.artistTokens, artistTokens)) return split.restTokens;
  }
  return null;
}

export function coverageLevel(
  query: string,
  title: string,
  artistNames: readonly string[],
): CoverageLevel {
  const queryTokens = tokenize(query);
  const titleTokens = tokenize(title);
  if (queryTokens.length === 0) return 4;

  for (const name of artistNames) {
    const rest = restAfterEdgeArtist(queryTokens, name);
    if (rest && sameTokens(rest, titleTokens)) return 1;
  }
  // La consulta es el nombre del artista: todos sus discos (también el autotitulado). Un disco que
  // solo se llama como la consulta, de otro artista, es una coincidencia de título (nivel 2).
  for (const name of artistNames) {
    if (sameTokens(queryTokens, tokenize(name))) return 1;
  }
  if (sameTokens(queryTokens, titleTokens)) return 2;
  if (sameTokens(withoutLeadingArticle(queryTokens), withoutLeadingArticle(titleTokens))) return 2;

  const covered = new Set([...titleTokens, ...artistNames.flatMap((name) => tokenize(name))]);
  if (queryTokens.every((token) => covered.has(token))) return 3;
  return 4;
}
