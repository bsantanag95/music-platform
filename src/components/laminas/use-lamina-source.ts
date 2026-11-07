"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTimeZone } from "next-intl";
import { fetchLaminaCandidates, fetchLaminaSourceOptions, type LaminaCandidateFilters } from "@/lib/api/laminas";
import type { LaminaCandidate, LaminaDetail, LaminaSource, LaminaSourceOptions } from "@/lib/api/schemas";
import { decadeLabel } from "@/services/discovery/decade-label";
import { genreDisplayName, genreLocaleOf } from "@/services/genres/names";

// Estado de una fuente de Lámina (spec top-laminas), compartido por el alta y el editor. Lo que depende de los pedidos se
// guarda con la clave que lo pidió: si la clave cambió, ese dato ya no vale, así no hay que limpiarlo a mano y una
// respuesta vieja no puede pisar a la nueva.

export type LaminaSourceChoice = LaminaSource | "manual";

/** Filtros de la interfaz: año o década van en un mismo control, así no se pueden pedir juntos. */
export interface LaminaFilterState {
  period: string;
  listenYear: string;
  genre: string;
  artist: string;
  list: string;
}

const NO_FILTERS: LaminaFilterState = { period: "", listenYear: "", genre: "", artist: "", list: "" };

function toRequest(source: LaminaSource, filters: LaminaFilterState): LaminaCandidateFilters {
  if (source === "list") return { list: filters.list };
  const [kind, value] = filters.period.split(":");
  return {
    year: kind === "year" ? Number(value) : undefined,
    decade: kind === "decade" ? Number(value) : undefined,
    listenYear: filters.listenYear ? Number(filters.listenYear) : undefined,
    genre: filters.genre || undefined,
    artist: filters.artist || undefined,
  };
}

interface Loaded<T> {
  key: string;
  value: T | null;
  failed: boolean;
}

export interface LaminaSourceState {
  source: LaminaSourceChoice;
  setSource: (source: LaminaSourceChoice) => void;
  filters: LaminaFilterState;
  setFilter: (name: keyof LaminaFilterState, value: string) => void;
  options: LaminaSourceOptions | null;
  candidates: LaminaCandidate[];
  loading: boolean;
  failed: boolean;
  /** Elegidos, en el orden de los candidatos. */
  selected: LaminaCandidate[];
  toggle: (id: string) => void;
  slots: number;
  /** Filtros con sus nombres en el idioma de la interfaz, para el título sugerido. */
  labels: { year?: number; decade?: string; listenYear?: number; genre?: string; artist?: string; listTitle?: string };
}

export function useLaminaSource({
  entityType,
  slots,
  exclude,
  initialSource = "manual",
  limit,
}: {
  entityType: LaminaDetail["entityType"];
  slots: number;
  exclude?: ReadonlySet<string>;
  initialSource?: LaminaSourceChoice;
  /** Cuántos candidatos pedir: la tier list ve hasta 50 (add-tier-list-lamina-phase2); sin él, los 30 de siempre. */
  limit?: number;
}): LaminaSourceState {
  const locale = useLocale();
  const timeZone = useTimeZone() ?? "UTC";
  const [source, setSourceState] = useState<LaminaSourceChoice>(initialSource);
  const [stored, setStored] = useState({ scope: "", filters: NO_FILTERS });
  const [loadedOptions, setLoadedOptions] = useState<Loaded<LaminaSourceOptions> | null>(null);
  const [loadedCandidates, setLoadedCandidates] = useState<Loaded<LaminaCandidate[]> | null>(null);
  const [picked, setPicked] = useState<{ key: string; ids: string[] } | null>(null);

  const scope = `${source}:${entityType}`;
  const chosenFilters = stored.scope === scope ? stored.filters : NO_FILTERS;
  const options = loadedOptions?.key === scope ? loadedOptions.value : null;
  // Una lista se elige sola la primera vez: no hay "todas las listas".
  const filters = source === "list" && !chosenFilters.list ? { ...chosenFilters, list: options?.lists[0]?.id ?? "" } : chosenFilters;

  const { period, listenYear, genre, artist, list } = filters;
  const request = useMemo(
    () => (source === "manual" ? null : toRequest(source, { period, listenYear, genre, artist, list })),
    [source, period, listenYear, genre, artist, list],
  );
  const ready = source !== "manual" && (source !== "list" || Boolean(filters.list));
  const candidatesKey = `${scope}:${limit ?? ""}:${JSON.stringify(request)}`;

  useEffect(() => {
    if (source === "manual") return;
    const controller = new AbortController();
    fetchLaminaSourceOptions({ source, entityType, timeZone }, controller.signal).then(
      (value) => setLoadedOptions({ key: scope, value, failed: false }),
      () => {
        if (!controller.signal.aborted) setLoadedOptions({ key: scope, value: null, failed: true });
      },
    );
    return () => controller.abort();
  }, [source, entityType, timeZone, scope]);

  useEffect(() => {
    if (source === "manual" || !ready || !request) return;
    const controller = new AbortController();
    fetchLaminaCandidates({ source, entityType, timeZone, limit }, request, controller.signal).then(
      (value) => setLoadedCandidates({ key: candidatesKey, value, failed: false }),
      () => {
        if (!controller.signal.aborted) setLoadedCandidates({ key: candidatesKey, value: null, failed: true });
      },
    );
    return () => controller.abort();
  }, [source, entityType, timeZone, limit, ready, request, candidatesKey]);

  const current = loadedCandidates?.key === candidatesKey ? loadedCandidates : null;
  const candidates = useMemo(
    () => (current?.value ?? []).filter((candidate) => !exclude?.has(candidate.target.id)),
    [current, exclude],
  );

  // La selección vale para estos candidatos y estos lugares; si cambian, vuelve a ser los primeros.
  const selectionKey = `${candidatesKey}:${slots}`;
  const ids = picked?.key === selectionKey ? picked.ids : candidates.slice(0, slots).map((candidate) => candidate.target.id);
  const selected = candidates.filter((candidate) => ids.includes(candidate.target.id));

  function toggle(id: string) {
    const next = ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
    if (next.length <= slots) setPicked({ key: selectionKey, ids: next });
  }

  const [periodKind, periodValue] = period.split(":");
  const chosenGenre = options?.genres.find((item) => item.slug === genre);
  const labels: LaminaSourceState["labels"] = {
    year: periodKind === "year" ? Number(periodValue) : undefined,
    decade: periodKind === "decade" ? decadeLabel(Number(periodValue), locale).toLowerCase() : undefined,
    listenYear: listenYear ? Number(listenYear) : undefined,
    genre: chosenGenre ? genreDisplayName(chosenGenre, genreLocaleOf(locale)) : undefined,
    artist: options?.artists.find((item) => item.id === artist)?.name,
    listTitle: options?.lists.find((item) => item.id === list)?.title,
  };

  const optionsFailed = loadedOptions?.key === scope && loadedOptions.failed;
  return {
    source,
    setSource: setSourceState,
    filters,
    setFilter: (name, value) => setStored({ scope, filters: { ...filters, [name]: value } }),
    options,
    candidates,
    loading: source !== "manual" && !optionsFailed && (options === null || (ready && current === null)),
    failed: optionsFailed || Boolean(current?.failed),
    selected,
    toggle,
    slots,
    labels,
  };
}
