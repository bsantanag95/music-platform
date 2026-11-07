import { apiFetch } from "./client";
import {
  DiscographyPreferenceResponseSchema,
  LaminaCandidatesResponseSchema,
  LaminaMutationResponseSchema,
  LaminaSourceOptionsSchema,
  NoContentResponseSchema,
  TierListMutationResponseSchema,
  type ArrangeTierListRequest,
  type LaminaDetail,
  type LaminaSource,
  type TierListDetail,
  type UpdateLaminaRequest,
  type UpdateTierListRequest,
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

// Tier list (openspec: add-tier-list-lamina-phase1): mismas rutas que el Top N, con su propia respuesta.
const tierList = (path: string, init: RequestInit = {}): Promise<TierListDetail> =>
  apiFetch(path, TierListMutationResponseSchema, init).then((response) => response.tierList);

export function createTierListFromDiscography(input: { title: string; artistId: string }) {
  const body = { kind: "tier", title: input.title, entityType: "release-group", source: { type: "discography", artistId: input.artistId } };
  return tierList("/api/me/laminas", { method: "POST", headers: json, body: JSON.stringify(body) });
}

export function fetchTierList(id: string) {
  return tierList(`/api/me/laminas/${id}`);
}

export function updateTierList(id: string, input: UpdateTierListRequest) {
  return tierList(`/api/me/laminas/${id}`, { method: "PATCH", headers: json, body: JSON.stringify(input) });
}

export function arrangeTierList(id: string, arrangement: ArrangeTierListRequest) {
  return tierList(`/api/me/laminas/${id}/tiers`, { method: "PUT", headers: json, body: JSON.stringify(arrangement) });
}

export function removeTierListItem(id: string, itemId: string) {
  return tierList(`/api/me/laminas/${id}/items/${itemId}`, { method: "DELETE" });
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

export function saveDiscographyPreference(artistId: string, preference: { sections: string[]; view: string }) {
  return apiFetch(`/api/me/discography/${artistId}`, DiscographyPreferenceResponseSchema, {
    method: "PUT",
    headers: json,
    body: JSON.stringify(preference),
  }).then((response) => response.preference);
}
