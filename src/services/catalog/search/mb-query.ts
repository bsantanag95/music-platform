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
// Filtros de la búsqueda avanzada (openspec: add-advanced-search-phase1): `country:AR`,
// `begin:[1980 TO 1989-12-31]` y `ended:true` en artistas; `firstreleasedate` y `artist:"…"` en
// release-groups; `artist:"…"` y `dur:[0 TO 420000]` (ms) en recordings. Extremo abierto: `*`.

import type { ReleaseGroupCategoryValue } from "../ingest-release-group";

export type ArtistTypeFilter = "person" | "group";

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

export interface ArtistQueryFilters {
  country?: string;
  beginFrom?: number;
  beginTo?: number;
  ended?: boolean;
}

export function artistQuery(
  query: string,
  artistType?: ArtistTypeFilter,
  filters: ArtistQueryFilters = {},
): string {
  const text = escapeLucene(query.trim());
  const clauses: string[] = [];
  if (artistType) clauses.push(`type:${artistType}`);
  if (filters.country) clauses.push(`country:${escapeLucene(filters.country)}`);
  const begin = yearRangeClause("begin", filters.beginFrom, filters.beginTo);
  if (begin) clauses.push(begin);
  if (filters.ended !== undefined) clauses.push(`ended:${filters.ended}`);
  return clauses.length ? [`(${text})`, ...clauses].join(" AND ") : text;
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

export interface ReleaseGroupQueryOptions {
  category?: ReleaseGroupCategoryValue;
  /** Primer año de la década (1970, 1980, …). Un rango de años la reemplaza. */
  decade?: number;
  yearFrom?: number;
  yearTo?: number;
  /** Artista principal acreditado. */
  artist?: string;
}

function filterClauses(options: ReleaseGroupQueryOptions): string[] {
  const clauses: string[] = [];
  if (options.category) clauses.push(`(${CATEGORY_CLAUSE[options.category]})`);
  const years =
    yearRangeClause("firstreleasedate", options.yearFrom, options.yearTo) ??
    (options.decade !== undefined ? yearRangeClause("firstreleasedate", options.decade, options.decade + 9) : null);
  if (years) clauses.push(years);
  if (options.artist) clauses.push(`artist:"${escapeLucenePhrase(options.artist.trim())}"`);
  return clauses;
}

export function releaseGroupQuery(query: string, options: ReleaseGroupQueryOptions = {}): string {
  const clauses = filterClauses(options);
  const text = escapeLucene(query.trim());
  return clauses.length ? [`(${text})`, ...clauses].join(" AND ") : text;
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
}

/** `dur` de MusicBrainz va en milisegundos. */
export function durationClause({ durMin, durMax }: RecordingQueryFilters): string | null {
  if (durMin === undefined && durMax === undefined) return null;
  const ms = (seconds: number | undefined, edge: number) => (seconds === undefined ? "*" : String(seconds * 1000 + edge));
  return `dur:[${ms(durMin, 0)} TO ${ms(durMax, 999)}]`;
}

/** Agrega el filtro de duración a una consulta de recordings ya armada. */
export function withRecordingFilters(query: string, filters: RecordingQueryFilters = {}): string {
  const clause = durationClause(filters);
  return clause ? `(${query}) AND ${clause}` : query;
}

export function recordingFreeQuery(query: string): string {
  return escapeLucene(query.trim());
}

export function recordingFieldQuery(artist: string, title: string): string {
  return `recording:"${escapeLucenePhrase(title.trim())}" AND artist:"${escapeLucenePhrase(artist.trim())}"`;
}
