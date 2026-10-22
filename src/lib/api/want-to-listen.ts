import { apiFetch } from "./client";
import {
  WantToListenMutationResponseSchema,
  WantToListenListResponseSchema,
  type WantToListenFilters,
  type WantToListenListResponse,
  type WantToListenEntry,
  type WantToListenTarget,
} from "./schemas";
import { z } from "zod";

export function getMyWantToListen(
  page = 1,
  pageSize = 20,
  filters: WantToListenFilters = {},
): Promise<WantToListenListResponse> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (filters.type) params.set("type", filters.type);
  if (filters.sort) params.set("sort", filters.sort);
  return apiFetch(`/api/me/want-to-listen?${params.toString()}`, WantToListenListResponseSchema);
}

/**
 * Marca o quita un objetivo de Want to Listen (toggle).
 * Devuelve la entrada creada o `null` si la acción fue quitar.
 */
export function toggleWantToListen(target: WantToListenTarget): Promise<WantToListenEntry | null> {
  return apiFetch("/api/me/want-to-listen", WantToListenMutationResponseSchema, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ target }),
  }).then((response) => response.entry);
}

export function removeFromWantToListen(target: WantToListenTarget): Promise<null> {
  return apiFetch("/api/me/want-to-listen", z.null(), {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ target }),
  });
}
