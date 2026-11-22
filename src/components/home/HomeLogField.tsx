"use client";

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { Spinner } from "@/components/ui/Spinner";
import { SearchTypeIcon } from "@/components/catalog/SearchTypeIcon";
import { SearchTypeToggle } from "@/components/catalog/SearchTypeToggle";
import { QuickActionsDialog } from "@/components/quick-actions/QuickActionsDialog";
import { useTargetSearch } from "@/components/quick-actions/use-target-search";
import type { PickTarget } from "@/components/quick-actions/types";

/** Se anota un disco o una canción: artista no es una escucha de algo concreto. */
const LOG_TYPES = ["album", "song"] as const;
type LogType = (typeof LOG_TYPES)[number];

// Campo «¿Qué escuchaste hoy?» de la cabecera de Inicio (openspec: redesign-signed-in-home-phase1):
// combobox sobre la misma búsqueda en dos fases que el diálogo de acciones rápidas. Elegir una
// sugerencia abre ese diálogo en Escucha con el objetivo ya elegido —registrar cuesta lo mismo que
// desde «+ Añadir»—. No es un buscador del catálogo: `Enter` sin una opción activa no navega.
export function HomeLogField({ labelledBy }: { labelledBy: string }) {
  const t = useTranslations("home");
  const tPicker = useTranslations("quickActions.picker");
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [type, setType] = useState<LogType>("album");
  const [rawQuery, setRawQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [picked, setPicked] = useState<PickTarget | null>(null);
  const { query, searchable, candidates, pending, failed } = useTargetSearch(type, rawQuery);

  // Lista nueva → ninguna opción activa hasta que se use el teclado.
  useEffect(() => setActive(-1), [query, type]);

  // Clic fuera del campo cierra la lista.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const pick = (index: number) => {
    const candidate = candidates[index];
    if (!candidate) return;
    setOpen(false);
    setPicked({ type: candidate.type, id: candidate.id, title: candidate.title, subtitle: candidate.subtitle });
  };

  const closeDialog = useCallback(() => {
    setPicked(null);
    setRawQuery("");
    inputRef.current?.focus();
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        setOpen(false);
      }
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (candidates.length === 0) return;
      event.preventDefault();
      setOpen(true);
      const step = event.key === "ArrowDown" ? 1 : -1;
      // Recorre -1 (ninguna, el foco "en el texto") … última opción, de forma circular.
      setActive((current) => {
        const next = current + step;
        if (next >= candidates.length) return -1;
        if (next < -1) return candidates.length - 1;
        return next;
      });
      return;
    }
    if (event.key === "Enter") {
      // Sin opción activa no hace nada: el campo no es un buscador del catálogo.
      event.preventDefault();
      if (open && active >= 0) pick(active);
    }
  };

  const showList = open && searchable;
  const activeId = showList && active >= 0 && active < candidates.length ? `${listId}-${active}` : undefined;
  const typeLabel = (candidateType: PickTarget["type"]) =>
    candidateType === "release-group" ? tPicker("typeAlbum") : candidateType === "recording" ? tPicker("typeSong") : tPicker("typeArtist");

  return (
    <div ref={wrapperRef} className="relative w-full max-w-2xl">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-paper-muted"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-labelledby={labelledBy}
            aria-autocomplete="list"
            aria-expanded={showList}
            aria-controls={listId}
            aria-activedescendant={activeId}
            autoComplete="off"
            enterKeyHint="search"
            value={rawQuery}
            onChange={(event) => {
              setRawQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={t(type === "song" ? "logFieldPlaceholderSong" : "logFieldPlaceholderAlbum")}
            className="h-14 w-full rounded-xl border border-ink-border bg-ink-surface/95 pl-12 pr-4 font-body text-base text-paper shadow-lg shadow-black/30 transition-colors placeholder:text-paper-muted focus:border-amber/60 focus:outline-none sm:text-lg"
          />
        </div>
        <SearchTypeToggle types={LOG_TYPES} value={type} onChange={setType} label={tPicker("typeLabel")} />
      </div>

      {showList ? (
        <div className="absolute inset-x-0 top-full z-20 mt-2 rounded-xl border border-ink-border bg-ink-surface p-2 shadow-2xl shadow-black/60">
          <ul id={listId} role="listbox" aria-labelledby={labelledBy} className="themed-scrollbar flex max-h-80 flex-col gap-0.5 overflow-y-auto">
            {candidates.map((candidate, index) => (
              <li
                key={`${candidate.type}:${candidate.id}`}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => pick(index)}
                onMouseEnter={() => setActive(index)}
                className={`group flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 transition-colors ${index === active ? "bg-ink" : "hover:bg-ink"}`}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-md bg-ink text-paper-muted ring-1 ring-ink-border group-hover:text-amber">
                  <SearchTypeIcon type={candidate.type === "recording" ? "song" : "album"} className="size-4" />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-display text-sm text-paper">{candidate.title}</span>
                  <span className="truncate font-data text-xs text-paper-muted">
                    {typeLabel(candidate.type)}
                    {candidate.subtitle ? ` · ${candidate.subtitle}` : ""}
                    {candidate.year ? ` · ${candidate.year}` : ""}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          {candidates.length > 0 ? (
            pending ? (
              <span className="flex items-center gap-2 px-2 pt-2 font-data text-xs text-paper-muted">
                <Spinner label={tPicker("searchingMore")} className="size-3" /> {tPicker("searchingMore")}
              </span>
            ) : null
          ) : pending ? (
            <span className="flex items-center gap-2 px-2 py-2 font-data text-xs text-paper-muted">
              <Spinner label={tPicker("searching")} className="size-4" /> {tPicker("searching")}
            </span>
          ) : failed ? (
            <span role="alert" className="block px-2 py-2 font-data text-xs text-danger">
              {tPicker("searchError")}
            </span>
          ) : (
            <p className="px-2 py-2 font-data text-xs text-paper-muted">{tPicker("noResults", { query })}</p>
          )}
        </div>
      ) : null}

      {picked ? <QuickActionsDialog onClose={closeDialog} initialTarget={picked} /> : null}
    </div>
  );
}
