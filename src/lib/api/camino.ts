import { z } from "zod";
import { apiFetch } from "./client";
import {
  CaminoDetailResponseSchema,
  CaminoDiscoveryResponseSchema,
  MyCaminosResponseSchema,
  SavedListMutationResponseSchema,
  type CaminoDetail,
  type CaminoDiscoveryResponse,
  type DiaryAudience,
  type MyCaminosResponse,
  type SavedListSummary,
} from "./schemas";

export function getMyCaminos(): Promise<MyCaminosResponse> {
  return apiFetch("/api/me/caminos", MyCaminosResponseSchema);
}

export function getMyCamino(caminoId: string): Promise<CaminoDetail> {
  return apiFetch(`/api/me/caminos/${caminoId}`, CaminoDetailResponseSchema).then(
    (response) => response.camino,
  );
}

export function createCamino(input: {
  title: string;
  description?: string | null;
  audience?: DiaryAudience;
}): Promise<CaminoDetail> {
  return apiFetch("/api/me/caminos", CaminoDetailResponseSchema, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  }).then((response) => response.camino);
}

export function deleteCamino(caminoId: string): Promise<null> {
  return apiFetch(`/api/me/caminos/${caminoId}`, z.null(), { method: "DELETE" });
}

export function addAlbumToCamino(caminoId: string, releaseGroupId: string): Promise<CaminoDetail> {
  return apiFetch(`/api/me/caminos/${caminoId}/albums`, CaminoDetailResponseSchema, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ releaseGroupId }),
  }).then((response) => response.camino);
}

export function removeAlbumFromCamino(caminoId: string, releaseGroupId: string): Promise<CaminoDetail> {
  return apiFetch(`/api/me/caminos/${caminoId}/albums/${releaseGroupId}`, CaminoDetailResponseSchema, {
    method: "DELETE",
  }).then((response) => response.camino);
}

export function archiveCamino(caminoId: string): Promise<CaminoDetail> {
  return apiFetch(`/api/me/caminos/${caminoId}/archive`, CaminoDetailResponseSchema, {
    method: "POST",
  }).then((response) => response.camino);
}

export function unarchiveCamino(caminoId: string): Promise<CaminoDetail> {
  return apiFetch(`/api/me/caminos/${caminoId}/archive`, CaminoDetailResponseSchema, {
    method: "DELETE",
  }).then((response) => response.camino);
}

export interface CaminoDiscoveryFiltersParams {
  genre?: string;
  artist?: string;
}

export function getCaminoDiscovery(
  page = 1,
  pageSize = 20,
  filters: CaminoDiscoveryFiltersParams = {},
): Promise<CaminoDiscoveryResponse> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (filters.genre) params.set("genre", filters.genre);
  if (filters.artist) params.set("artist", filters.artist);
  return apiFetch(`/api/caminos/discover?${params.toString()}`, CaminoDiscoveryResponseSchema);
}

export function setListTracking(listId: string, tracking: boolean): Promise<SavedListSummary> {
  return apiFetch(`/api/me/saved-lists/${listId}`, SavedListMutationResponseSchema, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ tracking }),
  }).then((response) => response.list);
}
