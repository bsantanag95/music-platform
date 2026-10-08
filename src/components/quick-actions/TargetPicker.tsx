"use client";

import { useEffect, useMemo, useState, type RefObject } from "react";
import { useTranslations } from "next-intl";
import { Spinner } from "@/components/ui/Spinner";
import { SearchTypeIcon } from "@/components/catalog/SearchTypeIcon";
import { SearchTypeToggle } from "@/components/catalog/SearchTypeToggle";
import { searchAlbums, searchArtists, searchSongs } from "@/lib/api/catalog";
import type { CatalogSearchResponse, SocialTargetType } from "@/lib/api/schemas";
import type { PickerType, PickTarget } from "./types";

const DEBOUNCE_MS = 300;

function searchByType(type: PickerType, query: string): Promise<CatalogSearchResponse> {
  if (type === "album") return searchAlbums(query);
  if (type === "song") return searchSongs(query);
  return searchArtists(query);
}

interface TargetPickerProps {
  /** Tipos de búsqueda permitidos para la acción activa. */
  types: readonly PickerType[];
  type: PickerType;
  onTypeChange: (type: PickerType) => void;
  /** Texto escrito, controlado por el diálogo para conservarlo al cambiar de acción. */
  rawQuery: string;
  onRawQueryChange: (value: string) => void;
  onPick: (target: PickTarget) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  inputId: string;
  prompt: string;
}

// Buscador de objetivos compartido por las acciones del diálogo de acciones rápidas
// (openspec: add-header-quick-actions, D3): un tipo por búsqueda, espera de 300 ms, mínimo de dos
// letras. Extraído de `RegisterListenDialog`. Búsqueda manual (sin react-query): el Header vive
// fuera de `<Providers>`, así que no hay `QueryClientProvider` en este árbol.
export function TargetPicker({
  types,
  type,
  onTypeChange,
  rawQuery,
  onRawQueryChange,
  onPick,
  inputRef,
  inputId,
  prompt,
}: TargetPickerProps) {
  const t = useTranslations("quickActions.picker");
  const [query, setQuery] = useState(rawQuery.trim());
  const [results, setResults] = useState<CatalogSearchResponse | null>(null);
  const [searchState, setSearchState] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => {
    const id = setTimeout(() => setQuery(rawQuery.trim()), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [rawQuery]);

  useEffect(() => {
    if (query.length < 2) {
      setResults(null);
      setSearchState("idle");
      return;
    }
    let cancelled = false;
    setSearchState("loading");
    searchByType(type, query)
      .then((res) => {
        if (!cancelled) {
          setResults(res);
          setSearchState("idle");
        }
      })
      .catch(() => {
        if (!cancelled) setSearchState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [query, type]);

  const candidates = useMemo<PickTarget[]>(() => {
    if (!results) return [];
    if (results.type === "album") {
      return results.results.map(
        (r): PickTarget => ({ type: "release-group", id: r.id, title: r.title, subtitle: r.artistName }),
      );
    }
    if (results.type === "artist") {
      return results.results.map(
        (r): PickTarget => ({ type: "artist", id: r.id, title: r.name, subtitle: r.disambiguation }),
      );
    }
    // Canciones: solo la canción resuelta tiene grabación identidad registrable.
    return results.results.flatMap((group): PickTarget[] =>
      group.recordingId
        ? [{ type: "recording", id: group.recordingId, title: group.title, subtitle: group.artistName }]
        : [],
    );
  }, [results]);

  // Año del álbum para distinguir ediciones homónimas (solo para mostrar; no viaja en el objetivo).
  const years = useMemo(() => {
    const map = new Map<string, number>();
    if (results?.type === "album") for (const r of results.results) if (r.year) map.set(r.id, r.year);
    return map;
  }, [results]);

  const typeLabel = (targetType: SocialTargetType) =>
    targetType === "artist" ? t("typeArtist") : targetType === "release-group" ? t("typeAlbum") : t("typeSong");

  return (
    <div className="flex flex-col gap-3">
      <label htmlFor={inputId} className="font-display text-base text-paper">
        {prompt}
      </label>
      {types.length > 1 ? (
        <SearchTypeToggle types={types} value={type} onChange={onTypeChange} label={t("typeLabel")} />
      ) : null}
      <div className="relative">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-paper-muted"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          id={inputId}
          ref={inputRef}
          type="search"
          autoComplete="off"
          value={rawQuery}
          onChange={(e) => onRawQueryChange(e.target.value)}
          placeholder={types.includes("song") ? t("searchPlaceholder") : t("searchPlaceholderPending")}
          className="w-full rounded-md border border-ink-border bg-ink py-2.5 pl-9 pr-3 font-data text-sm text-paper transition-colors placeholder:text-paper-muted focus:border-amber/60 focus:outline-none"
        />
      </div>

      {query.length < 2 ? (
        <p className="font-data text-xs text-paper-muted">{t("hint")}</p>
      ) : searchState === "loading" ? (
        <span className="flex items-center gap-2 font-data text-xs text-paper-muted">
          <Spinner label={t("searching")} className="size-4" /> {t("searching")}
        </span>
      ) : searchState === "error" ? (
        <span role="alert" className="font-data text-xs text-danger">
          {t("searchError")}
        </span>
      ) : candidates.length === 0 ? (
        <p className="font-data text-xs text-paper-muted">{t("noResults", { query })}</p>
      ) : (
        <ul className="themed-scrollbar -mx-2 flex max-h-80 flex-col gap-0.5 overflow-y-auto">
          {candidates.map((c) => (
            <li key={`${c.type}:${c.id}`}>
              <button
                type="button"
                onClick={() => onPick(c)}
                className="group flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-ink focus-visible:bg-ink"
              >
                {/* La búsqueda no trae carátula: un ícono del tipo en vez de un disco vacío. */}
                <span className="grid size-9 shrink-0 place-items-center rounded-md bg-ink text-paper-muted ring-1 ring-ink-border transition-colors group-hover:text-amber">
                  <SearchTypeIcon type={c.type === "release-group" ? "album" : c.type === "recording" ? "song" : "artist"} className="size-4" />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-display text-sm text-paper">{c.title}</span>
                  <span className="truncate font-data text-xs text-paper-muted">
                    {typeLabel(c.type)}
                    {c.subtitle ? ` · ${c.subtitle}` : ""}
                    {years.get(c.id) ? ` · ${years.get(c.id)}` : ""}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
