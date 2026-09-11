import { and, desc, eq, inArray, isNotNull, isNull, type SQL, type SQLWrapper } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { appUser, editorialAction, userList } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import { requirePermissionForUser } from "@/services/auth/authorization";
import { CURATOR_USERNAME } from "@/services/discovery/constants";
import {
  addItemToList,
  getOwnedList,
  normalizeDescription,
  normalizeTitle,
  removeItemFromList,
  reorderListItems,
  updateList,
  type ListTarget,
  type UserListDetail,
} from "./lists";
import type { ListEntityType } from "./types";

// El contenido editorial se administra solo sobre listas de la cuenta curadora
// de `/explore` (`@exploracion`): las listas personales de otros usuarios no
// son candidatas a publicación oficial (ver docs/05-features/explore.md).
function curatorOwnerIds() {
  return db
    .select({ id: appUser.id })
    .from(appUser)
    .where(eq(appUser.username, CURATOR_USERNAME));
}

function curatorListCondition(): SQL {
  return inArray(userList.ownerId, curatorOwnerIds());
}

/** Resuelve el UUID real de la cuenta curadora (para escribir en su nombre). */
async function curatorOwnerId(): Promise<string> {
  const [row] = await db
    .select({ id: appUser.id })
    .from(appUser)
    .where(eq(appUser.username, CURATOR_USERNAME))
    .limit(1);
  if (!row) throw new ApiError("INTERNAL_ERROR", 500, "La cuenta curadora no existe");
  return row.id;
}

/** Condición de un borrador editorial modificable (nunca publicado ni retirado). */
function editableDraftCondition(): SQL {
  return and(
    curatorListCondition(),
    isNotNull(userList.editorialAuthorId),
    eq(userList.isOfficial, false),
    isNull(userList.officialWithdrawnAt),
  ) as SQL;
}

/**
 * Verifica que la lista sea un borrador editorial editable y devuelve el id
 * del dueño (la cuenta curadora). Una lista personal, publicada o retirada se
 * comporta como inexistente.
 */
async function requireEditableDraft(listId: string): Promise<string> {
  const [row] = await db
    .select({ ownerId: userList.ownerId })
    .from(userList)
    .where(and(eq(userList.id, listId), editableDraftCondition()))
    .limit(1);
  if (!row) throw new ApiError("LIST_NOT_FOUND", 404, "La lista no existe");
  return row.ownerId;
}

async function recordEditorialAction(
  listId: string,
  actorId: string,
  action: "create" | "edit" | "submit" | "publish" | "withdraw",
): Promise<void> {
  await db.insert(editorialAction).values({ listId, actorId, action });
}

export type EditorialState = "draft" | "submitted" | "published" | "withdrawn" | "personal";

export function editorialStateOf(row: {
  isOfficial: boolean;
  officialWithdrawnAt: Date | null;
  editorialAuthorId: string | null;
  editorialSubmittedAt: Date | null;
}): EditorialState {
  if (row.isOfficial) return "published";
  if (row.officialWithdrawnAt) return "withdrawn";
  if (row.editorialAuthorId) return row.editorialSubmittedAt ? "submitted" : "draft";
  return "personal";
}

export interface CreateEditorialDraftParams {
  entityType: ListEntityType;
  title: string;
  description?: string | null;
}

export interface UpdateEditorialDraftChanges {
  title?: string;
  description?: string | null;
}

/**
 * Crea un borrador editorial propiedad de `@exploracion`, registrando la
 * autoría de la persona. La audiencia se fuerza a `public`: el default de
 * `user_list` es `followers` y un contenido oficial no debe quedar invisible.
 */
export async function createEditorialDraft(
  actorId: string,
  params: CreateEditorialDraftParams,
): Promise<UserListDetail> {
  await requirePermissionForUser(actorId, "editorial.author");
  const ownerId = await curatorOwnerId();
  const [created] = await db
    .insert(userList)
    .values({
      ownerId,
      entityType: params.entityType,
      title: normalizeTitle(params.title),
      description: normalizeDescription(params.description ?? null),
      audience: "public",
      editorialAuthorId: actorId,
    })
    .returning();
  if (!created) throw new ApiError("INTERNAL_ERROR", 500, "No se pudo crear el borrador editorial");
  await recordEditorialAction(created.id, actorId, "create");
  return getOwnedList(created.id, ownerId);
}

/** Edita los metadatos de un borrador editorial (audiencia siempre `public`). */
export async function updateEditorialDraft(
  actorId: string,
  listId: string,
  changes: UpdateEditorialDraftChanges,
): Promise<UserListDetail> {
  await requirePermissionForUser(actorId, "editorial.author");
  const ownerId = await requireEditableDraft(listId);
  const detail = await updateList(listId, ownerId, { ...changes, audience: "public" });
  await recordEditorialAction(listId, actorId, "edit");
  return detail;
}

/** Agrega un ítem a un borrador editorial. */
export async function addEditorialItem(
  actorId: string,
  listId: string,
  target: ListTarget,
): Promise<UserListDetail> {
  await requirePermissionForUser(actorId, "editorial.author");
  const ownerId = await requireEditableDraft(listId);
  const detail = await addItemToList(listId, ownerId, target);
  await recordEditorialAction(listId, actorId, "edit");
  return detail;
}

/** Quita un ítem de un borrador editorial. */
export async function removeEditorialItem(
  actorId: string,
  listId: string,
  itemId: string,
): Promise<UserListDetail> {
  await requirePermissionForUser(actorId, "editorial.author");
  const ownerId = await requireEditableDraft(listId);
  const detail = await removeItemFromList(listId, itemId, ownerId);
  await recordEditorialAction(listId, actorId, "edit");
  return detail;
}

/** Reordena los ítems de un borrador editorial. */
export async function reorderEditorialItems(
  actorId: string,
  listId: string,
  itemIds: string[],
): Promise<UserListDetail> {
  await requirePermissionForUser(actorId, "editorial.author");
  const ownerId = await requireEditableDraft(listId);
  const detail = await reorderListItems(listId, ownerId, itemIds);
  await recordEditorialAction(listId, actorId, "edit");
  return detail;
}

/** Propone un borrador editorial para publicación. No publica por sí solo. */
export async function submitEditorialDraft(actorId: string, listId: string): Promise<void> {
  await requirePermissionForUser(actorId, "editorial.author");
  const [updated] = await db
    .update(userList)
    .set({ editorialSubmittedAt: new Date(), editorialSubmittedBy: actorId })
    .where(and(eq(userList.id, listId), editableDraftCondition()))
    .returning({ id: userList.id });
  if (!updated) throw new ApiError("LIST_NOT_FOUND", 404, "La lista no existe");
  await recordEditorialAction(listId, actorId, "submit");
}

/**
 * Borra un borrador editorial que nunca fue publicado ni retirado. Gateado por
 * el mismo permiso que crea y edita; no hay `editorial.delete`. La cascada de
 * `user_list_item` ya existe. No se registra auditoría: el FK cascade a
 * `user_list` borraría la fila con la lista.
 */
export async function deleteEditorialDraft(actorId: string, listId: string): Promise<void> {
  await requirePermissionForUser(actorId, "editorial.author");
  const [deleted] = await db
    .delete(userList)
    .where(and(eq(userList.id, listId), editableDraftCondition()))
    .returning({ id: userList.id });
  if (!deleted) throw new ApiError("LIST_NOT_FOUND", 404, "La lista no existe");
}

export async function publishOfficialList(actorId: string, listId: string) {
  await requirePermissionForUser(actorId, "editorial.publish");
  const [list] = await db
    .update(userList)
    .set({
      isOfficial: true,
      officialPublishedBy: actorId,
      officialPublishedAt: new Date(),
      officialWithdrawnAt: null,
    })
    .where(
      and(
        eq(userList.id, listId),
        eq(userList.moderationStatus, "visible"),
        curatorListCondition(),
      ),
    )
    .returning();
  if (list) await recordEditorialAction(listId, actorId, "publish");
  return list ?? null;
}

export async function unpublishOfficialList(actorId: string, listId: string) {
  await requirePermissionForUser(actorId, "editorial.publish");
  const [list] = await db
    .update(userList)
    .set({
      isOfficial: false,
      officialPublishedBy: null,
      officialPublishedAt: null,
      officialWithdrawnAt: new Date(),
    })
    .where(and(eq(userList.id, listId), eq(userList.isOfficial, true), curatorListCondition()))
    .returning();
  if (list) await recordEditorialAction(listId, actorId, "withdraw");
  return list ?? null;
}

export type EditorialStatusFilter = "draft" | "submitted" | "published" | "withdrawn";

function statusCondition(status: EditorialStatusFilter): SQLWrapper {
  switch (status) {
    case "published":
      return eq(userList.isOfficial, true);
    case "withdrawn":
      return isNotNull(userList.officialWithdrawnAt);
    case "submitted":
      return and(
        eq(userList.isOfficial, false),
        isNull(userList.officialWithdrawnAt),
        isNotNull(userList.editorialAuthorId),
        isNotNull(userList.editorialSubmittedAt),
      ) as SQL;
    case "draft":
      return and(
        eq(userList.isOfficial, false),
        isNull(userList.officialWithdrawnAt),
        isNotNull(userList.editorialAuthorId),
        isNull(userList.editorialSubmittedAt),
      ) as SQL;
  }
}

export async function listEditorialLists(status?: EditorialStatusFilter) {
  // Alias para el autor (la persona), distinto del dueño (la cuenta curadora).
  const author = alias(appUser, "editorial_author");
  const rows = await db
    .select({
      id: userList.id,
      title: userList.title,
      description: userList.description,
      audience: userList.audience,
      moderationStatus: userList.moderationStatus,
      isOfficial: userList.isOfficial,
      officialPublishedAt: userList.officialPublishedAt,
      officialWithdrawnAt: userList.officialWithdrawnAt,
      editorialSubmittedAt: userList.editorialSubmittedAt,
      editorialAuthorId: userList.editorialAuthorId,
      createdAt: userList.createdAt,
      owner: { id: appUser.id, username: appUser.username, displayName: appUser.displayName },
      author: { id: author.id, username: author.username, displayName: author.displayName },
    })
    .from(userList)
    .innerJoin(appUser, eq(appUser.id, userList.ownerId))
    .leftJoin(author, eq(userList.editorialAuthorId, author.id))
    .where(
      and(
        eq(appUser.username, CURATOR_USERNAME),
        status ? statusCondition(status) : undefined,
      ),
    )
    .orderBy(desc(userList.createdAt));

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    audience: row.audience,
    moderationStatus: row.moderationStatus,
    isOfficial: row.isOfficial,
    officialPublishedAt: row.officialPublishedAt?.toISOString() ?? null,
    officialWithdrawnAt: row.officialWithdrawnAt?.toISOString() ?? null,
    editorialSubmittedAt: row.editorialSubmittedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    owner: row.owner,
    author: row.editorialAuthorId ? row.author : null,
    state: editorialStateOf(row),
  }));
}
