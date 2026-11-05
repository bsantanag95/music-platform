// Constructores de consultas Lucene para la búsqueda de MusicBrainz
// (openspec: redesign-scoped-search). Solo arman el texto de `query=`; la
// salida a la red sigue siendo exclusiva de `musicbrainz/client.ts`.
//
// Sintaxis verificada contra la API real (2026-09-26):
//   - `(<texto>) AND type:person` filtra artistas por tipo;
//   - `firstreleasedate:[1970 TO 1979-12-31]` (el límite superior necesita
//     fecha completa: el rango compara como texto y "1979-05" > "1979");
//   - `releasegroup:"…" AND artist:"…"` / `recording:"…" AND artist:"…"`
//     resuelven el separador explícito "Artista - Título".
//
// Criterios de la búsqueda avanzada (openspec: add-advanced-search-phase1, redesign-advanced-search):
// `country:(AR OR CL)`, `beginarea:"…"`, `begin:[1980 TO 1989-12-31]` y `ended:true` en artistas;
// `firstreleasedate`, `artist:"…"` y tipos en release-groups; `artist:"…"`, `release:"…"`, tipos y
// `dur:[0 TO 420000]` (ms) en recordings. Extremo abierto: `*`. Sin texto libre, la consulta es
// solo de campos (verificado contra la API real, 2026-11-01). Con coincidencia exacta, el texto va
// como frase en su campo y el filtro exacto se reaplica sobre lo que vuelve.

import type { ReleaseGroupCategoryValue } from "../ingest-release-group";

/** Tipo de artista de la búsqueda (openspec: split-person-search-types). `solo` y `other` son personas. */
export type ArtistTypeFilter = "group" | "solo" | "other";

const LUCENE_SPECIAL = /[+\-&|!(){}[\]^"~*?:\\/]/g;

/** Escapa un texto libre para que MusicBrainz no lo interprete como sintaxis ("AC/DC"). */
export function escapeLucene(value: string): string {
  return value.replace(LUCENE_SPECIAL, (char) => `\\${char}`);
}

/** Escapa un texto para usarlo como frase entre comillas. */
export function escapeLucenePhrase(value: string): string {
  return value.replace(/(["\\])/g, "\\$1");
}

/** Rango de años sobre un campo de fecha; el límite superior lleva fecha completa (ver arriba). */
export function yearRangeClause(field: string, from: number | undefined, to: number | undefined): string | null {
  if (from === undefined && to === undefined) return null;
  return `${field}:[${from ?? "*"} TO ${to !== undefined ? `${to}-12-31` : "*"}]`;
}

/** Frase entre comillas en un campo (`artist:"Iron Maiden"`). */
export function phraseClause(field: string, value: string): string {
  return `${field}:"${escapeLucenePhrase(value.trim())}"`;
}

/** Sin acentos: el índice de áreas los ignora, y así no dependen de cómo se codifiquen. */
function withoutAccents(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Texto (libre o en su campo) y cláusulas, unidos con AND. Sin texto, solo las cláusulas. */
function joinQuery(text: string, clauses: string[]): string {
  if (!text) return clauses.join(" AND ");
  return clauses.length ? [`(${text})`, ...clauses].join(" AND ") : text;
}

export interface ArtistQueryFilters {
  artistType?: ArtistTypeFilter;
  /** Nombre exacto: el texto va como frase en `artist:`. */
  exact?: boolean;
  country?: string[];
  area?: string;
  beginFrom?: number;
  beginTo?: number;
  ended?: boolean;
}

export function artistQuery(query: string, filters: ArtistQueryFilters = {}): string {
  const trimmed = query.trim();
  const text = !trimmed ? "" : filters.exact ? phraseClause("artist", trimmed) : escapeLucene(trimmed);
  const clauses: string[] = [];
  // Solista es una persona en MusicBrainz; Otras personas nunca llega aquí (es solo del catálogo).
  if (filters.artistType) clauses.push(`type:${filters.artistType === "group" ? "group" : "person"}`);
  if (filters.country?.length) clauses.push(`country:(${filters.country.map(escapeLucene).join(" OR ")})`);
  if (filters.area) clauses.push(phraseClause("beginarea", withoutAccents(filters.area)));
  const begin = yearRangeClause("begin", filters.beginFrom, filters.beginTo);
  if (begin) clauses.push(begin);
  if (filters.ended !== undefined) clauses.push(`ended:${filters.ended}`);
  return joinQuery(text, clauses);
}

// Categorías propias (`mapReleaseGroupCategory`) traducidas a cláusulas de
// MusicBrainz. Son una aproximación para que la página remota venga filtrada;
// el filtro exacto se reaplica localmente sobre la categoría mapeada.
// Un `Album` con un tipo secundario (salvo Soundtrack) deja de ser de estudio (design D13 de
// redesign-song-page): la lista explícita de tipos secundarios de MusicBrainz.
const NON_STUDIO_SECONDARY =
  'spokenword OR interview OR audiobook OR "audio drama" OR remix OR "dj-mix" OR "mixtape/street" OR demo OR "field recording"';

const CATEGORY_CLAUSE: Record<ReleaseGroupCategoryValue, string> = {
  studio: `primarytype:album AND NOT secondarytype:(compilation OR live OR ${NON_STUDIO_SECONDARY})`,
  single_ep: "primarytype:(single OR ep) AND NOT secondarytype:(compilation OR live)",
  compilation: "secondarytype:compilation",
  live_other:
    `(secondarytype:live OR NOT primarytype:(album OR single OR ep) OR (primarytype:album AND secondarytype:(${NON_STUDIO_SECONDARY}))) AND NOT secondarytype:compilation`,
};

/** Una o varias categorías: `(A)` o `((A) OR (B))`. Vale para release-groups y recordings. */
export function categoriesClause(categories: readonly ReleaseGroupCategoryValue[] | undefined): string | null {
  if (!categories?.length) return null;
  if (categories.length === 1) return `(${CATEGORY_CLAUSE[categories[0]!]})`;
  return `(${categories.map((category) => `(${CATEGORY_CLAUSE[category]})`).join(" OR ")})`;
}

export interface ReleaseGroupQueryOptions {
  categories?: ReleaseGroupCategoryValue[];
  /** Primer año de la década (1970, 1980, …). Un rango de años la reemplaza. */
  decade?: number;
  yearFrom?: number;
  yearTo?: number;
  /** Artista principal acreditado (frase en `artist:`). */
  artist?: string;
  /** Artista exacto: en MusicBrainz la misma frase; la igualdad se reaplica sobre lo que vuelve. */
  artistExact?: boolean;
  /** Título exacto: el texto va como frase en `releasegroup:`. */
  exact?: boolean;
}

function filterClauses(options: ReleaseGroupQueryOptions): string[] {
  const clauses: string[] = [];
  const categories = categoriesClause(options.categories);
  if (categories) clauses.push(categories);
  const years =
    yearRangeClause("firstreleasedate", options.yearFrom, options.yearTo) ??
    (options.decade !== undefined ? yearRangeClause("firstreleasedate", options.decade, options.decade + 9) : null);
  if (years) clauses.push(years);
  if (options.artist) clauses.push(phraseClause("artist", options.artist));
  return clauses;
}

export function releaseGroupQuery(query: string, options: ReleaseGroupQueryOptions = {}): string {
  const trimmed = query.trim();
  const text = !trimmed ? "" : options.exact ? phraseClause("releasegroup", trimmed) : escapeLucene(trimmed);
  return joinQuery(text, filterClauses(options));
}

/** Consulta con campos explícitos para "Artista - Título". */
export function releaseGroupFieldQuery(
  artist: string,
  title: string,
  options: ReleaseGroupQueryOptions = {},
): string {
  return [
    `releasegroup:"${escapeLucenePhrase(title.trim())}"`,
    `artist:"${escapeLucenePhrase(artist.trim())}"`,
    ...filterClauses(options),
  ].join(" AND ");
}

export interface RecordingQueryFilters {
  /** Duración en segundos. */
  durMin?: number;
  durMax?: number;
  /** Título de un álbum donde aparece (`release:`). */
  album?: string;
  /** Tipos de lanzamiento del release-group de sus ediciones. */
  categories?: ReleaseGroupCategoryValue[];
}

/** `dur` de MusicBrainz va en milisegundos. */
export function durationClause({ durMin, durMax }: RecordingQueryFilters): string | null {
  if (durMin === undefined && durMax === undefined) return null;
  const ms = (seconds: number | undefined, edge: number) => (seconds === undefined ? "*" : String(seconds * 1000 + edge));
  return `dur:[${ms(durMin, 0)} TO ${ms(durMax, 999)}]`;
}

/** Agrega álbum, tipos y duración a una consulta de recordings ya armada (puede ir vacía). */
export function withRecordingFilters(query: string, filters: RecordingQueryFilters = {}): string {
  const clauses: string[] = [];
  if (filters.album) clauses.push(phraseClause("release", filters.album));
  const categories = categoriesClause(filters.categories);
  if (categories) clauses.push(categories);
  const duration = durationClause(filters);
  if (duration) clauses.push(duration);
  return joinQuery(query, clauses);
}

export function recordingFreeQuery(query: string): string {
  return escapeLucene(query.trim());
}

export function recordingFieldQuery(artist: string, title: string): string {
  return `recording:"${escapeLucenePhrase(title.trim())}" AND artist:"${escapeLucenePhrase(artist.trim())}"`;
}
