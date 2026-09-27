"use client";

import { useEffect, useRef, useState } from "react";
import { searchAlbums, searchArtists, searchSongs } from "@/lib/api/catalog";
import type { AlbumSearchResponse, ArtistSearchResponse, SongSearchResponse } from "@/lib/api/schemas";

const DEBOUNCE_MS = 350;
const MIN_QUERY = 2;

export type EmbeddedSearchType = "artist" | "album" | "song";

export type EmbeddedSearchResponse<T extends EmbeddedSearchType> = T extends "album"
  ? AlbumSearchResponse
  : T extends "song"
    ? SongSearchResponse
    : ArtistSearchResponse;

function runSearch(type: EmbeddedSearchType, query: string) {
  if (type === "album") return searchAlbums(query);
  if (type === "song") return searchSongs(query);
  return searchArtists(query);
}

// Buscador de catálogo con debounce para los buscadores embebidos (onboarding,
// registrar una escucha). Busca UN tipo por solicitud (`GET
// /api/catalog/search?type=`, openspec: redesign-scoped-search): cambiar el
// tipo relanza la búsqueda del texto actual en el tipo nuevo.
export function useCatalogSearch<T extends EmbeddedSearchType>(type: T) {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<EmbeddedSearchResponse<T> | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const runId = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    setResponse(null);
    setFailed(false);
    if (trimmed.length < MIN_QUERY) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const id = ++runId.current;
    const timer = setTimeout(async () => {
      try {
        const result = await runSearch(type, trimmed);
        if (runId.current === id) setResponse(result as EmbeddedSearchResponse<T>);
      } catch {
        if (runId.current === id) setFailed(true);
      } finally {
        if (runId.current === id) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, type]);

  return { query, setQuery, response, loading, failed };
}
