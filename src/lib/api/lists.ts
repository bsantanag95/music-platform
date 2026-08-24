import { apiFetch } from "./client";
import {
  ListMutationResponseSchema,
  ListsListResponseSchema,
  type ListsListResponse,
  type UserListDetail,
  type UserListSummary,
  type ListEntityType,
  type ListTarget,
  type DiaryAudience,
  type UpdateListRequest,
} from "./schemas";
import { z } from "zod";

export function getMyLists(page = 1, pageSize = 20): Promise<ListsListResponse> {
  return apiFetch(`/api/me/lists?page=${page}&pageSize=${pageSize}`, ListsListResponseSchema);
}

export function getUserLists(
  username: string,
  page = 1,
  pageSize = 20,
): Promise<ListsListResponse> {
  return apiFetch(
    `/api/users/${encodeURIComponent(username)}/lists?page=${page}&pageSize=${pageSize}`,
    ListsListResponseSchema,
  );
}

export function getMyListDetail(listId: string): Promise<UserListDetail> {
  return apiFetch(`/api/me/lists/${listId}`, ListMutationResponseSchema).then(
    (response) => response.list,
  );
}

export function getUserListDetail(
  username: string,
  listId: string,
): Promise<UserListDetail> {
  return apiFetch(`/api/users/${encodeURIComponent(username)}/lists/${listId}`, ListMutationResponseSchema).then(
    (response) => response.list,
  );
}

export function createList(input: {
  entityType: ListEntityType;
  title: string;
  description?: string | null;
  audience?: DiaryAudience;
}): Promise<UserListDetail> {
  return apiFetch("/api/me/lists", ListMutationResponseSchema, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  }).then((response) => response.list);
}

export function updateList(listId: string, changes: UpdateListRequest): Promise<UserListDetail> {
  return apiFetch(`/api/me/lists/${listId}`, ListMutationResponseSchema, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(changes),
  }).then((response) => response.list);
}

export function deleteList(listId: string): Promise<null> {
  return apiFetch(`/api/me/lists/${listId}`, z.null(), { method: "DELETE" });
}

export function addItemToList(listId: string, target: ListTarget): Promise<UserListDetail> {
  return apiFetch(`/api/me/lists/${listId}/items`, ListMutationResponseSchema, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ target }),
  }).then((response) => response.list);
}

export function removeItemFromList(listId: string, itemId: string): Promise<UserListDetail> {
  return apiFetch(`/api/me/lists/${listId}/items/${itemId}`, ListMutationResponseSchema, {
    method: "DELETE",
  }).then((response) => response.list);
}

export function reorderListItems(listId: string, itemIds: string[]): Promise<UserListDetail> {
  return apiFetch(`/api/me/lists/${listId}/items`, ListMutationResponseSchema, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ itemIds }),
  }).then((response) => response.list);
}

export type { UserListSummary };