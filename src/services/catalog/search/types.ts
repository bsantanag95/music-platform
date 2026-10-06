// Contrato de la búsqueda por tipo (openspec: redesign-scoped-search). Lo
// consumen la página /search (directo del servicio) y GET
// /api/catalog/search, cuyo espejo Zod vive en src/lib/api/schemas.ts.

import type { ReleaseGroupCategoryValue } from "../ingest-release-group";

export type SearchType = "artist" | "album" | "song" | "user";
export type CatalogSearchType = Exclude<SearchType, "user">;
export type CatalogArtistType = "person" | "group" | "various" | "unknown";

export interface ArtistSearchResult {
  kind: "artist";
  id: string;
  mbid: string | null;
  name: string;
  disambiguation: string | null;
  artistType: CatalogArtistType;
  /** ISO 3166-1 alfa-2, solo si MusicBrainz lo trajo en esta búsqueda. */
  country: string | null;
  /** Discografía ya sincronizada en la base local. */
  cached: boolean;
  /** Nombre igual a la consulta (normalizado). */
  exact: boolean;
}

export interface ArtistSearchResponse {
  type: "artist";
  results: ArtistSearchResult[];
  /** MusicBrainz falló: la lista tiene solo coincidencias locales. */
  remoteFailed: boolean;
}

export interface AlbumSearchResult {
  kind: "release-group";
  id: string;
  mbid: string | null;
  title: string;
  /** Crédito de artista principal tal como se muestra ("A & B"). */
  artistName: string | null;
  category: ReleaseGroupCategoryValue;
  year: number | null;
  /** Tracklist ya ingerida en la base local. */
  cached: boolean;
}

/** Sugerencia para acotar una consulta genérica ("Agrega el artista"). */
export interface SearchRefineHint {
  total: number;
  artists: string[];
}

export interface AlbumSearchResponse {
  type: "album";
  results: AlbumSearchResult[];
  remoteFailed: boolean;
  /** Total de coincidencias en MusicBrainz (null si la pata remota falló). */
  total: number | null;
  nextOffset: number | null;
  refine: SearchRefineHint | null;
}

export interface SongAlbum {
  /** `id` local del release_group — enlazable a `/album/<id>`. */
  id: string;
  mbid: string | null;
  title: string;
  category: ReleaseGroupCategoryValue;
  year: number | null;
}

/** Una canción (título, artista) con los álbumes que la contienen. */
export interface SongGroupResult {
  kind: "song";
  key: string;
  title: string;
  artistName: string | null;
  /** Grabación identidad, solo en el grupo resuelto (el primero). */
  recordingId: string | null;
  mbid: string | null;
  /** Álbumes que la contienen; vacío en los grupos no expandidos. */
  albums: SongAlbum[];
  /** Consulta que resuelve este grupo en primer lugar ("artista - título"). */
  query: string;
}

export interface SongInterpretation {
  song: string;
  artistName: string | null;
}

export interface SongAlternative extends SongInterpretation {
  query: string;
}

export interface SongSearchResponse {
  type: "song";
  results: SongGroupResult[];
  remoteFailed: boolean;
  total: number | null;
  nextOffset: number | null;
  interpretation: SongInterpretation | null;
  alternatives: SongAlternative[];
  refine: SearchRefineHint | null;
}

export type CatalogSearchResponse = ArtistSearchResponse | AlbumSearchResponse | SongSearchResponse;

/** Umbral de "consulta genérica" (spec search-query-matching). */
export const GENERIC_QUERY_THRESHOLD = 50;
export const REFINE_ARTIST_LIMIT = 5;
