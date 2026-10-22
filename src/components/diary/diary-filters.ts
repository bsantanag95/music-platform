// Filtros del diario propio como estado de la UI y como URL (openspec:
// redesign-diary-page, D6–D7). Fuera de un módulo "use client" para que la
// página (server component) pueda leer la URL y sembrar la primera página ya
// filtrada con las mismas reglas que usa el cliente.
import type { DiaryFiltersParams } from "@/lib/api/diary";
import {
  DIARY_AUDIENCES,
  DIARY_TARGET_TYPES,
  LISTEN_CONTEXTS,
  LISTEN_REACTIONS,
  type DiaryAudience,
  type DiaryTargetType,
  type ListenContext,
  type ListenReaction,
} from "@/services/diary/types";

// `""` es "sin filtrar" (más simple que `undefined` para controles nativos).
// `q` es el texto ya con debounce, el que viaja al servidor. `year`/`month`
// viven como string; `month` solo vale con `year` (no existe "este mes, en
// cualquier año" — openspec: add-diary-date-navigation).
export interface DiaryFiltersState {
  q: string;
  context: ListenContext | "";
  reaction: ListenReaction | "none" | "";
  audience: DiaryAudience | "";
  type: DiaryTargetType | "";
  year: string;
  month: string;
}

export const EMPTY_DIARY_FILTERS: DiaryFiltersState = {
  q: "",
  context: "",
  reaction: "",
  audience: "",
  type: "",
  year: "",
  month: "",
};

export const REACTION_FILTER_VALUES = [...LISTEN_REACTIONS, "none"] as const;

export function toApiFilters(filters: DiaryFiltersState): DiaryFiltersParams {
  const q = filters.q.trim();
  return {
    q: q ? q : undefined,
    context: filters.context || undefined,
    reaction: filters.reaction || undefined,
    audience: filters.audience || undefined,
    type: filters.type || undefined,
    year: filters.year ? Number(filters.year) : undefined,
    month: filters.year && filters.month ? Number(filters.month) : undefined,
  };
}

export function hasActiveFilters(filters: DiaryFiltersState): boolean {
  return Boolean(
    filters.q.trim() || filters.context || filters.reaction || filters.audience || filters.type || filters.year,
  );
}

/** Filtros del panel activos (la búsqueda no cuenta: se ve en su propio campo). La fecha cuenta uno. */
export function activeFilterCount(filters: DiaryFiltersState): number {
  return [filters.reaction, filters.context, filters.audience, filters.type, filters.year].filter(Boolean).length;
}

type SearchParamsLike = URLSearchParams | Record<string, string | string[] | undefined>;

function readParam(params: SearchParamsLike, key: string): string | null {
  if (params instanceof URLSearchParams) return params.get(key);
  const value = params[key];
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | "" {
  return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : "";
}

/**
 * Filtros desde la URL. Un valor inválido se ignora (la página no propaga el
 * 400 de la API): abrir una URL vieja o editada a mano muestra el diario con
 * los filtros que sí se entienden.
 */
export function filtersFromSearchParams(params: SearchParamsLike): DiaryFiltersState {
  const yearValue = Number(readParam(params, "year"));
  const year = Number.isInteger(yearValue) && yearValue >= 1900 && yearValue <= 9999 ? String(yearValue) : "";
  const monthValue = Number(readParam(params, "month"));
  const month = year && Number.isInteger(monthValue) && monthValue >= 1 && monthValue <= 12 ? String(monthValue) : "";
  return {
    q: (readParam(params, "q") ?? "").trim().slice(0, 200),
    context: oneOf(readParam(params, "context"), LISTEN_CONTEXTS),
    reaction: oneOf(readParam(params, "reaction"), REACTION_FILTER_VALUES),
    audience: oneOf(readParam(params, "audience"), DIARY_AUDIENCES),
    type: oneOf(readParam(params, "type"), DIARY_TARGET_TYPES),
    year,
    month,
  };
}

const FILTER_KEYS = ["q", "context", "reaction", "audience", "type", "year", "month"] as const;

/** Escribe los filtros sobre una copia de `base`, conservando cualquier otro parámetro. */
export function filtersToSearchParams(filters: DiaryFiltersState, base: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(base);
  const values: Record<(typeof FILTER_KEYS)[number], string> = {
    q: filters.q.trim(),
    context: filters.context,
    reaction: filters.reaction,
    audience: filters.audience,
    type: filters.type,
    year: filters.year,
    month: filters.year ? filters.month : "",
  };
  for (const key of FILTER_KEYS) {
    if (values[key]) next.set(key, values[key]);
    else next.delete(key);
  }
  return next;
}

// Valor del control único de Fecha (D6): `""` (cualquier fecha), `"2026"` (todo
// el año) o `"2026-9"` (un mes de ese año).
export function dateValue(filters: Pick<DiaryFiltersState, "year" | "month">): string {
  if (!filters.year) return "";
  return filters.month ? `${filters.year}-${filters.month}` : filters.year;
}

export function parseDateValue(value: string): Pick<DiaryFiltersState, "year" | "month"> {
  const [year = "", month = ""] = value.split("-");
  return { year, month: year ? month : "" };
}
