import { apiFetch } from "./client";
import {
  ReleaseGroupMarksSchema,
  type ReleaseGroupMarks,
  AlbumSearchResponseSchema,
  ArtistFollowResponseSchema,
  ArtistSearchResponseSchema,
  ArtistWithDiscographySchema,
  CoverSchema,
  ExtraTracksResponseSchema,
  ReleaseWithTracksSchema,
  SearchSuggestionsResponseSchema,
  SongSearchResponseSchema,
  type AlbumSearchResponse,
  type ArtistFollowResponse,
  type ArtistSearchResponse,
  type ArtistWithDiscography,
  type Cover,
  type ExtraTracksResponse,
  type ReleaseWithTracks,
  type SearchSuggestionsResponse,
  type SongSearchResponse,
} from "./schemas";

/** Filtros opcionales de la búsqueda por tipo (openspec: redesign-scoped-search). */
export interface CatalogSearchFilters {
  offset?: number;
  artistType?: "person" | "group";
  category?: string;
  decade?: number;
  /**
   * `pick`: elegir un objetivo (diálogo "Añadir"); en Canciones trae todos los grupos con
   * grabación identidad y sin apariciones (openspec: speed-up-quick-actions-search).
   */
  purpose?: "pick";
  /** Abortar libera también el turno de la búsqueda en la cola de MusicBrainz del servidor. */
  signal?: AbortSignal;
}

function searchParams(type: string, query: string, filters: CatalogSearchFilters): URLSearchParams {
  const params = new URLSearchParams({ type, q: query });
  if (filters.offset) params.set("offset", String(filters.offset));
  if (filters.artistType) params.set("artistType", filters.artistType);
  if (filters.category) params.set("category", filters.category);
  if (filters.decade !== undefined) params.set("decade", String(filters.decade));
  if (filters.purpose) params.set("purpose", filters.purpose);
  return params;
}

function searchInit(filters: CatalogSearchFilters): RequestInit | undefined {
  return filters.signal ? { signal: filters.signal } : undefined;
}

export function searchArtists(query: string, filters: CatalogSearchFilters = {}): Promise<ArtistSearchResponse> {
  return apiFetch(`/api/catalog/search?${searchParams("artist", query, filters)}`, ArtistSearchResponseSchema, searchInit(filters));
}

export function searchAlbums(query: string, filters: CatalogSearchFilters = {}): Promise<AlbumSearchResponse> {
  return apiFetch(`/api/catalog/search?${searchParams("album", query, filters)}`, AlbumSearchResponseSchema, searchInit(filters));
}

export function searchSongs(query: string, filters: CatalogSearchFilters = {}): Promise<SongSearchResponse> {
  return apiFetch(`/api/catalog/search?${searchParams("song", query, filters)}`, SongSearchResponseSchema, searchInit(filters));
}

/** Sugerencias locales del buscador (nunca salen a MusicBrainz). */
export function getSearchSuggestions(
  type: "artist" | "album" | "song" | "user",
  query: string,
  signal?: AbortSignal,
): Promise<SearchSuggestionsResponse> {
  const params = new URLSearchParams({ type, q: query });
  return apiFetch(`/api/search/suggest?${params}`, SearchSuggestionsResponseSchema, { signal });
}

export function getArtistById(id: string): Promise<ArtistWithDiscography> {
  return apiFetch(`/api/catalog/artist/${id}`, ArtistWithDiscographySchema);
}

export function getReleaseGroupDetail(id: string): Promise<ReleaseWithTracks> {
  return apiFetch(`/api/catalog/release-group/${id}`, ReleaseWithTracksSchema);
}

export function getReleaseGroupCover(id: string): Promise<Cover> {
  return apiFetch(`/api/catalog/release-group/${id}/cover`, CoverSchema);
}

/** Pistas que una edición agrega a la lista del álbum (sección desplegable de Canciones). */
export function getEditionExtraTracks(releaseGroupId: string, editionId: string): Promise<ExtraTracksResponse> {
  return apiFetch(
    `/api/catalog/release-group/${releaseGroupId}/editions/${editionId}/extra-tracks`,
    ExtraTracksResponseSchema,
  );
}

// Seguir / dejar de seguir un artista (openspec: add-artist-following).
// Ambos idempotentes en el servidor.
export function followArtist(id: string): Promise<ArtistFollowResponse> {
  return apiFetch(`/api/artists/${id}/follow`, ArtistFollowResponseSchema, { method: "PUT" });
}

// Marcas propias sobre un disco, para el menú de acciones fuera de la discografía
// (openspec: extend-album-quick-actions).
export function getReleaseGroupMarks(id: string): Promise<ReleaseGroupMarks> {
  return apiFetch(`/api/me/release-groups/${id}/marks`, ReleaseGroupMarksSchema);
}

export function unfollowArtist(id: string): Promise<ArtistFollowResponse> {
  return apiFetch(`/api/artists/${id}/follow`, ArtistFollowResponseSchema, { method: "DELETE" });
}
