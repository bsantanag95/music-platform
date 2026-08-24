import { and, asc, desc, eq, inArray, max } from "drizzle-orm";
import { db } from "@/db";
import { artist, recording, releaseGroup, userList, userListItem } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import { audiencesForProfile } from "@/services/social/visibility";
import type { Audience } from "@/services/social/types";
import {
  LIST_DESCRIPTION_MAX,
  LIST_TITLE_MAX,
  type ListEntityType,
} from "./types";

export interface ListTarget {
  type: ListEntityType;
  id: string;
}

export interface UserListSummary {
  id: string;
  entityType: ListEntityType;
  title: string;
  description: string | null;
  audience: Audience;
  createdAt: string;
  updatedAt: string;
}

export interface UserListDetail extends UserListSummary {
  items: UserListItemEntry[];
}

export interface UserListItemEntry {
  id: string;
  position: number;
  target: {
    id: string;
    title: string;
    coverThumbUrl: string | null;
  };
}

export interface UpdateListChanges {
  title?: string;
  description?: string | null;
  audience?: Audience;
}

function targetValues(type: ListEntityType, id: string) {
  return {
    artistId: type === "artist" ? id : null,
    releaseGroupId: type === "release-group" ? id : null,
    recordingId: type === "recording" ? id : null,
  };
}

function normalizeTitle(title: string): string {
  const trimmed = title.trim();
  if (trimmed.length === 0 || trimmed.length > LIST_TITLE_MAX) {
    throw new ApiError(
      "VALIDATION_ERROR",
      400,
      `El título debe tener entre 1 y ${LIST_TITLE_MAX} caracteres`,
    );
  }
  return trimmed;
}

function normalizeDescription(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  if (trimmed.length > LIST_DESCRIPTION_MAX) {
    throw new ApiError(
      "VALIDATION_ERROR",
      400,
      `La descripción no puede superar ${LIST_DESCRIPTION_MAX} caracteres`,
    );
  }
  return trimmed.length === 0 ? null : trimmed;
}

/** Valida que el objetivo exista y que su tipo coincida con entityType. */
export async function resolveListTarget(
  entityType: ListEntityType,
  id: string,
): Promise<ListTarget> {
  let exists = false;
  if (entityType === "artist") {
    const [row] = await db.select({ id: artist.id }).from(artist).where(eq(artist.id, id)).limit(1);
    exists = !!row;
  } else if (entityType === "release-group") {
    const [row] = await db
      .select({ id: releaseGroup.id })
      .from(releaseGroup)
      .where(eq(releaseGroup.id, id))
      .limit(1);
    exists = !!row;
  } else {
    const [row] = await db
      .select({ id: recording.id })
      .from(recording)
      .where(eq(recording.id, id))
      .limit(1);
    exists = !!row;
  }
  if (!exists) throw new ApiError("LIST_TARGET_INVALID", 404, "El objetivo de la lista no existe");
  return { type: entityType, id };
}

export async function createList(params: {
  ownerId: string;
  entityType: ListEntityType;
  title: string;
  description?: string | null;
  audience?: Audience;
}): Promise<UserListDetail> {
  const [created] = await db
    .insert(userList)
    .values({
      ownerId: params.ownerId,
      entityType: params.entityType,
      title: normalizeTitle(params.title),
      description: normalizeDescription(params.description ?? null),
      audience: params.audience ?? "followers",
    })
    .returning();
  if (!created) throw new ApiError("INTERNAL_ERROR", 500, "No se pudo crear la lista");
  return getOwnedList(created.id, params.ownerId);
}

export async function getOwnedList(listId: string, ownerId: string): Promise<UserListDetail> {
  const [listRow] = await db
    .select()
    .from(userList)
    .where(and(eq(userList.id, listId), eq(userList.ownerId, ownerId)))
    .limit(1);
  if (!listRow) throw new ApiError("LIST_NOT_FOUND", 404, "La lista no existe");
  return serializeDetail(listRow, await listItems(listId));
}

export async function updateList(
  listId: string,
  ownerId: string,
  changes: UpdateListChanges,
): Promise<UserListDetail> {
  const set: Partial<{ title: string; description: string | null; audience: Audience }> = {};
  if (changes.title !== undefined) set.title = normalizeTitle(changes.title);
  if (changes.description !== undefined) set.description = normalizeDescription(changes.description);
  if (changes.audience !== undefined) set.audience = changes.audience;

  if (Object.keys(set).length === 0) {
    throw new ApiError("VALIDATION_ERROR", 400, "No hay campos para actualizar");
  }

  const [updated] = await db
    .update(userList)
    .set(set)
    .where(and(eq(userList.id, listId), eq(userList.ownerId, ownerId)))
    .returning();
  if (!updated) throw new ApiError("LIST_NOT_FOUND", 404, "La lista no existe");
  return getOwnedList(updated.id, ownerId);
}

export async function deleteList(listId: string, ownerId: string): Promise<void> {
  const [deleted] = await db
    .delete(userList)
    .where(and(eq(userList.id, listId), eq(userList.ownerId, ownerId)))
    .returning({ id: userList.id });
  if (!deleted) throw new ApiError("LIST_NOT_FOUND", 404, "La lista no existe");
}

export async function listMyLists(ownerId: string, page = 1, pageSize = 20) {
  if (page < 1 || pageSize < 1 || pageSize > 50) {
    throw new ApiError("VALIDATION_ERROR", 400, "La paginación no es válida");
  }
  const rows = await db
    .select()
    .from(userList)
    .where(eq(userList.ownerId, ownerId))
    .orderBy(desc(userList.createdAt), desc(userList.id))
    .limit(pageSize + 1)
    .offset((page - 1) * pageSize);
  return {
    lists: rows.slice(0, pageSize).map(serializeSummary),
    page,
    pageSize,
    hasNext: rows.length > pageSize,
  };
}

export async function listUserLists(
  username: string,
  viewerId: string | null,
  page = 1,
  pageSize = 20,
) {
  if (page < 1 || pageSize < 1 || pageSize > 50) {
    throw new ApiError("VALIDATION_ERROR", 400, "La paginación no es válida");
  }
  const { getProfileByUsername } = await import("@/services/social/profiles");
  const profile = await getProfileByUsername(username, viewerId);
  const audiences = audiencesForProfile(profile);
  if (audiences.length === 0) {
    return { lists: [], page, pageSize, hasNext: false };
  }
  const rows = await db
    .select()
    .from(userList)
    .where(and(eq(userList.ownerId, profile.id), inArray(userList.audience, audiences)))
    .orderBy(desc(userList.createdAt), desc(userList.id))
    .limit(pageSize + 1)
    .offset((page - 1) * pageSize);
  return {
    lists: rows.slice(0, pageSize).map(serializeSummary),
    page,
    pageSize,
    hasNext: rows.length > pageSize,
  };
}

export async function getUserListDetail(
  username: string,
  listId: string,
  viewerId: string | null,
): Promise<UserListDetail> {
  const { getProfileByUsername } = await import("@/services/social/profiles");
  const profile = await getProfileByUsername(username, viewerId);
  const audiences = audiencesForProfile(profile);
  if (audiences.length === 0) {
    throw new ApiError("LIST_NOT_FOUND", 404, "La lista no existe");
  }
  const [listRow] = await db
    .select()
    .from(userList)
    .where(
      and(
        eq(userList.id, listId),
        eq(userList.ownerId, profile.id),
        inArray(userList.audience, audiences),
      ),
    )
    .limit(1);
  if (!listRow) throw new ApiError("LIST_NOT_FOUND", 404, "La lista no existe");
  return serializeDetail(listRow, await listItems(listId));
}

/** Agrega un ítem al final de la lista propia. Idempotente: no duplica. */
export async function addItemToList(
  listId: string,
  ownerId: string,
  target: ListTarget,
): Promise<UserListDetail> {
  const [listRow] = await db
    .select()
    .from(userList)
    .where(and(eq(userList.id, listId), eq(userList.ownerId, ownerId)))
    .limit(1);
  if (!listRow) throw new ApiError("LIST_NOT_FOUND", 404, "La lista no existe");

  await resolveListTarget(target.type, target.id);
  if (target.type !== listRow.entityType) {
    throw new ApiError("VALIDATION_ERROR", 400, "El ítem no coincide con el tipo de la lista");
  }

  const [maxPos] = await db
    .select({ max: max(userListItem.position) })
    .from(userListItem)
    .where(eq(userListItem.listId, listId));

  // Insertar en posición (maxPos + 1). La unicidad por objetivo hace la
  // operación idempotente: el conflict target se especifica explícitamente
  // sobre la columna de objetivo correspondiente, porque la restricción
  // (list_id, position) es DEFERRABLE y PostgreSQL no la acepta como árbitro
  // de ON CONFLICT (error 55000).
  const conflictTarget =
    target.type === "artist"
      ? [userListItem.listId, userListItem.artistId]
      : target.type === "release-group"
        ? [userListItem.listId, userListItem.releaseGroupId]
        : [userListItem.listId, userListItem.recordingId];

  await db
    .insert(userListItem)
    .values({
      listId,
      ...targetValues(target.type, target.id),
      position: (maxPos?.max ?? 0) + 1,
    })
    .onConflictDoNothing({ target: conflictTarget })
    .returning();

  return getOwnedList(listId, ownerId);
}

export async function removeItemFromList(
  listId: string,
  itemId: string,
  ownerId: string,
): Promise<UserListDetail> {
  const [listRow] = await db
    .select({ id: userList.id })
    .from(userList)
    .where(and(eq(userList.id, listId), eq(userList.ownerId, ownerId)))
    .limit(1);
  if (!listRow) throw new ApiError("LIST_NOT_FOUND", 404, "La lista no existe");

  await db
    .delete(userListItem)
    .where(and(eq(userListItem.listId, listId), eq(userListItem.id, itemId)));

  return getOwnedList(listId, ownerId);
}

/** Reordena los ítems de la lista propia en una transacción. */
export async function reorderListItems(
  listId: string,
  ownerId: string,
  itemIds: string[],
): Promise<UserListDetail> {
  const [listRow] = await db
    .select({ id: userList.id })
    .from(userList)
    .where(and(eq(userList.id, listId), eq(userList.ownerId, ownerId)))
    .limit(1);
  if (!listRow) throw new ApiError("LIST_NOT_FOUND", 404, "La lista no existe");

  await db.transaction(async (tx) => {
    for (let i = 0; i < itemIds.length; i += 1) {
      const itemId = itemIds[i];
      if (!itemId) continue;
      await tx
        .update(userListItem)
        .set({ position: i + 1 })
        .where(and(eq(userListItem.listId, listId), eq(userListItem.id, itemId)));
    }
  });

  return getOwnedList(listId, ownerId);
}

async function listItems(listId: string): Promise<UserListItemEntry[]> {
  const rows = await db
    .select({
      id: userListItem.id,
      position: userListItem.position,
      artistId: userListItem.artistId,
      releaseGroupId: userListItem.releaseGroupId,
      recordingId: userListItem.recordingId,
      artistName: artist.name,
      releaseTitle: releaseGroup.title,
      releaseCover: releaseGroup.coverThumbUrl,
      recordingTitle: recording.title,
    })
    .from(userListItem)
    .leftJoin(artist, eq(userListItem.artistId, artist.id))
    .leftJoin(releaseGroup, eq(userListItem.releaseGroupId, releaseGroup.id))
    .leftJoin(recording, eq(userListItem.recordingId, recording.id))
    .where(eq(userListItem.listId, listId))
    .orderBy(asc(userListItem.position), asc(userListItem.id));

  return rows.map((row) => {
    let id = "";
    let title = "";
    let coverThumbUrl: string | null = null;
    if (row.artistId) {
      id = row.artistId;
      title = row.artistName ?? "";
    } else if (row.releaseGroupId) {
      id = row.releaseGroupId;
      title = row.releaseTitle ?? "";
      coverThumbUrl = row.releaseCover;
    } else if (row.recordingId) {
      id = row.recordingId ?? "";
      title = row.recordingTitle ?? "";
    }
    return {
      id: row.id,
      position: row.position,
      target: { id, title, coverThumbUrl },
    };
  });
}

function serializeSummary(row: {
  id: string;
  entityType: string;
  title: string;
  description: string | null;
  audience: string;
  createdAt: Date;
  updatedAt: Date;
}): UserListSummary {
  return {
    id: row.id,
    entityType: row.entityType as ListEntityType,
    title: row.title,
    description: row.description,
    audience: row.audience as Audience,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeDetail(
  row: {
    id: string;
    entityType: string;
    title: string;
    description: string | null;
    audience: string;
    createdAt: Date;
    updatedAt: Date;
  },
  items: UserListItemEntry[],
): UserListDetail {
  return { ...serializeSummary(row), items };
}