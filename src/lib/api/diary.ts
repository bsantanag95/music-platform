import { apiFetch } from "./client";
import {
  DiaryListResponseSchema,
  DiaryMonthsResponseSchema,
  FeedResponseSchema,
  ListenEntryResponseSchema,
  type DiaryAudience,
  type DiaryListResponse,
  type DiaryMonthsResponse,
  type FeedEntry,
  type FeedResponse,
  type ListenContext,
  type ListenEntry,
  type ListenReaction,
  type ListenTarget,
  type UpdateListenEntryRequest,
} from "./schemas";
import { z } from "zod";

// Filtros combinables de `getMyDiary` — reflejan `DiaryFilters` del servicio
// (`src/services/diary/diary.ts`), duplicados acá porque el cliente no puede
// importar código de servidor. `reaction: "none"` es "sin reacción", distinto de
// omitir el filtro (cualquier reacción o ninguna). `month` sin `year` no se
// envía (ver `DiaryActivityList`, que deshabilita Mes hasta elegir un Año).
export interface DiaryFiltersParams {
  q?: string;
  context?: ListenContext;
  reaction?: ListenReaction | "none";
  audience?: DiaryAudience;
  year?: number;
  month?: number;
}

export function getMyDiary(
  page = 1,
  pageSize = 20,
  filters?: DiaryFiltersParams,
): Promise<DiaryListResponse> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (filters?.q) params.set("q", filters.q);
  if (filters?.context) params.set("context", filters.context);
  if (filters?.reaction) params.set("reaction", filters.reaction);
  if (filters?.audience) params.set("audience", filters.audience);
  if (filters?.year) params.set("year", String(filters.year));
  if (filters?.month) params.set("month", String(filters.month));
  return apiFetch(`/api/me/diary?${params.toString()}`, DiaryListResponseSchema);
}

// Pares año/mes con al menos una escucha, para poblar los filtros de Año/Mes
// (openspec: add-diary-date-navigation).
export function getMyDiaryMonths(): Promise<DiaryMonthsResponse> {
  return apiFetch("/api/me/diary/months", DiaryMonthsResponseSchema);
}

export function getUserDiary(username: string, page = 1, pageSize = 20): Promise<DiaryListResponse> {
  return apiFetch(
    `/api/users/${encodeURIComponent(username)}/diary?page=${page}&pageSize=${pageSize}`,
    DiaryListResponseSchema,
  );
}

// Filtros combinables de `getFeed` — reflejan `FeedFilters` del servicio
// (`src/services/feed/feed.ts`), duplicados acá porque el cliente no puede
// importar código de servidor. Mismo criterio que `DiaryFiltersParams`.
export interface FeedFiltersParams {
  kind?: FeedEntry["kind"];
  authorId?: string;
  q?: string;
}

export function getFeed(page = 1, pageSize = 20, filters?: FeedFiltersParams): Promise<FeedResponse> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (filters?.kind) params.set("kind", filters.kind);
  if (filters?.authorId) params.set("authorId", filters.authorId);
  if (filters?.q) params.set("q", filters.q);
  return apiFetch(`/api/me/feed?${params.toString()}`, FeedResponseSchema);
}

// Sección "Recientes" de `/activity` (cambio add-community-activity-surface):
// ratings + comentarios + reseñas públicos, sin requerir seguimiento. Mismo
// shape de respuesta que `getFeed`, así que reusa `FeedResponseSchema`.
// Nombrada `getCommunityActivity`, no `getRecentActivity`: ese nombre ya lo
// usa `@/lib/api/home.ts` para "Tu rastro reciente" (actividad propia,
// `/api/me/recent-activity`) — mismo shape de página, concepto distinto.
export function getCommunityActivity(page = 1, pageSize = 10): Promise<FeedResponse> {
  return apiFetch(`/api/activity/recent?page=${page}&pageSize=${pageSize}`, FeedResponseSchema);
}

export function createListenEntry(target: ListenTarget): Promise<ListenEntry> {
  return apiFetch("/api/me/diary", ListenEntryResponseSchema, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ target }),
  }).then((response) => response.entry);
}

export function updateListenEntry(
  id: string,
  changes: UpdateListenEntryRequest,
): Promise<ListenEntry> {
  return apiFetch(`/api/me/diary/${id}`, ListenEntryResponseSchema, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(changes),
  }).then((response) => response.entry);
}

export function deleteListenEntry(id: string): Promise<null> {
  return apiFetch(`/api/me/diary/${id}`, z.null(), { method: "DELETE" });
}