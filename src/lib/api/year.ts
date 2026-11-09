import { apiFetch } from "./client";
import { NoContentResponseSchema } from "./schemas";

// Curaduría de "Tu año en discos" (openspec: add-year-in-discs-phase2): Top 5 elegido y discos ocultos.

const json = { "Content-Type": "application/json" };

export function saveYearTop(year: number, releaseGroupIds: string[]) {
  return apiFetch(`/api/me/year/${year}/top`, NoContentResponseSchema, { method: "PUT", headers: json, body: JSON.stringify({ releaseGroupIds }) });
}

export function clearYearTop(year: number) {
  return apiFetch(`/api/me/year/${year}/top`, NoContentResponseSchema, { method: "DELETE" });
}

export function hideYearDisc(year: number, releaseGroupId: string) {
  return apiFetch(`/api/me/year/${year}/hidden/${releaseGroupId}`, NoContentResponseSchema, { method: "POST" });
}

export function showYearDisc(year: number, releaseGroupId: string) {
  return apiFetch(`/api/me/year/${year}/hidden/${releaseGroupId}`, NoContentResponseSchema, { method: "DELETE" });
}
