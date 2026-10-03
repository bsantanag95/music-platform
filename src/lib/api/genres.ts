import { apiFetch } from "./client";
import {
  AlbumGenreVotesResponseSchema,
  GenreSearchResponseSchema,
  type AlbumGenreVotesResponse,
  type GenreSearchResponse,
} from "./schemas";

// Búsqueda de géneros (openspec: show-genres): GET /api/genres/search?q=. Sin `q` devuelve los
// géneros más usados (sugerencias iniciales del selector).
export function searchGenres(query: string): Promise<GenreSearchResponse> {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  return apiFetch(`/api/genres/search${params.size > 0 ? `?${params}` : ""}`, GenreSearchResponseSchema);
}

// Votos de género de un álbum (openspec: add-genre-votes). PUT crea o cambia el voto propio,
// DELETE lo retira; ambos devuelven el estado actualizado del panel.
export function getAlbumGenreVotes(releaseGroupId: string): Promise<AlbumGenreVotesResponse> {
  return apiFetch(`/api/catalog/release-group/${releaseGroupId}/genre-votes`, AlbumGenreVotesResponseSchema);
}

export function castGenreVote(releaseGroupId: string, slug: string, value: 1 | -1): Promise<AlbumGenreVotesResponse> {
  return apiFetch(`/api/me/release-groups/${releaseGroupId}/genre-votes/${slug}`, AlbumGenreVotesResponseSchema, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ value }),
  });
}

export function removeGenreVote(releaseGroupId: string, slug: string): Promise<AlbumGenreVotesResponse> {
  return apiFetch(`/api/me/release-groups/${releaseGroupId}/genre-votes/${slug}`, AlbumGenreVotesResponseSchema, {
    method: "DELETE",
  });
}
