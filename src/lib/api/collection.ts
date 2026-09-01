import { z } from "zod";
import { apiFetch } from "./client";
import {
  CollectionEntryResponseSchema,
  CollectionListResponseSchema,
  CollectionEntriesResponseSchema,
  type CollectionEntry,
  type CollectionListResponse,
  type CollectionEntriesResponse,
  type CreateCollectionEntryRequest,
  type UpdateCollectionEntryRequest,
} from "./schemas";

interface CollectionQuery {
  page?: number;
  pageSize?: number;
  format?: string;
  attribute?: string;
}

function queryString({ page = 1, pageSize = 20, format, attribute }: CollectionQuery): string {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (format) params.set("format", format);
  if (attribute) params.set("attribute", attribute);
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

export function removeCollectionEntry(entryId: string): Promise<null> {
  return apiFetch(`/api/me/collection/${encodeURIComponent(entryId)}`, z.null(), {
    method: "DELETE",
    headers: { "content-type": "application/json" },
  });
}

// Reexport para consumidores de UI.
export { CollectionEntriesResponseSchema };
