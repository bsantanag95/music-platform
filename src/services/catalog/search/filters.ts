// Criterios de la búsqueda avanzada (openspec: add-advanced-search-phase1, redesign-advanced-search).
// Un único lector tolerante para la búsqueda rápida (/search), la página avanzada (/search/advanced),
// el endpoint y los formularios del cliente (módulo sin dependencias de servidor). Cada criterio se
// aplica igual a la base local y a MusicBrainz.

import type { ReleaseGroupCategoryValue } from "../ingest-release-group";
import type { AlbumSearchOptions } from "./albums";
import type { AlbumCatalogFilters, ArtistCatalogFilters } from "./catalog-fields";
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
  // Campos del catálogo (openspec: add-catalog-search-fields): MusicBrainz no los indexa, así que una búsqueda con
  // alguno se resuelve solo con la base propia (`isCatalogOnly`).
  /** Artistas: años de actividad (primer al último disco propio, hasta hoy si sigue activo). */
  activeFrom?: number;
  activeTo?: number;
  /** Artistas, solo con `artistType=person`: rol en el catálogo. */
  role?: ArtistRole;
  /** Artistas y Álbumes: slug de un género de la taxonomía propia (con sus subgéneros). */
  genre?: string;
  /** Artistas y Álbumes: `any` o el slug de un premio o salón de la fama. */
  award?: string;
  /** Con `award`: solo lo que lo ganó. */
  awardWon?: boolean;
  /** Álbumes: país (ISO 3166-1 alfa-2) de algún artista principal. */
  artistCountry?: string[];
}

export const ARTIST_ROLES = ["own", "member", "producer", "musician"] as const;
export type ArtistRole = (typeof ARTIST_ROLES)[number];

/** Claves que MusicBrainz no sabe filtrar: con alguna, la búsqueda es solo del catálogo. */
export const CATALOG_ONLY_KEYS: readonly CriteriaKey[] = [
  "activeFrom",
  "activeTo",
  "role",
  "genre",
  "award",
  "awardWon",
  "artistCountry",
];

/** La búsqueda tiene algún campo del catálogo (los criterios ya vienen acotados al tipo por `parseCriteria`). */
export function isCatalogOnly(criteria: SearchCriteria): boolean {
  return CATALOG_ONLY_KEYS.some((key) => criteria[key] !== undefined);
}

export type CriteriaKey = keyof SearchCriteria;

/** Parámetros de cada tipo. */
export const CRITERIA_KEYS: Record<SearchType, readonly CriteriaKey[]> = {
  artist: [
    "exact",
    "artistType",
    "country",
    "area",
    "beginFrom",
    "beginTo",
    "ended",
    "activeFrom",
    "activeTo",
    "role",
    "genre",
    "award",
    "awardWon",
  ],
  album: ["exact", "artist", "artistExact", "yearFrom", "yearTo", "category", "genre", "artistCountry", "award", "awardWon"],
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

/** Slug de la taxonomía o de un premio: minúsculas, dígitos y guiones. Si existe lo decide la base. */
function parseSlug(values: string[]): string | undefined {
  const raw = firstOf(values)?.toLowerCase();
  return raw && /^[a-z0-9][a-z0-9-]{0,79}$/.test(raw) ? raw : undefined;
}

function parseCountry(raw: string): string | undefined {
  const code = raw.toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : undefined;
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
  set("country", parseList(read("country"), parseCountry));
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
  const [activeFrom, activeTo] = ordered(parseYear(read("activeFrom"), 1900, 2100), parseYear(read("activeTo"), 1900, 2100));
  set("activeFrom", activeFrom);
  set("activeTo", activeTo);
  // El rol solo tiene sentido para una persona: sin Persona se ignora, como una bandera sin su campo.
  const role = firstOf(read("role"));
  if (artistType === "person" && (ARTIST_ROLES as readonly string[]).includes(role ?? "")) set("role", role as ArtistRole);
  set("genre", parseSlug(read("genre")));
  const award = parseSlug(read("award"));
  set("award", award);
  if (award && keys.includes("award") && parseFlag(read("awardWon"))) set("awardWon", true);
  set("artistCountry", parseList(read("artistCountry"), parseCountry));
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
 * entre Álbumes y Canciones; género y premios entre Artistas y Álbumes. `q` no se arrastra (es nombre en
 * una pestaña y título en otra).
 */
export function criteriaForTab(target: SearchType, criteria: SearchCriteria): SearchCriteria {
  const kept: SearchCriteria = {};
  // Género y premios significan lo mismo en Artistas y Álbumes (openspec: add-catalog-search-fields).
  if (target === "artist" || target === "album") {
    if (criteria.genre) kept.genre = criteria.genre;
    if (criteria.award) kept.award = criteria.award;
    if (criteria.award && criteria.awardWon) kept.awardWon = true;
  }
  if (target !== "album" && target !== "song") return kept;
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

/** Campos del catálogo de Artistas (openspec: add-catalog-search-fields). */
export function artistCatalogFilters(criteria: SearchCriteria): ArtistCatalogFilters {
  const { activeFrom, activeTo, role, genre, award, awardWon } = criteria;
  return { activeFrom, activeTo, role, genre, award, awardWon };
}

/** Campos del catálogo de Álbumes (openspec: add-catalog-search-fields). */
export function albumCatalogFilters(criteria: SearchCriteria): AlbumCatalogFilters {
  const { genre, award, awardWon, artistCountry } = criteria;
  return { genre, award, awardWon, artistCountry };
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

// Barra de criterios de la búsqueda avanzada (openspec: refine-advanced-search-phase1, design D1): una pastilla por
// criterio activo, en el orden del formulario. Un rango es una pastilla; cada país y cada tipo de lanzamiento, una.

export type CriterionChip =
  | { id: "q" }
  | { id: "artistType" }
  | { id: "country"; value: string }
  | { id: "area" }
  | { id: "begin" }
  | { id: "ended" }
  | { id: "artist" }
  | { id: "year" }
  | { id: "category"; value: ReleaseGroupCategoryValue }
  | { id: "album" }
  | { id: "duration" }
  | { id: "active" }
  | { id: "role" }
  | { id: "genre" }
  | { id: "award" }
  | { id: "artistCountry"; value: string };

/** Criterios activos de la búsqueda, como pastillas. */
export function criterionChips(type: SearchType, query: string, criteria: SearchCriteria): CriterionChip[] {
  const chips: CriterionChip[] = [];
  if (query.trim()) chips.push({ id: "q" });
  if (type === "artist") {
    if (criteria.artistType) chips.push({ id: "artistType" });
    criteria.country?.forEach((value) => chips.push({ id: "country", value }));
    if (criteria.area) chips.push({ id: "area" });
    if (criteria.beginFrom !== undefined || criteria.beginTo !== undefined) chips.push({ id: "begin" });
    if (criteria.ended !== undefined) chips.push({ id: "ended" });
    if (criteria.role) chips.push({ id: "role" });
    if (criteria.activeFrom !== undefined || criteria.activeTo !== undefined) chips.push({ id: "active" });
    catalogChips(criteria, chips);
    return chips;
  }
  if (criteria.artist) chips.push({ id: "artist" });
  if (type === "album" && (criteria.yearFrom !== undefined || criteria.yearTo !== undefined)) chips.push({ id: "year" });
  criteria.category?.forEach((value) => chips.push({ id: "category", value }));
  if (type === "song") {
    if (criteria.album) chips.push({ id: "album" });
    if (criteria.durMin !== undefined || criteria.durMax !== undefined) chips.push({ id: "duration" });
  }
  if (type === "album") {
    catalogChips(criteria, chips);
    criteria.artistCountry?.forEach((value) => chips.push({ id: "artistCountry", value }));
  }
  return chips;
}

/** Género y premios, en el orden del grupo "Del catálogo". */
function catalogChips(criteria: SearchCriteria, chips: CriterionChip[]): void {
  if (criteria.genre) chips.push({ id: "genre" });
  if (criteria.award) chips.push({ id: "award" });
}

/** La misma búsqueda sin un criterio. Quitar un texto quita también su coincidencia exacta. */
export function removeCriterion(
  query: string,
  criteria: SearchCriteria,
  chip: CriterionChip,
): { query: string; criteria: SearchCriteria } {
  const next: SearchCriteria = { ...criteria };
  let nextQuery = query;
  const without = <T,>(list: T[] | undefined, value: T) => {
    const rest = list?.filter((item) => item !== value);
    return rest && rest.length > 0 ? rest : undefined;
  };
  switch (chip.id) {
    case "q":
      nextQuery = "";
      delete next.exact;
      break;
    case "country":
      next.country = without(next.country, chip.value);
      break;
    case "category":
      next.category = without(next.category, chip.value);
      break;
    case "artistCountry":
      next.artistCountry = without(next.artistCountry, chip.value);
      break;
    case "active":
      delete next.activeFrom;
      delete next.activeTo;
      break;
    case "award":
      delete next.award;
      delete next.awardWon;
      break;
    case "begin":
      delete next.beginFrom;
      delete next.beginTo;
      break;
    case "year":
      delete next.yearFrom;
      delete next.yearTo;
      break;
    case "duration":
      delete next.durMin;
      delete next.durMax;
      break;
    case "artist":
      delete next.artist;
      delete next.artistExact;
      break;
    case "album":
      delete next.album;
      delete next.albumExact;
      break;
    default:
      delete next[chip.id];
  }
  for (const key of Object.keys(next) as CriteriaKey[]) if (next[key] === undefined) delete next[key];
  return { query: nextQuery, criteria: next };
}

// Validación del formulario y valores ignorados de la URL (openspec: refine-advanced-search-phase2, design D3 y D4).

/** Rangos del formulario de cada tipo: campos "desde" y "hasta", y si son años (con su mínimo) o duraciones. */
const FORM_RANGES: Record<SearchType, { range: FormRange; from: string; to: string; minYear?: number }[]> = {
  artist: [
    { range: "begin", from: "beginFrom", to: "beginTo", minYear: 1000 },
    { range: "active", from: "activeFrom", to: "activeTo", minYear: 1900 },
  ],
  album: [{ range: "year", from: "yearFrom", to: "yearTo", minYear: 1900 }],
  song: [{ range: "duration", from: "durMin", to: "durMax" }],
  user: [],
};

export type FormRangeError = "yearFormat" | "durationFormat" | "rangeOrder";
export type FormRange = "begin" | "active" | "year" | "duration";

/**
 * Errores del formulario por rango (`begin`, `year`, `duration`), con el primer campo a enfocar. Vacío = válido. Los
 * vacíos no son error; un rango invertido sí (por URL, en cambio, se intercambia).
 */
export function validateAdvancedForm(
  type: SearchType,
  get: (name: string) => string,
): Partial<Record<FormRange, { error: FormRangeError; field: string }>> {
  const errors: Partial<Record<FormRange, { error: FormRangeError; field: string }>> = {};
  for (const { range, from, to, minYear } of FORM_RANGES[type]) {
    const read = (name: string): number | null | "invalid" => {
      const raw = get(name).trim();
      if (!raw) return null;
      if (minYear !== undefined) {
        if (!/^\d{4}$/.test(raw)) return "invalid";
        const year = Number(raw);
        return year >= minYear && year <= 2100 ? year : "invalid";
      }
      return parseDurationInput(raw) ?? "invalid";
    };
    const a = read(from);
    const b = read(to);
    const format: FormRangeError = minYear !== undefined ? "yearFormat" : "durationFormat";
    if (a === "invalid") errors[range] = { error: format, field: from };
    else if (b === "invalid") errors[range] = { error: format, field: to };
    else if (a !== null && b !== null && a > b) errors[range] = { error: "rangeOrder", field: from };
  }
  return errors;
}

/**
 * `campo=valor` de la URL que no se reconocieron y se ignoraron, solo en los campos del tipo. Las banderas de
 * coincidencia exacta sin su campo no se avisan.
 */
export function ignoredParams(type: SearchType, read: ParamReader, criteria: SearchCriteria): string[] {
  const ignored: string[] = [];
  for (const key of CRITERIA_KEYS[type]) {
    if (key === "exact" || key === "artistExact" || key === "albumExact" || key === "awardWon") continue;
    const raw = read(key)
      .map((value) => value.trim())
      .filter(Boolean);
    if (raw.length === 0) continue;
    const value = criteria[key];
    if (Array.isArray(value)) {
      const accepted = (value as string[]).map((item) => item.toUpperCase());
      raw.filter((item) => !accepted.includes(item.toUpperCase())).forEach((item) => ignored.push(`${key}=${item}`));
    } else if (value === undefined) {
      ignored.push(`${key}=${raw[0]}`);
    }
  }
  return ignored;
}

/**
 * Datos de una fila que la búsqueda filtró, para destacarlos en la lista y la tabla (openspec:
 * refine-advanced-search-phase3): así se comprueba de un vistazo que cada resultado cumple lo pedido.
 */
export type ResultHighlight =
  | "type"
  | "country"
  | "area"
  | "years"
  | "artist"
  | "year"
  | "category"
  | "album"
  | "duration"
  | "active"
  | "genre"
  | "artistCountry";

export function highlightFields(type: SearchType, criteria: SearchCriteria): ResultHighlight[] {
  const fields: ResultHighlight[] = [];
  if (type === "artist") {
    if (criteria.artistType) fields.push("type");
    if (criteria.country) fields.push("country");
    if (criteria.area) fields.push("area");
    if (criteria.beginFrom !== undefined || criteria.beginTo !== undefined || criteria.ended !== undefined) {
      fields.push("years");
    }
    if (criteria.activeFrom !== undefined || criteria.activeTo !== undefined) fields.push("active");
    return fields;
  }
  if (criteria.artist) fields.push("artist");
  if (criteria.category) fields.push("category");
  if (type === "album" && (criteria.yearFrom !== undefined || criteria.yearTo !== undefined)) fields.push("year");
  if (type === "album" && criteria.genre) fields.push("genre");
  if (type === "album" && criteria.artistCountry) fields.push("artistCountry");
  if (type === "song") {
    if (criteria.album) fields.push("album");
    if (criteria.durMin !== undefined || criteria.durMax !== undefined) fields.push("duration");
  }
  return fields;
}

/** Campo del formulario que se sugiere para acotar una búsqueda amplia, con el `name` a enfocar. */
export type NarrowingField = "country" | "beginFrom" | "artistType" | "yearFrom" | "artist" | "album" | "durMin";

/** Hasta tres campos sin valor que acotan el tipo, en orden de utilidad. */
export function narrowingFields(type: SearchType, criteria: SearchCriteria): NarrowingField[] {
  const candidates: [NarrowingField, boolean][] =
    type === "artist"
      ? [
          ["country", Boolean(criteria.country)],
          ["beginFrom", criteria.beginFrom !== undefined || criteria.beginTo !== undefined],
          ["artistType", Boolean(criteria.artistType)],
        ]
      : type === "album"
        ? [
            ["yearFrom", criteria.yearFrom !== undefined || criteria.yearTo !== undefined],
            ["artist", Boolean(criteria.artist)],
          ]
        : type === "song"
          ? [
              ["artist", Boolean(criteria.artist)],
              ["album", Boolean(criteria.album)],
              ["durMin", criteria.durMin !== undefined || criteria.durMax !== undefined],
            ]
          : [];
  return candidates.filter(([, set]) => !set).map(([field]) => field);
}
