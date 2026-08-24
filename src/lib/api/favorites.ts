import { apiFetch } from "./client";
import {
  FavoriteMutationResponseSchema,
  FavoritesListResponseSchema,
  type FavoritesListResponse,
  type Favorite,
  type FavoriteTarget,
  type DiaryAudience,
} from "./schemas";
import { z } from "zod";

export function getMyFavorites(page = 1, pageSize = 20): Promise<FavoritesListResponse> {
  return apiFetch(`/api/me/favorites?page=${page}&pageSize=${pageSize}`, FavoritesListResponseSchema);
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