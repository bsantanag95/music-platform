import { z } from "zod";
import { apiFetch } from "./client";
import {
  WantedEntriesResponseSchema,
  WantedEntryResponseSchema,
  WantedListResponseSchema,
  type AddWantedEntriesRequest,
  type UpdateWantedEntryRequest,
  type WantedEntry,
  type WantedListResponse,
  type WantedSort,
} from "./schemas";

export interface WantedQuery {
  page?: number;
  pageSize?: number;
  q?: string;
  sort?: WantedSort;
}

function queryString({ page = 1, pageSize = 20, q, sort }: WantedQuery): string {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (q) params.set("q", q);
  if (sort) params.set("sort", sort);
  return params.toString();
}

export function getMyWantedEntries(query: WantedQuery = {}): Promise<WantedListResponse> {
  return apiFetch(`/api/me/collection/wanted?${queryString(query)}`, WantedListResponseSchema);
}

export function addWantedEntries(input: AddWantedEntriesRequest): Promise<WantedEntry[]> {
  return apiFetch("/api/me/collection/wanted", WantedEntriesResponseSchema, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  }).then((response) => response.entries);
}

export function updateWantedEntry(
  entryId: string,
  changes: UpdateWantedEntryRequest,
): Promise<WantedEntry> {
  return apiFetch(`/api/me/collection/wanted/${encodeURIComponent(entryId)}`, WantedEntryResponseSchema, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(changes),
  }).then((response) => response.entry);
}

export function removeWantedEntry(entryId: string): Promise<null> {
  return apiFetch(`/api/me/collection/wanted/${encodeURIComponent(entryId)}`, z.null(), {
    method: "DELETE",
    headers: { "content-type": "application/json" },
  });
}
