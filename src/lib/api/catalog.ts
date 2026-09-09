import { apiFetch } from "./client";
import {
  ArtistFollowResponseSchema,
  ArtistWithDiscographySchema,
  CatalogSearchResponseSchema,
  CoverSchema,
  ReleaseWithTracksSchema,
  type ArtistFollowResponse,
  type ArtistWithDiscography,
  type CatalogSearchResponse,
  type Cover,
  type ReleaseWithTracks,
} from "./schemas";

export function searchCatalog(query: string): Promise<CatalogSearchResponse> {
  const params = new URLSearchParams({ q: query });
  return apiFetch(`/api/catalog/search?${params}`, CatalogSearchResponseSchema);
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

// Seguir / dejar de seguir un artista (openspec: add-artist-following).
// Ambos idempotentes en el servidor.
export function followArtist(id: string): Promise<ArtistFollowResponse> {
  return apiFetch(`/api/artists/${id}/follow`, ArtistFollowResponseSchema, { method: "PUT" });
}

export function unfollowArtist(id: string): Promise<ArtistFollowResponse> {
  return apiFetch(`/api/artists/${id}/follow`, ArtistFollowResponseSchema, { method: "DELETE" });
}
