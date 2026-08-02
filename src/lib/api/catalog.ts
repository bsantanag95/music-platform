import { apiFetch } from "./client";
import {
  ArtistWithDiscographySchema,
  ReleaseWithTracksSchema,
  type ArtistWithDiscography,
  type ReleaseWithTracks,
} from "./schemas";

export function searchCatalog(query: string): Promise<ArtistWithDiscography> {
  const params = new URLSearchParams({ q: query });
  return apiFetch(`/api/catalog/search?${params}`, ArtistWithDiscographySchema);
}

export function getArtistById(id: string): Promise<ArtistWithDiscography> {
  return apiFetch(`/api/catalog/artist/${id}`, ArtistWithDiscographySchema);
}

export function getReleaseGroupDetail(id: string): Promise<ReleaseWithTracks> {
  return apiFetch(`/api/catalog/release-group/${id}`, ReleaseWithTracksSchema);
}
