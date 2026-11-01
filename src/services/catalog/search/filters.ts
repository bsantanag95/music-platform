// Filtros de la búsqueda avanzada (openspec: add-advanced-search-phase1). Un único lector
// tolerante para la página /search, el endpoint y el panel del cliente (módulo sin
// dependencias de servidor). Cada filtro se aplica igual a la base local y a MusicBrainz.

import type { SearchType } from "./types";

type Raw = string | string[] | null | undefined;

/** Filtros del panel, con los nombres de la URL. Solo vienen los del tipo activo. */
export interface AdvancedFilters {
  /** Artistas: ISO 3166-1 alfa-2. */
  country?: string;
  /** Artistas: año de nacimiento o formación. */
  beginFrom?: number;
  beginTo?: number;
  /** Artistas: `true` = ya no en actividad (separados o fallecidos). */
  ended?: boolean;
  /** Álbumes: año del primer lanzamiento. */
  yearFrom?: number;
  yearTo?: number;
  /** Álbumes y Canciones: artista principal. */
  artist?: string;
  /** Canciones: duración en segundos. */
  durMin?: number;
  durMax?: number;
}

export type AdvancedFilterKey = keyof AdvancedFilters;

/** Parámetros de cada tipo, en el orden en que se muestran. */
export const FILTER_KEYS: Record<SearchType, readonly AdvancedFilterKey[]> = {
  artist: ["country", "beginFrom", "beginTo", "ended"],
  album: ["yearFrom", "yearTo", "artist"],
  song: ["artist", "durMin", "durMax"],
  user: [],
};

const MAX_ARTIST_LENGTH = 200;
const MAX_DURATION_SEC = 7200;

function first(value: Raw): string | undefined {
  const raw = Array.isArray(value) ? value[0] : (value ?? undefined);
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

function parseYear(value: Raw, min: number, max: number): number | undefined {
  const raw = first(value);
  if (!raw || !/^\d{4}$/.test(raw)) return undefined;
  const year = Number(raw);
  return year >= min && year <= max ? year : undefined;
}

/** Segundos; también `m:ss`, que es lo que envía el panel sin JavaScript. */
function parseSeconds(value: Raw): number | undefined {
  const raw = first(value);
  if (!raw) return undefined;
  if (raw.includes(":")) return parseDurationInput(raw);
  if (!/^\d+$/.test(raw)) return undefined;
  const seconds = Number(raw);
  return seconds <= MAX_DURATION_SEC ? seconds : undefined;
}

/** Rango con los extremos invertidos → se intercambian. */
function ordered(from: number | undefined, to: number | undefined): [number | undefined, number | undefined] {
  return from !== undefined && to !== undefined && from > to ? [to, from] : [from, to];
}

/**
 * Filtros de `type` desde la URL. Valores inválidos, vacíos o de otro tipo se ignoran sin error.
 * `get` lee un parámetro (objeto de `searchParams` o `URLSearchParams`).
 */
export function parseAdvancedFilters(type: SearchType, get: (key: string) => Raw): AdvancedFilters {
  const filters: AdvancedFilters = {};
  if (type === "artist") {
    const country = first(get("country"))?.toUpperCase();
    if (country && /^[A-Z]{2}$/.test(country)) filters.country = country;
    const [beginFrom, beginTo] = ordered(
      parseYear(get("beginFrom"), 1000, 2100),
      parseYear(get("beginTo"), 1000, 2100),
    );
    if (beginFrom !== undefined) filters.beginFrom = beginFrom;
    if (beginTo !== undefined) filters.beginTo = beginTo;
    const ended = first(get("ended"));
    if (ended === "0" || ended === "1") filters.ended = ended === "1";
  } else if (type === "album") {
    const [yearFrom, yearTo] = ordered(
      parseYear(get("yearFrom"), 1900, 2100),
      parseYear(get("yearTo"), 1900, 2100),
    );
    if (yearFrom !== undefined) filters.yearFrom = yearFrom;
    if (yearTo !== undefined) filters.yearTo = yearTo;
  }
  if (type === "album" || type === "song") {
    const artist = first(get("artist"));
    if (artist && artist.length <= MAX_ARTIST_LENGTH) filters.artist = artist;
  }
  if (type === "song") {
    const [durMin, durMax] = ordered(parseSeconds(get("durMin")), parseSeconds(get("durMax")));
    if (durMin !== undefined) filters.durMin = durMin;
    if (durMax !== undefined) filters.durMax = durMax;
  }
  return filters;
}

/** Lector de un objeto `searchParams` de página. */
export function fromRecord(params: Record<string, Raw>): (key: string) => Raw {
  return (key) => params[key];
}

/** Valores de URL de los filtros (para `searchHref`). */
export function filtersToParams(filters: AdvancedFilters): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(filters) as [AdvancedFilterKey, AdvancedFilters[AdvancedFilterKey]][]) {
    if (value === undefined) continue;
    params[key] = typeof value === "boolean" ? (value ? "1" : "0") : String(value);
  }
  return params;
}

/** Cuántos filtros del panel están activos; un rango cuenta una vez (como su chip). */
export function activeFilterCount(filters: AdvancedFilters): number {
  const set = (...keys: AdvancedFilterKey[]) => keys.some((key) => filters[key] !== undefined);
  return [
    set("country"),
    set("beginFrom", "beginTo"),
    set("ended"),
    set("yearFrom", "yearTo"),
    set("artist"),
    set("durMin", "durMax"),
  ].filter(Boolean).length;
}

export function hasActiveFilters(filters: AdvancedFilters): boolean {
  return activeFilterCount(filters) > 0;
}

/** Al cambiar de tipo, solo los filtros que el tipo destino entiende (`artist` entre Álbumes y Canciones). */
export function filtersForType(target: SearchType, filters: AdvancedFilters): AdvancedFilters {
  const kept: AdvancedFilters = {};
  for (const key of FILTER_KEYS[target]) {
    if (filters[key] !== undefined) Object.assign(kept, { [key]: filters[key] });
  }
  return kept;
}

/** Los filtros sin `key` (enlace de un chip). Un rango se quita entero. */
export function withoutFilter(filters: AdvancedFilters, key: AdvancedFilterKey): AdvancedFilters {
  const pairs: Partial<Record<AdvancedFilterKey, AdvancedFilterKey>> = {
    beginFrom: "beginTo",
    beginTo: "beginFrom",
    yearFrom: "yearTo",
    yearTo: "yearFrom",
    durMin: "durMax",
    durMax: "durMin",
  };
  const rest = { ...filters };
  delete rest[key];
  const pair = pairs[key];
  if (pair) delete rest[pair];
  return rest;
}

/** `m:ss` de una duración en segundos. */
export function formatDuration(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** Segundos desde `m:ss` o minutos sueltos; `undefined` si no se entiende. */
export function parseDurationInput(value: string): number | undefined {
  const raw = value.trim();
  const match = /^(\d{1,3})(?::([0-5]\d))?$/.exec(raw);
  if (!match) return undefined;
  const seconds = Number(match[1]) * 60 + (match[2] ? Number(match[2]) : 0);
  return seconds <= MAX_DURATION_SEC ? seconds : undefined;
}
