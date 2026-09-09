"use client";

import { useEffect, useRef, useState } from "react";
import { searchCatalog } from "@/lib/api/catalog";
import type { CatalogSearchResponse } from "@/lib/api/schemas";

const DEBOUNCE_MS = 350;
const MIN_QUERY = 2;

// Buscador de catálogo con debounce para los buscadores del onboarding
// (openspec: add-two-door-onboarding). Reusa `GET /api/catalog/search`; el
// filtrado por tipo lo hace cada picker sobre `response.results`.
export function useCatalogSearch() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<CatalogSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const runId = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY) {
      setResponse(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const id = ++runId.current;
    const timer = setTimeout(async () => {
      try {
        const result = await searchCatalog(trimmed);
        if (runId.current === id) setResponse(result);
      } catch {
        if (runId.current === id) setResponse({ results: [] });
      } finally {
        if (runId.current === id) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  return { query, setQuery, response, loading };
}
