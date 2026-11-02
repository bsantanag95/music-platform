// Criterios de la búsqueda avanzada (openspec: add-advanced-search-phase1, redesign-advanced-search).
// Un único lector tolerante para la búsqueda rápida (/search), la página avanzada (/search/advanced),
// el endpoint y los formularios del cliente (módulo sin dependencias de servidor). Cada criterio se
// aplica igual a la base local y a MusicBrainz.

import type { ReleaseGroupCategoryValue } from "../ingest-release-group";
import type { AlbumSearchOptions } from "./albums";
import type { ArtistQueryFilters } from "./mb-query";
import type { SongFilters } from "./songs";
import type { SearchType } from "./types";

type Raw = string | string[] | null | undefined;

export const CATEGORY_VALUES: readonly ReleaseGroupCategoryValue[] = ["studio", "single_ep", "compilation", "live_other"];

/** Criterios de un tipo, con los nombres de la URL. `q` (nombre o título) va aparte. */
export interface SearchCriteria {
  /** `q` debe coincidir exactamente (nombre del artista, título del álbum o de la canción). */
  exact?: boolean;
  /** Artistas. */
  artistType?: "person" | "group";
  /** Artistas: ISO 3166-1 alfa-2, uno o varios. */
  country?: string[];
  /** Artistas: ciudad o región de nacimiento o formación. */
  area?: string;
  /** Artistas: año de nacimiento o formación. */
  beginFrom?: number;
  beginTo?: number;
  /** Artistas: `true` = ya no en actividad (separados o fallecidos). */
  ended?: boolean;
  /** Álbumes y Canciones: artista principal. */
  artist?: string;
  artistExact?: boolean;
  /** Álbumes: año del primer lanzamiento. */
  yearFrom?: number;
  yearTo?: number;
  /** Álbumes y Canciones: tipos de lanzamiento (en Canciones, de los álbumes donde aparece). */
  category?: ReleaseGroupCategoryValue[];
  /** Canciones: título de un álbum donde aparece. */
  album?: string;
  albumExact?: boolean;
  /** Canciones: duración en segundos. */
  durMin?: number;
  durMax?: number;
}

export type CriteriaKey = keyof SearchCriteria;

/** Parámetros de cada tipo. */
export const CRITERIA_KEYS: Record<SearchType, readonly CriteriaKey[]> = {
  artist: ["exact", "artistType", "country", "area", "beginFrom", "beginTo", "ended"],
  album: ["exact", "artist", "artistExact", "yearFrom", "yearTo", "category"],
  song: ["exact", "artist", "artistExact", "album", "albumExact", "category", "durMin", "durMax"],
  user: [],
};

const MAX_TEXT_LENGTH = 200;
const MAX_DURATION_SEC = 7200;
const MAX_LIST = 10;

function firstOf(values: string[]): string | undefined {
  const trimmed = values[0]?.trim();
  return trimmed ? trimmed : undefined;
}

function parseYear(values: string[], min: number, max: number): number | undefined {
  const raw = firstOf(values);
  if (!raw || !/^\d{4}$/.test(raw)) return undefined;
  const year = Number(raw);
  return year >= min && year <= max ? year : undefined;
}

/** Segundos; también `m:ss`, que es lo que envía el formulario sin JavaScript. */
function parseSeconds(values: string[]): number | undefined {
  const raw = firstOf(values);
  if (!raw) return undefined;
  if (raw.includes(":")) return parseDurationInput(raw);
  if (!/^\d+$/.test(raw)) return undefined;
  const seconds = Number(raw);
  return seconds <= MAX_DURATION_SEC ? seconds : undefined;
}

function parseText(values: string[]): string | undefined {
  const raw = firstOf(values);
  return raw && raw.length <= MAX_TEXT_LENGTH ? raw : undefined;
}

function parseFlag(values: string[]): boolean {
  return firstOf(values) === "1";
}

/** Valores válidos, sin repetir, con tope. */
function parseList<T extends string>(values: string[], normalize: (raw: string) => T | undefined): T[] | undefined {
  const list: T[] = [];
  for (const raw of values) {
    const value = normalize(raw.trim());
    if (value !== undefined && !list.includes(value)) list.push(value);
    if (list.length === MAX_LIST) break;
  }
  return list.length > 0 ? list : undefined;
}

/** Rango con los extremos invertidos → se intercambian. */
function ordered(from: number | undefined, to: number | undefined): [number | undefined, number | undefined] {
  return from !== undefined && to !== undefined && from > to ? [to, from] : [from, to];
}

/** Lee todos los valores de un parámetro (repetible). */
export type ParamReader = (key: string) => string[];

export function fromRecord(params: Record<string, Raw>): ParamReader {
  return (key) => {
    const value = params[key];
    return Array.isArray(value) ? value : value ? [value] : [];
  };
}

export function fromSearchParams(params: URLSearchParams): ParamReader {
  return (key) => params.getAll(key);
}

/**
 * Criterios de `type` desde la URL. Valores inválidos, vacíos o de otro tipo se ignoran sin error.
 * Una bandera de coincidencia exacta sin su campo también (`exact` necesita `q`).
 */
export function parseCriteria(type: SearchType, read: ParamReader, query = ""): SearchCriteria {
  const criteria: SearchCriteria = {};
  const keys = CRITERIA_KEYS[type];
  const set = <K extends CriteriaKey>(key: K, value: SearchCriteria[K] | undefined) => {
    if (keys.includes(key) && value !== undefined) criteria[key] = value;
  };

  if (query.trim() && parseFlag(read("exact"))) set("exact", true);
  const artistType = firstOf(read("artistType"));
  if (artistType === "person" || artistType === "group") set("artistType", artistType);
  set(
    "country",
    parseList(read("country"), (raw) => {
      const code = raw.toUpperCase();
      return /^[A-Z]{2}$/.test(code) ? code : undefined;
    }),
  );
  set("area", parseText(read("area")));
  const [beginFrom, beginTo] = ordered(parseYear(read("beginFrom"), 1000, 2100), parseYear(read("beginTo"), 1000, 2100));
  set("beginFrom", beginFrom);
  set("beginTo", beginTo);
  const ended = firstOf(read("ended"));
  if (ended === "0" || ended === "1") set("ended", ended === "1");
  const artist = parseText(read("artist"));
  set("artist", artist);
  if (artist && parseFlag(read("artistExact"))) set("artistExact", true);
  const [yearFrom, yearTo] = ordered(parseYear(read("yearFrom"), 1900, 2100), parseYear(read("yearTo"), 1900, 2100));
  set("yearFrom", yearFrom);
  set("yearTo", yearTo);
  set(
    "category",
    parseList(read("category"), (raw) =>
      (CATEGORY_VALUES as readonly string[]).includes(raw) ? (raw as ReleaseGroupCategoryValue) : undefined,
    ),
  );
  const album = parseText(read("album"));
  set("album", album);
  if (album && parseFlag(read("albumExact"))) set("albumExact", true);
  const [durMin, durMax] = ordered(parseSeconds(read("durMin")), parseSeconds(read("durMax")));
  set("durMin", durMin);
  set("durMax", durMax);
  return criteria;
}

/** Hay algún criterio, además de `q`. */
export function hasCriteria(criteria: SearchCriteria): boolean {
  return Object.values(criteria).some((value) => value !== undefined);
}

/** Valores de URL de los criterios, en pares (los múltiples, repetidos). */
export function criteriaToParams(criteria: SearchCriteria): [string, string][] {
  const pairs: [string, string][] = [];
  for (const [key, value] of Object.entries(criteria) as [CriteriaKey, SearchCriteria[CriteriaKey]][]) {
    if (value === undefined) continue;
    if (Array.isArray(value)) value.forEach((item) => pairs.push([key, item]));
    else if (typeof value === "boolean") pairs.push([key, value ? "1" : "0"]);
    else pairs.push([key, String(value)]);
  }
  return pairs;
}

/** URL de la página avanzada. Sin `q` vacío. */
export function advancedSearchHref(type: SearchType, query: string, criteria: SearchCriteria = {}): string {
  const params = new URLSearchParams({ type });
  if (query.trim()) params.set("q", query.trim());
  for (const [key, value] of criteriaToParams(criteria)) params.append(key, value);
  return `/search/advanced?${params.toString()}`;
}

/**
 * Al cambiar de pestaña, solo lo que significa lo mismo en el destino: artista y tipos de lanzamiento
 * entre Álbumes y Canciones. `q` no se arrastra (es nombre en una pestaña y título en otra).
 */
export function criteriaForTab(target: SearchType, criteria: SearchCriteria): SearchCriteria {
  if (target !== "album" && target !== "song") return {};
  const kept: SearchCriteria = {};
  if (criteria.artist) kept.artist = criteria.artist;
  if (criteria.artistExact) kept.artistExact = true;
  if (criteria.category) kept.category = criteria.category;
  return kept;
}

/**
 * La URL de /search solo trae lo que el buscador rápido tiene: Persona/Grupo en Artistas y una
 * categoría en Álbumes (además de `q`, `decade`, `all` y `offset`). Si trae más, va a la avanzada.
 */
export function isQuickSearch(type: SearchType, criteria: SearchCriteria): boolean {
  return Object.entries(criteria).every(([key, value]) => {
    if (value === undefined) return true;
    if (type === "artist" && key === "artistType") return true;
    if (type === "album" && key === "category") return (value as unknown[]).length === 1;
    return false;
  });
}

// Criterios de la URL → opciones de cada búsqueda. `criteria` solo trae los del tipo pedido
// (`parseCriteria`); la página, las secciones y el endpoint pasan por aquí.

export function artistFilters(criteria: SearchCriteria): ArtistQueryFilters {
  const { exact, artistType, country, area, beginFrom, beginTo, ended } = criteria;
  return { exact, artistType, country, area, beginFrom, beginTo, ended };
}

export function albumOptions(criteria: SearchCriteria): AlbumSearchOptions {
  const { exact, artist, artistExact, yearFrom, yearTo, category } = criteria;
  return { exact, artist, artistExact, yearFrom, yearTo, categories: category };
}

export function songFilters(criteria: SearchCriteria): SongFilters {
  const { exact, artist, artistExact, album, albumExact, category, durMin, durMax } = criteria;
  return { exact, artist, artistExact, album, albumExact, categories: category, durMin, durMax };
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
