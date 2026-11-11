import { z } from "zod";
import { apiFetch } from "./client";
import {
  ConcertAttendanceResponseSchema,
  ConcertCandidatesResponseSchema,
  ConcertEntryResponseSchema,
  SharedConcertCreatedResponseSchema,
  type ConcertAttendanceResponse,
  type ConcertCandidate,
  type CreateSharedConcertRequest,
  type ReportConcertRequest,
  type SharedConcertCreatedResponse,
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

/** "Estuve ahí" en un concierto compartido (openspec: add-shared-concerts-phase1). */
export function attendConcert(concertId: string, artistId?: string): Promise<ConcertAttendanceResponse> {
  return apiFetch(`/api/concerts/${encodeURIComponent(concertId)}/attendance`, ConcertAttendanceResponseSchema, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(artistId ? { artistId } : {}),
  });
}

/** Quita "Estuve ahí" (borra el registro solo si lo creó la acción y nunca se editó). */
export function unattendConcert(concertId: string): Promise<null> {
  return apiFetch(`/api/concerts/${encodeURIComponent(concertId)}/attendance`, z.null(), { method: "DELETE" });
}

// Conciertos de la comunidad (openspec: add-shared-concerts-phase2).

/** Crea un concierto de la comunidad (nace por confirmar, con quien lo crea como asistente). */
export function createSharedConcert(input: CreateSharedConcertRequest): Promise<SharedConcertCreatedResponse> {
  return apiFetch("/api/concerts", SharedConcertCreatedResponseSchema, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}

/** Conciertos del artista a ±1 día, antes de crear uno ("¿Es alguno de estos?"). */
export function fetchConcertCandidates(artistId: string, date: string, city: string): Promise<ConcertCandidate[]> {
  const params = new URLSearchParams({ artistId, date, city });
  return apiFetch(`/api/concerts/candidates?${params.toString()}`, ConcertCandidatesResponseSchema).then((response) => response.candidates);
}

/** Reporta un concierto con un motivo cerrado y un texto opcional. */
export function reportSharedConcert(concertId: string, input: ReportConcertRequest): Promise<unknown> {
  return apiFetch(`/api/concerts/${encodeURIComponent(concertId)}/report`, z.object({ report: z.object({ id: z.uuid() }).nullable() }), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}
