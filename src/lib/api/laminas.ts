import { apiFetch } from "./client";
import { LaminaMutationResponseSchema, NoContentResponseSchema, type LaminaDetail, type UpdateLaminaRequest } from "./schemas";

const json = { "Content-Type": "application/json" };
const lamina = (path: string, init: RequestInit): Promise<LaminaDetail> =>
  apiFetch(path, LaminaMutationResponseSchema, init).then((response) => response.lamina);

export function createLamina(input: { title: string; format: string; entityType: string }) {
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

export function removeLaminaItem(id: string, itemId: string) {
  return lamina(`/api/me/laminas/${id}/items/${itemId}`, { method: "DELETE" });
}

export function reorderLamina(id: string, itemIds: string[]) {
  return lamina(`/api/me/laminas/${id}/items`, { method: "PUT", headers: json, body: JSON.stringify({ itemIds }) });
}
