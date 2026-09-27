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

export function artistQuery(query: string, artistType?: ArtistTypeFilter): string {
  const text = escapeLucene(query.trim());
  return artistType ? `(${text}) AND type:${artistType}` : text;
}

// Categorías propias (`mapReleaseGroupCategory`) traducidas a cláusulas de
// MusicBrainz. Son una aproximación para que la página remota venga filtrada;
// el filtro exacto se reaplica localmente sobre la categoría mapeada.
// Un `Album` con cualquier tipo secundario deja de ser de estudio (design D13 de
// redesign-song-page): la lista explícita de tipos secundarios de MusicBrainz.
const NON_STUDIO_SECONDARY =
  'soundtrack OR spokenword OR interview OR audiobook OR "audio drama" OR remix OR "dj-mix" OR "mixtape/street" OR demo OR "field recording"';

const CATEGORY_CLAUSE: Record<ReleaseGroupCategoryValue, string> = {
  studio: `primarytype:album AND NOT secondarytype:(compilation OR live OR ${NON_STUDIO_SECONDARY})`,
  single_ep: "primarytype:(single OR ep) AND NOT secondarytype:(compilation OR live)",
  compilation: "secondarytype:compilation",
  live_other:
    `(secondarytype:live OR NOT primarytype:(album OR single OR ep) OR (primarytype:album AND secondarytype:(${NON_STUDIO_SECONDARY}))) AND NOT secondarytype:compilation`,
};

export interface ReleaseGroupQueryOptions {
  category?: ReleaseGroupCategoryValue;
  /** Primer año de la década (1970, 1980, …). */
  decade?: number;
}

function filterClauses(options: ReleaseGroupQueryOptions): string[] {
  const clauses: string[] = [];
  if (options.category) clauses.push(`(${CATEGORY_CLAUSE[options.category]})`);
  if (options.decade !== undefined) {
    clauses.push(`firstreleasedate:[${options.decade} TO ${options.decade + 9}-12-31]`);
  }
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

export function recordingFreeQuery(query: string): string {
  return escapeLucene(query.trim());
}

export function recordingFieldQuery(artist: string, title: string): string {
  return `recording:"${escapeLucenePhrase(title.trim())}" AND artist:"${escapeLucenePhrase(artist.trim())}"`;
}
