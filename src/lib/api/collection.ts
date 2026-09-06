import { z } from "zod";
import { apiFetch } from "./client";
import {
  CollectionEntryResponseSchema,
  CollectionListResponseSchema,
  CollectionEntriesResponseSchema,
  CollectionAudienceBulkResponseSchema,
  type CollectionEntry,
  type CollectionListResponse,
  type CollectionEntriesResponse,
  type CollectionSort,
  type CreateCollectionEntryRequest,
  type UpdateCollectionEntryRequest,
  type DiaryAudience,
} from "./schemas";

export interface CollectionQuery {
  page?: number;
  pageSize?: number;
  format?: string;
  attribute?: string;
  q?: string;
  sort?: CollectionSort;
  group?: string;
}

function queryString({
  page = 1,
  pageSize = 20,
  format,
  attribute,
  q,
  sort,
  group,
}: CollectionQuery): string {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (format) params.set("format", format);
  if (attribute) params.set("attribute", attribute);
  if (q) params.set("q", q);
  if (sort) params.set("sort", sort);
  if (group) params.set("group", group);
  return params.toString();
}

export function getMyCollection(query: CollectionQuery = {}): Promise<CollectionListResponse> {
  return apiFetch(`/api/me/collection?${queryString(query)}`, CollectionListResponseSchema);
}

export function getUserCollection(
  username: string,
  query: CollectionQuery = {},
): Promise<CollectionListResponse> {
  return apiFetch(
    `/api/users/${encodeURIComponent(username)}/collection?${queryString(query)}`,
    CollectionListResponseSchema,
  );
}

export function getUserCollectionEntries(username: string): Promise<CollectionEntriesResponse> {
  return apiFetch(
    `/api/users/${encodeURIComponent(username)}/collection?pageSize=50`,
    CollectionListResponseSchema,
  ).then((response) => ({ entries: response.entries }));
}

export function addCollectionEntry(input: CreateCollectionEntryRequest): Promise<CollectionEntry> {
  return apiFetch("/api/me/collection", CollectionEntryResponseSchema, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  }).then((response) => response.entry);
}

export function updateCollectionEntry(
  entryId: string,
  changes: UpdateCollectionEntryRequest,
): Promise<CollectionEntry> {
  return apiFetch(
    `/api/me/collection/${encodeURIComponent(entryId)}`,
    CollectionEntryResponseSchema,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(changes),
    },
  ).then((response) => response.entry);
}

/** Cambia la audiencia de varias entradas propias a la vez; devuelve los ids actualizados. */
export function updateEntriesAudienceBulk(
  ids: string[],
  audience: DiaryAudience,
): Promise<string[]> {
  return apiFetch("/api/me/collection", CollectionAudienceBulkResponseSchema, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ids, audience }),
  }).then((response) => response.updatedIds);
}

export function removeCollectionEntry(entryId: string): Promise<null> {
  return apiFetch(`/api/me/collection/${encodeURIComponent(entryId)}`, z.null(), {
    method: "DELETE",
    headers: { "content-type": "application/json" },
  });
}

// Reexport para consumidores de UI.
export { CollectionEntriesResponseSchema };
