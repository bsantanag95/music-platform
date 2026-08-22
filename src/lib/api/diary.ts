import { apiFetch } from "./client";
import {
  DiaryListResponseSchema,
  ListenEntryResponseSchema,
  type DiaryListResponse,
  type ListenEntry,
  type ListenTarget,
  type UpdateListenEntryRequest,
} from "./schemas";
import { z } from "zod";

export function getMyDiary(page = 1, pageSize = 20): Promise<DiaryListResponse> {
  return apiFetch(`/api/me/diary?page=${page}&pageSize=${pageSize}`, DiaryListResponseSchema);
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