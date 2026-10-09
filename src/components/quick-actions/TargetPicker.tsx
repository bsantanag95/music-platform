"use client";

import { useEffect, useState, type RefObject } from "react";
import { useTranslations } from "next-intl";
import { Spinner } from "@/components/ui/Spinner";
import { SearchTypeIcon } from "@/components/catalog/SearchTypeIcon";
import { SearchTypeToggle } from "@/components/catalog/SearchTypeToggle";
import { getSearchSuggestions, searchAlbums, searchArtists, searchSongs } from "@/lib/api/catalog";
import type { CatalogSearchResponse, SearchSuggestion, SocialTargetType } from "@/lib/api/schemas";
import type { PickerType, PickTarget } from "./types";

/** Coincidencias locales: responden en ~0,1 s y nunca salen a MusicBrainz. */
const LOCAL_DEBOUNCE_MS = 150;
/** Búsqueda completa: pasa por la cola de MusicBrainz, así que espera a que se deje de escribir. */
const REMOTE_DEBOUNCE_MS = 500;
const MIN_LENGTH = 2;
/** Con dos letras MusicBrainz devuelve ruido y la consulta casi siempre queda obsoleta. */
const REMOTE_MIN_LENGTH = 3;

/** Candidato con el año del álbum, solo para mostrar (no viaja en el objetivo). */
interface Candidate extends PickTarget {
  year: number | null;
}

/** Resultado de una fase, etiquetado con la consulta que lo produjo. */
interface Phase {
  key: string;
  status: "loading" | "done" | "error";
  candidates: Candidate[];
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

function fromSuggestions(suggestions: SearchSuggestion[], type: PickerType, query: string): Candidate[] {
  // En Artistas las sugerencias también traen álbumes (puente artista + título): fuera de lugar aquí.
  return suggestions
    .filter((suggestion) => suggestion.kind === SUGGESTION_KIND[type])
    .filter((suggestion) => suggestion.kind !== "song" || coversQuery(query, suggestion.title, suggestion.artistName))
    .flatMap((suggestion): Candidate[] => {
      if (suggestion.kind === "artist") {
        return [{ type: "artist", id: suggestion.id, title: suggestion.name, subtitle: suggestion.disambiguation, year: null }];
      }
      if (suggestion.kind === "album") {
        return [
          { type: "release-group", id: suggestion.id, title: suggestion.title, subtitle: suggestion.artistName, year: suggestion.year },
        ];
      }
      if (suggestion.kind === "song") {
        return [{ type: "recording", id: suggestion.id, title: suggestion.title, subtitle: suggestion.artistName, year: null }];
      }
      return [];
    });
}

function fromSearch(response: CatalogSearchResponse): Candidate[] {
  if (response.type === "album") {
    return response.results.map(
      (r): Candidate => ({ type: "release-group", id: r.id, title: r.title, subtitle: r.artistName, year: r.year }),
    );
  }
  if (response.type === "artist") {
    return response.results.map(
      (r): Candidate => ({ type: "artist", id: r.id, title: r.name, subtitle: r.disambiguation, year: null }),
    );
  }
  // Canciones: solo la canción con grabación identidad es registrable (en modo de elección, todas).
  return response.results.flatMap((group): Candidate[] =>
    group.recordingId
      ? [{ type: "recording", id: group.recordingId, title: group.title, subtitle: group.artistName, year: null }]
      : [],
  );
}

function searchByType(type: PickerType, query: string, signal: AbortSignal): Promise<CatalogSearchResponse> {
  if (type === "album") return searchAlbums(query, { signal });
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
  run: (signal: AbortSignal) => Promise<Candidate[]>,
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

/**
 * Placeholder del buscador según los tipos que SÍ busca: con una lista bloqueada a un solo tipo
 * (tras crearla desde el diálogo) o con Pendiente, no debe prometer tipos que no devuelve.
 */
function placeholderKey(types: readonly PickerType[]) {
  if (types.length === 1) {
    return types[0] === "artist" ? "searchPlaceholderArtist" : types[0] === "song" ? "searchPlaceholderSong" : "searchPlaceholderAlbum";
  }
  return types.includes("song") ? "searchPlaceholder" : "searchPlaceholderPending";
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
// (openspec: add-header-quick-actions, D3): un tipo por búsqueda, mínimo de dos letras. Busca en
// dos fases (openspec: speed-up-quick-actions-search): primero las coincidencias locales y después
// la búsqueda completa, que se suma debajo sin reordenar lo ya visible. Búsqueda manual (sin
// react-query): el Header vive fuera de `<Providers>`, así que no hay `QueryClientProvider` en
// este árbol.
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
  const query = rawQuery.trim();
  const key = `${type}|${query}`;
  const remoteExpected = query.length >= REMOTE_MIN_LENGTH;

  const local = usePhase(key, query.length >= MIN_LENGTH, LOCAL_DEBOUNCE_MS, (signal) =>
    getSearchSuggestions(type, query, signal).then((res) => fromSuggestions(res.suggestions, type, query)),
  );
  const remote = usePhase(key, remoteExpected, REMOTE_DEBOUNCE_MS, (signal) =>
    searchByType(type, query, signal).then(fromSearch),
  );

  // Lo local conserva su posición; si la búsqueda completa trae el mismo objetivo, completa el
  // subtítulo y el año que la sugerencia no tenga (un stub sin crédito primario llega sin artista).
  const remoteByKey = new Map((remote?.candidates ?? []).map((c) => [`${c.type}:${c.id}`, c]));
  const localCandidates = (local?.candidates ?? []).map((c) => {
    const twin = remoteByKey.get(`${c.type}:${c.id}`);
    return twin ? { ...c, subtitle: c.subtitle ?? twin.subtitle, year: c.year ?? twin.year } : c;
  });
  const seen = new Set(localCandidates.map((c) => `${c.type}:${c.id}`));
  const candidates = [
    ...localCandidates,
    ...(remote?.candidates ?? []).filter((c) => !seen.has(`${c.type}:${c.id}`)),
  ];
  const pending = !local || local.status === "loading" || (remoteExpected && (!remote || remote.status === "loading"));
  // Sin búsqueda completa (dos letras) el error que cuenta es el local.
  const failed = remoteExpected ? remote?.status === "error" : local?.status === "error";

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
          placeholder={t(placeholderKey(types))}
          className="w-full rounded-md border border-ink-border bg-ink py-2.5 pl-9 pr-3 font-data text-sm text-paper transition-colors placeholder:text-paper-muted focus:border-amber/60 focus:outline-none"
        />
      </div>

      {query.length < MIN_LENGTH ? (
        <p className="font-data text-xs text-paper-muted">{t("hint")}</p>
      ) : candidates.length > 0 ? (
        <div className="flex flex-col gap-2">
          <ul className="themed-scrollbar -mx-2 flex max-h-80 flex-col gap-0.5 overflow-y-auto">
            {candidates.map((c) => (
              <li key={`${c.type}:${c.id}`}>
                <button
                  type="button"
                  onClick={() => onPick({ type: c.type, id: c.id, title: c.title, subtitle: c.subtitle })}
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
                      {c.year ? ` · ${c.year}` : ""}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {pending ? (
            <span className="flex items-center gap-2 font-data text-xs text-paper-muted">
              <Spinner label={t("searchingMore")} className="size-3" /> {t("searchingMore")}
            </span>
          ) : null}
        </div>
      ) : pending ? (
        <span className="flex items-center gap-2 font-data text-xs text-paper-muted">
          <Spinner label={t("searching")} className="size-4" /> {t("searching")}
        </span>
      ) : failed ? (
        <span role="alert" className="font-data text-xs text-danger">
          {t("searchError")}
        </span>
      ) : (
        <p className="font-data text-xs text-paper-muted">{t("noResults", { query })}</p>
      )}
    </div>
  );
}
