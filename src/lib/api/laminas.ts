import { apiFetch } from "./client";
import {
  LaminaCandidatesResponseSchema,
  LaminaMutationResponseSchema,
  LaminaSourceOptionsSchema,
  NoContentResponseSchema,
  type LaminaDetail,
  type LaminaSource,
  type UpdateLaminaRequest,
} from "./schemas";

const json = { "Content-Type": "application/json" };
const lamina = (path: string, init: RequestInit): Promise<LaminaDetail> =>
  apiFetch(path, LaminaMutationResponseSchema, init).then((response) => response.lamina);

export function createLamina(input: { title: string; format: string; entityType: string; targetIds?: string[] }) {
  return lamina("/api/me/laminas", { method: "POST", headers: json, body: JSON.stringify(input) });
}

export function updateLamina(id: string, input: UpdateLaminaRequest) {
  return lamina(`/api/me/laminas/${id}`, { method: "PATCH", headers: json, body: JSON.stringify(input) });
}

export function deleteLamina(id: string) {
  return apiFetch(`/api/me/laminas/${id}`, NoContentResponseSchema, { method: "DELETE" });
}

export function addLaminaItem(id: string, targetId: string) {
  return lamina(`/api/me/laminas/${id}/items`, { method: "POST", headers: json, body: JSON.stringify({ targetId }) });
}

export function addLaminaItems(id: string, targetIds: string[]) {
  return lamina(`/api/me/laminas/${id}/items`, { method: "POST", headers: json, body: JSON.stringify({ targetIds }) });
}

export function removeLaminaItem(id: string, itemId: string) {
  return lamina(`/api/me/laminas/${id}/items/${itemId}`, { method: "DELETE" });
}

export function reorderLamina(id: string, itemIds: string[]) {
  return lamina(`/api/me/laminas/${id}/items`, { method: "PUT", headers: json, body: JSON.stringify({ itemIds }) });
}

export interface LaminaSourceParams {
  source: LaminaSource;
  entityType: string;
  timeZone: string;
}

export interface LaminaCandidateFilters {
  year?: number;
  decade?: number;
  listenYear?: number;
  genre?: string;
  artist?: string;
  list?: string;
}

function sourceQuery({ source, entityType, timeZone }: LaminaSourceParams, filters: LaminaCandidateFilters = {}): string {
  const params = new URLSearchParams({ source, entityType, tz: timeZone });
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined) params.set(key, String(value));
  }
  return params.toString();
}

export function fetchLaminaSourceOptions(params: LaminaSourceParams, signal?: AbortSignal) {
  return apiFetch(`/api/me/laminas/sources?${sourceQuery(params)}`, LaminaSourceOptionsSchema, { signal });
}

export function fetchLaminaCandidates(params: LaminaSourceParams, filters: LaminaCandidateFilters, signal?: AbortSignal) {
  return apiFetch(`/api/me/laminas/candidates?${sourceQuery(params, filters)}`, LaminaCandidatesResponseSchema, { signal }).then(
    (response) => response.candidates,
  );
}
