"use client";

import { useEffect, useMemo, useState, type RefObject } from "react";
import { useTranslations } from "next-intl";
import { Spinner } from "@/components/ui/Spinner";
import { CoverThumb } from "@/components/catalog/CoverThumb";
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

  const typeLabel = (targetType: SocialTargetType) =>
    targetType === "artist" ? t("typeArtist") : targetType === "release-group" ? t("typeAlbum") : t("typeSong");

  return (
    <div className="flex flex-col gap-3">
      <label htmlFor={inputId} className="font-data text-sm text-paper">
        {prompt}
      </label>
      {types.length > 1 ? (
        <SearchTypeToggle types={types} value={type} onChange={onTypeChange} label={t("typeLabel")} />
      ) : null}
      <input
        id={inputId}
        ref={inputRef}
        type="search"
        value={rawQuery}
        onChange={(e) => onRawQueryChange(e.target.value)}
        placeholder={types.includes("song") ? t("searchPlaceholder") : t("searchPlaceholderPending")}
        className="rounded border border-ink-border bg-ink px-3 py-2 font-data text-sm text-paper placeholder:text-paper-muted"
      />

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
        <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto">
          {candidates.map((c) => (
            <li key={`${c.type}:${c.id}`}>
              <button
                type="button"
                onClick={() => onPick(c)}
                className="flex w-full items-center gap-3 rounded border border-transparent px-2 py-2 text-left transition-colors hover:border-ink-border hover:bg-ink"
              >
                <CoverThumb cover={null} label="" className="size-10" />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-display text-sm text-paper">{c.title}</span>
                  <span className="truncate font-data text-xs text-paper-muted">
                    {typeLabel(c.type)}
                    {c.subtitle ? ` · ${c.subtitle}` : ""}
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
