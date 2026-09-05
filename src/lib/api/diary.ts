import { apiFetch } from "./client";
import {
  DiaryListResponseSchema,
  FeedResponseSchema,
  ListenEntryResponseSchema,
  type DiaryAudience,
  type DiaryListResponse,
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
// omitir el filtro (cualquier reacción o ninguna).
export interface DiaryFiltersParams {
  q?: string;
  context?: ListenContext;
  reaction?: ListenReaction | "none";
  audience?: DiaryAudience;
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
  return apiFetch(`/api/me/diary?${params.toString()}`, DiaryListResponseSchema);
}

export function getUserDiary(username: string, page = 1, pageSize = 20): Promise<DiaryListResponse> {
  return apiFetch(
    `/api/users/${encodeURIComponent(username)}/diary?page=${page}&pageSize=${pageSize}`,
    DiaryListResponseSchema,
  );
}

export function getFeed(page = 1, pageSize = 20): Promise<FeedResponse> {
  return apiFetch(`/api/me/feed?page=${page}&pageSize=${pageSize}`, FeedResponseSchema);
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