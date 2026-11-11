import { z } from "zod";
import { apiFetch } from "./client";
import {
  ConcertEntryResponseSchema,
  type ConcertEntryDto,
  type CreateConcertRequest,
  type UpdateConcertRequest,
} from "./schemas";

// Cliente de Mis conciertos (openspec: add-my-concerts). Las respuestas se validan con Zod en `apiFetch`.

export function createConcert(input: CreateConcertRequest): Promise<ConcertEntryDto> {
  return apiFetch("/api/me/concerts", ConcertEntryResponseSchema, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  }).then((response) => response.entry);
}

export function updateConcert(id: string, changes: UpdateConcertRequest): Promise<ConcertEntryDto> {
  return apiFetch(`/api/me/concerts/${encodeURIComponent(id)}`, ConcertEntryResponseSchema, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(changes),
  }).then((response) => response.entry);
}

export function removeConcert(id: string): Promise<null> {
  return apiFetch(`/api/me/concerts/${encodeURIComponent(id)}`, z.null(), { method: "DELETE" });
}
