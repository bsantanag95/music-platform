import { apiFetch } from "./client";
import { GenreSearchResponseSchema, type GenreSearchResponse } from "./schemas";

// Búsqueda de géneros (openspec: show-genres): GET /api/genres/search?q=. Sin `q` devuelve los
// géneros más usados (sugerencias iniciales del selector).
export function searchGenres(query: string): Promise<GenreSearchResponse> {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  return apiFetch(`/api/genres/search${params.size > 0 ? `?${params}` : ""}`, GenreSearchResponseSchema);
}
