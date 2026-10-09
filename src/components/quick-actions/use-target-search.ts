"use client";

import { useEffect, useState } from "react";
import { getSearchSuggestions, searchAlbums, searchArtists, searchSongs } from "@/lib/api/catalog";
import type { CatalogSearchResponse, ReleaseGroupCategory, SearchSuggestion } from "@/lib/api/schemas";
import type { PickerType, PickTarget } from "./types";

/** Coincidencias locales: responden en ~0,1 s y nunca salen a MusicBrainz. */
const LOCAL_DEBOUNCE_MS = 150;
/** Búsqueda completa: pasa por la cola de MusicBrainz, así que espera a que se deje de escribir. */
const REMOTE_DEBOUNCE_MS = 500;
export const TARGET_SEARCH_MIN_LENGTH = 2;
/** Con dos letras MusicBrainz devuelve ruido y la consulta casi siempre queda obsoleta. */
const REMOTE_MIN_LENGTH = 3;

/**
 * Candidato con el año y la categoría del álbum, solo para mostrar (no viajan en el objetivo). La
 * categoría solo la trae la búsqueda completa: una sugerencia local llega sin ella.
 */
export interface TargetCandidate extends PickTarget {
  year: number | null;
  category: ReleaseGroupCategory | null;
}

/** Resultado de una fase, etiquetado con la consulta que lo produjo. */
interface Phase {
  key: string;
  status: "loading" | "done" | "error";
  candidates: TargetCandidate[];
}

const SUGGESTION_KIND: Record<PickerType, SearchSuggestion["kind"]> = {
  album: "album",
  song: "song",
  artist: "artist",
};

function words(text: string): string[] {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

/**
 * Cada palabra de la consulta está en el título o en el artista; la última puede ser un prefijo
 * (se está escribiendo). Las sugerencias de canción comparan solo el título, de forma difusa: con
 * "metallica one" traían "String Metallica" o "Metall" antes que «One» de Metallica.
 */
function coversQuery(query: string, title: string, artistName: string | null): boolean {
  const queryWords = words(query);
  const known = [...words(title), ...words(artistName ?? "")];
  return queryWords.every((word, index) =>
    index === queryWords.length - 1 ? known.some((candidate) => candidate.startsWith(word)) : known.includes(word),
  );
}

function fromSuggestions(suggestions: SearchSuggestion[], type: PickerType, query: string): TargetCandidate[] {
  // En Artistas las sugerencias también traen álbumes (puente artista + título): fuera de lugar aquí.
  return suggestions
    .filter((suggestion) => suggestion.kind === SUGGESTION_KIND[type])
    .filter((suggestion) => suggestion.kind !== "song" || coversQuery(query, suggestion.title, suggestion.artistName))
    .flatMap((suggestion): TargetCandidate[] => {
      if (suggestion.kind === "artist") {
        return [
          { type: "artist", id: suggestion.id, title: suggestion.name, subtitle: suggestion.disambiguation, year: null, category: null },
        ];
      }
      if (suggestion.kind === "album") {
        return [
          {
            type: "release-group",
            id: suggestion.id,
            title: suggestion.title,
            subtitle: suggestion.artistName,
            year: suggestion.year,
            category: null,
          },
        ];
      }
      if (suggestion.kind === "song") {
        return [{ type: "recording", id: suggestion.id, title: suggestion.title, subtitle: suggestion.artistName, year: null, category: null }];
      }
      return [];
    });
}

function fromSearch(response: CatalogSearchResponse): TargetCandidate[] {
  if (response.type === "album") {
    return response.results.map(
      (r): TargetCandidate => ({
        type: "release-group",
        id: r.id,
        title: r.title,
        subtitle: r.artistName,
        year: r.year,
        category: r.category,
      }),
    );
  }
  if (response.type === "artist") {
    return response.results.map(
      (r): TargetCandidate => ({ type: "artist", id: r.id, title: r.name, subtitle: r.disambiguation, year: null, category: null }),
    );
  }
  // Canciones: solo la canción con grabación identidad es registrable (en modo de elección, todas).
  return response.results.flatMap((group): TargetCandidate[] =>
    group.recordingId
      ? [{ type: "recording", id: group.recordingId, title: group.title, subtitle: group.artistName, year: null, category: null }]
      : [],
  );
}

function searchByType(
  type: PickerType,
  query: string,
  signal: AbortSignal,
  category: ReleaseGroupCategory | undefined,
): Promise<CatalogSearchResponse> {
  if (type === "album") return searchAlbums(query, { signal, category });
  if (type === "song") return searchSongs(query, { purpose: "pick", signal });
  return searchArtists(query, { signal });
}

/**
 * Una fase de la búsqueda: espera `delay` tras la última tecla y aborta la solicitud anterior al
 * cambiar el texto o el tipo, o al desmontarse (el servidor libera así su turno en la cola de
 * MusicBrainz). Solo cuenta el resultado cuya `key` coincide con la consulta vigente.
 */
function usePhase(
  key: string,
  enabled: boolean,
  delay: number,
  run: (signal: AbortSignal) => Promise<TargetCandidate[]>,
): Phase | null {
  const [phase, setPhase] = useState<Phase | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const id = setTimeout(() => {
      setPhase({ key, status: "loading", candidates: [] });
      run(controller.signal)
        .then((candidates) => {
          if (!controller.signal.aborted) setPhase({ key, status: "done", candidates });
        })
        .catch(() => {
          if (!controller.signal.aborted) setPhase({ key, status: "error", candidates: [] });
        });
    }, delay);
    return () => {
      clearTimeout(id);
      controller.abort();
    };
    // `run` se deriva de `key`: la clave basta para relanzar la fase.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, delay]);
  return phase?.key === key ? phase : null;
}

export interface TargetSearchOptions {
  /** Acota la búsqueda completa de álbumes a una categoría (p. ej. solo de estudio). */
  category?: ReleaseGroupCategory;
}

export interface TargetSearch {
  /** Consulta recortada con la que se busca. */
  query: string;
  /** Hay texto suficiente para buscar. */
  searchable: boolean;
  candidates: TargetCandidate[];
  /** Falta alguna de las dos fases por terminar. */
  pending: boolean;
  /** La fase que cuenta terminó con error. */
  failed: boolean;
}

/**
 * Búsqueda de objetivos compartida por el diálogo de acciones rápidas y el onboarding (openspec:
 * speed-up-quick-actions-search): primero las coincidencias locales y después la búsqueda
 * completa, que se suma debajo sin reordenar lo ya visible. Búsqueda manual (sin react-query):
 * el Header vive fuera de `<Providers>`, así que no hay `QueryClientProvider` en ese árbol.
 */
export function useTargetSearch(type: PickerType, rawQuery: string, options: TargetSearchOptions = {}): TargetSearch {
  const { category } = options;
  const query = rawQuery.trim();
  const key = `${type}|${category ?? ""}|${query}`;
  const searchable = query.length >= TARGET_SEARCH_MIN_LENGTH;
  const remoteExpected = query.length >= REMOTE_MIN_LENGTH;

  const local = usePhase(key, searchable, LOCAL_DEBOUNCE_MS, (signal) =>
    getSearchSuggestions(type, query, signal).then((res) => fromSuggestions(res.suggestions, type, query)),
  );
  const remote = usePhase(key, remoteExpected, REMOTE_DEBOUNCE_MS, (signal) =>
    searchByType(type, query, signal, category).then(fromSearch),
  );

  // Lo local conserva su posición; si la búsqueda completa trae el mismo objetivo, completa el
  // subtítulo, el año y la categoría que la sugerencia no tenga (un stub sin crédito primario
  // llega sin artista).
  const remoteByKey = new Map((remote?.candidates ?? []).map((c) => [`${c.type}:${c.id}`, c]));
  const localCandidates = (local?.candidates ?? []).map((c) => {
    const twin = remoteByKey.get(`${c.type}:${c.id}`);
    return twin ? { ...c, subtitle: c.subtitle ?? twin.subtitle, year: c.year ?? twin.year, category: twin.category } : c;
  });
  const seen = new Set(localCandidates.map((c) => `${c.type}:${c.id}`));
  const candidates = [
    ...localCandidates,
    ...(remote?.candidates ?? []).filter((c) => !seen.has(`${c.type}:${c.id}`)),
  ];
  const pending = !local || local.status === "loading" || (remoteExpected && (!remote || remote.status === "loading"));
  // Sin búsqueda completa (dos letras) el error que cuenta es el local.
  const failed = remoteExpected ? remote?.status === "error" : local?.status === "error";

  return { query, searchable, candidates, pending, failed: failed === true };
}
