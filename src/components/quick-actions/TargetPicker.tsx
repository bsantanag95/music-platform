"use client";

import type { RefObject } from "react";
import { useTranslations } from "next-intl";
import { Spinner } from "@/components/ui/Spinner";
import { SearchTypeIcon } from "@/components/catalog/SearchTypeIcon";
import { SearchTypeToggle } from "@/components/catalog/SearchTypeToggle";
import type { SocialTargetType } from "@/lib/api/schemas";
import type { PickerType, PickTarget } from "./types";
import { useTargetSearch } from "./use-target-search";

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
// (openspec: add-header-quick-actions, D3): un tipo por búsqueda, mínimo de dos letras. La búsqueda
// en dos fases vive en `useTargetSearch`, compartida con el onboarding.
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
  const { query, searchable, candidates, pending, failed } = useTargetSearch(type, rawQuery);

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

      {!searchable ? (
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
