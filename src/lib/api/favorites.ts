import { apiFetch } from "./client";
import {
  FavoriteMutationResponseSchema,
  FavoritesAudienceBulkResponseSchema,
  FavoritesListResponseSchema,
  type FavoritesListResponse,
  type Favorite,
  type FavoriteSort,
  type FavoriteTarget,
  type SocialTargetType,
  type DiaryAudience,
} from "./schemas";
import { z } from "zod";

export interface FavoritesFiltersParams {
  q?: string;
  type?: SocialTargetType;
  audience?: DiaryAudience;
  sort?: FavoriteSort;
}

function favoritesFiltersQuery(filters: FavoritesFiltersParams = {}): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.type) params.set("type", filters.type);
  if (filters.audience) params.set("audience", filters.audience);
  if (filters.sort) params.set("sort", filters.sort);
  const query = params.toString();
  return query ? `&${query}` : "";
}

export function getMyFavorites(
  page = 1,
  pageSize = 20,
  filters: FavoritesFiltersParams = {},
): Promise<FavoritesListResponse> {
  return apiFetch(
    `/api/me/favorites?page=${page}&pageSize=${pageSize}${favoritesFiltersQuery(filters)}`,
    FavoritesListResponseSchema,
  );
}

export function getUserFavorites(
  username: string,
  page = 1,
  pageSize = 20,
): Promise<FavoritesListResponse> {
  return apiFetch(
    `/api/users/${encodeURIComponent(username)}/favorites?page=${page}&pageSize=${pageSize}`,
    FavoritesListResponseSchema,
  );
}

/**
 * Marca o quita el favorito de un objetivo (toggle).
 * Devuelve el favorito creado o `null` si la acción fue quitar.
 */
export function toggleFavorite(target: FavoriteTarget): Promise<Favorite | null> {
  return apiFetch("/api/me/favorites", FavoriteMutationResponseSchema, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ target }),
  }).then((response) => response.favorite);
}

export function removeFavorite(target: FavoriteTarget): Promise<null> {
  return apiFetch("/api/me/favorites", z.null(), {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ target }),
  });
}

export function updateFavoriteAudience(id: string, audience: DiaryAudience): Promise<Favorite> {
  return apiFetch("/api/me/favorites", FavoriteMutationResponseSchema, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id, audience }),
  }).then((response) => response.favorite as Favorite);
}

/** Cambia la audiencia de varios favoritos propios a la vez; devuelve los ids actualizados. */
export function updateFavoritesAudienceBulk(
  ids: string[],
  audience: DiaryAudience,
): Promise<string[]> {
  return apiFetch("/api/me/favorites", FavoritesAudienceBulkResponseSchema, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ids, audience }),
  }).then((response) => response.updatedIds);
}
