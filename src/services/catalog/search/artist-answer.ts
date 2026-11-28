// Respuesta de la búsqueda de Artistas (openspec: redesign-search-phase2, design D1). Elige qué se destaca arriba por
// presencia en el catálogo, no por la posición: con «pink» la primera coincidencia exacta es un grupo japonés sin discos,
// y Pink Floyd (233 discos) quedaba séptimo.
//
// 1. Exacto con discos → el que más discos tiene (empate: el primero en el orden).
// 2. Si no, los del catálogo con ≥ 2 discos cuyo nombre contiene todas las palabras de la consulta (los dos de más
//    discos) y el primer exacto → «¿Cuál «x» buscas?»; con un solo candidato y sin exacto, respuesta «más cercana».
// 3. Si no, el primer exacto, como antes. Sin exactos, nada que destacar.

import { tokenize } from "./normalize";
import type { ArtistSearchResult } from "./types";

/** Por qué un artista está arriba: discos en el catálogo, nombre idéntico o el más cercano del catálogo. */
export type AnswerReason = "catalog" | "identical" | "closest";

export interface ArtistCandidate {
  artist: ArtistSearchResult;
  reason: AnswerReason;
}

export type ArtistAnswer =
  | { kind: "answer"; candidate: ArtistCandidate }
  | { kind: "choice"; candidates: ArtistCandidate[] }
  | { kind: "none" };

/** Discos mínimos para entrar en la elección: deja fuera los proyectos de un solo disco. */
export const CHOICE_MIN_DISCS = 2;
/** Artistas del catálogo en la elección (más el homónimo exacto). */
export const CHOICE_CATALOG_LIMIT = 2;

const discs = (artist: ArtistSearchResult) => artist.discCount ?? 0;

/** El nombre contiene todas las palabras de la consulta (tokenizadas como en el resto de la búsqueda). */
export function nameContainsQuery(name: string, query: string): boolean {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return false;
  const nameTokens = new Set(tokenize(name));
  return queryTokens.every((token) => nameTokens.has(token));
}

/** El de más discos; ante un empate, el primero en el orden recibido (estable). */
function mostDiscs(artists: ArtistSearchResult[]): ArtistSearchResult | undefined {
  return artists.reduce<ArtistSearchResult | undefined>((best, artist) => (!best || discs(artist) > discs(best) ? artist : best), undefined);
}

export function pickArtistAnswer(query: string, results: readonly ArtistSearchResult[]): ArtistAnswer {
  const exact = results.filter((artist) => artist.exact);

  const exactWithDiscs = mostDiscs(exact.filter((artist) => discs(artist) >= 1));
  if (exactWithDiscs) return { kind: "answer", candidate: { artist: exactWithDiscs, reason: "catalog" } };

  const catalog = results
    .filter((artist) => !artist.exact && discs(artist) >= CHOICE_MIN_DISCS && nameContainsQuery(artist.name, query))
    .map((artist, index) => ({ artist, index }))
    // Más discos primero; a igual cantidad, el orden del tipo.
    .sort((a, b) => discs(b.artist) - discs(a.artist) || a.index - b.index)
    .slice(0, CHOICE_CATALOG_LIMIT)
    .map(({ artist }): ArtistCandidate => ({ artist, reason: "catalog" }));
  const firstExact = exact[0];

  if (catalog.length > 0) {
    if (!firstExact && catalog.length === 1) return { kind: "answer", candidate: { artist: catalog[0]!.artist, reason: "closest" } };
    const candidates = firstExact ? [...catalog, { artist: firstExact, reason: "identical" as const }] : catalog;
    return { kind: "choice", candidates };
  }

  if (firstExact) return { kind: "answer", candidate: { artist: firstExact, reason: "identical" } };
  return { kind: "none" };
}

/** Ids que ya están arriba (respuesta o elección), para no repetirlos en las listas de abajo. */
export function answeredIds(answer: ArtistAnswer): Set<string> {
  if (answer.kind === "answer") return new Set([answer.candidate.artist.id]);
  if (answer.kind === "choice") return new Set(answer.candidates.map((candidate) => candidate.artist.id));
  return new Set();
}
