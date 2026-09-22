// Guardar / seguir listas ajenas (cambio rework-lists-section).
//
// Guardar es un marcador privado por (saver_id, list_id). `following` es el eje
// extra: cuando es TRUE, las actualizaciones de metadatos de esa lista entran en
// el feed de quien la sigue (ver src/services/feed/feed.ts).

import { and, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { appUser, listSave, userList } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import { relationsFor } from "@/services/social/relations";
import { audiencesForProfile } from "@/services/social/visibility";
import type { Audience, FollowRelation } from "@/services/social/types";
import { enrichLists } from "./lists";
import type { ListEntityType } from "./types";
import { activeUserCondition } from "@/services/auth/account-status";
import { countsByListId, deriveJourneyState, type JourneyState } from "@/services/journeys/progress";

export interface SavedListSummary {
  id: string;
  entityType: ListEntityType;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
  coverThumbs: string[];
  owner: { id: string; username: string; displayName: string | null };
  /** El guardado tiene `following` activo. */
  following: boolean;
  /**
   * El guardado tiene tracking de progreso propio activo (openspec:
   * add-camino) — solo significativo cuando `entityType = 'release-group'`.
   */
  tracking: boolean;
  /** La lista dejó de ser visible para quien la guardó (privada, bloqueo). */
  unavailable: boolean;
}

export interface TrackedListSummary {
  id: string;
  title: string;
  coverThumbUrl: string | null;
  /**
   * Subtipo de la lista trackeada — determina a qué ruta de lectura ajena
   * enlazar: `standard` va a `/users/[username]/lists/[id]`, `custom_journey`
   * (un Camino ajeno) va a `/users/[username]/caminos/[id]` (openspec:
   * add-camino, Requirement "Exclusión de toda superficie que lea listas
   * genéricamente" de `camino` — un Camino no vive detrás de los endpoints
   * de `lists`).
   */
  kind: "standard" | "custom_journey";
  owner: { id: string; username: string; displayName: string | null };
  state: JourneyState;
  progress: { selectedCount: number; listenedCount: number };
  updatedAt: string;
}

/** Audiencias visibles para un lector según su relación con el dueño. */
function audiencesFor(
  viewerId: string,
  ownerId: string,
  ownerVisibility: string,
  relation: FollowRelation,
): Audience[] {
  return audiencesForProfile({
    profileVisibility: ownerVisibility === "private" ? "private" : "public",
    relation: viewerId === ownerId ? "self" : relation,
    blockedByMe: false,
  });
}

/**
 * Guarda (o actualiza `following` de) una lista ajena visible.
 * Idempotente por (saverId, listId).
 */
export async function saveList(
  saverId: string,
  listId: string,
  following = false,
): Promise<SavedListSummary> {
  const [row] = await db
    .select({
      id: userList.id,
      ownerId: userList.ownerId,
      audience: userList.audience,
      ownerVisibility: appUser.profileVisibility,
    })
    .from(userList)
    .innerJoin(appUser, eq(userList.ownerId, appUser.id))
    .where(and(eq(userList.id, listId), activeUserCondition()))
    .limit(1);

  if (!row) throw new ApiError("LIST_NOT_FOUND", 404, "La lista no existe");
  if (row.ownerId === saverId) {
    throw new ApiError("VALIDATION_ERROR", 400, "No podés guardar tu propia lista");
  }

  const relations = await relationsFor(saverId, [row.ownerId]);
  const allowed = audiencesFor(
    saverId,
    row.ownerId,
    row.ownerVisibility,
    relations.get(row.ownerId) ?? "none",
  );
  if (!allowed.includes(row.audience as Audience)) {
    throw new ApiError("LIST_NOT_FOUND", 404, "La lista no existe");
  }

  await db
    .insert(listSave)
    .values({ saverId, listId, following })
    .onConflictDoUpdate({
      target: [listSave.saverId, listSave.listId],
      set: { following },
    });

  const [saved] = await buildSavedSummaries(saverId, [{ listId }]);
  if (!saved) throw new ApiError("INTERNAL_ERROR", 500, "No se pudo guardar la lista");
  return saved;
}

/** Quita el guardado. Idempotente. */
export async function unsaveList(saverId: string, listId: string): Promise<void> {
  await db
    .delete(listSave)
    .where(and(eq(listSave.saverId, saverId), eq(listSave.listId, listId)));
}

/**
 * Activa o desactiva el tracking de progreso propio sobre una lista ajena de
 * álbumes (openspec: add-camino, Requirement "Trackear el progreso propio
 * sobre una lista ajena" de `list-saves`). Eje independiente de `following`:
 * a diferencia de `saveList`, el `set` del upsert solo toca `tracking`, así
 * que nunca pisa el `following` que el guardado ya tuviera. Si la lista
 * todavía no estaba guardada, la crea con `following: false` en la misma
 * operación.
 */
export async function setListTracking(
  trackerId: string,
  listId: string,
  tracking: boolean,
): Promise<SavedListSummary> {
  const [row] = await db
    .select({
      id: userList.id,
      ownerId: userList.ownerId,
      entityType: userList.entityType,
      audience: userList.audience,
      ownerVisibility: appUser.profileVisibility,
    })
    .from(userList)
    .innerJoin(appUser, eq(userList.ownerId, appUser.id))
    .where(and(eq(userList.id, listId), activeUserCondition()))
    .limit(1);

  if (!row) throw new ApiError("LIST_NOT_FOUND", 404, "La lista no existe");
  if (row.ownerId === trackerId) {
    throw new ApiError("VALIDATION_ERROR", 400, "No podés trackear tu propia lista");
  }
  if (row.entityType !== "release-group") {
    throw new ApiError(
      "VALIDATION_ERROR",
      400,
      "Solo se puede trackear progreso sobre listas de álbumes",
    );
  }

  const relations = await relationsFor(trackerId, [row.ownerId]);
  const allowed = audiencesFor(
    trackerId,
    row.ownerId,
    row.ownerVisibility,
    relations.get(row.ownerId) ?? "none",
  );
  if (!allowed.includes(row.audience as Audience)) {
    throw new ApiError("LIST_NOT_FOUND", 404, "La lista no existe");
  }

  await db
    .insert(listSave)
    .values({ saverId: trackerId, listId, following: false, tracking })
    .onConflictDoUpdate({
      target: [listSave.saverId, listSave.listId],
      set: { tracking },
    });

  const [saved] = await buildSavedSummaries(trackerId, [{ listId }]);
  if (!saved) throw new ApiError("INTERNAL_ERROR", 500, "No se pudo activar el tracking");
  return saved;
}

/**
 * Listas ajenas sobre las que `trackerId` activó tracking de progreso, con
 * su estado y progreso derivados contra el propio diario de `trackerId` —
 * para la superficie combinada `/me/caminos`. Una lista tracked no tiene
 * noción de "archivada" (esa acción pertenece al dueño de la lista, no a
 * quien la trackea), así que su estado siempre es `in_progress` o
 * `complete`.
 */
export async function listTrackedLists(trackerId: string): Promise<TrackedListSummary[]> {
  const rows = await db
    .select({
      listId: userList.id,
      title: userList.title,
      kind: userList.kind,
      updatedAt: userList.updatedAt,
      ownerId: appUser.id,
      ownerUsername: appUser.username,
      ownerDisplayName: appUser.displayName,
    })
    .from(listSave)
    .innerJoin(userList, eq(listSave.listId, userList.id))
    .innerJoin(appUser, eq(userList.ownerId, appUser.id))
    .where(and(eq(listSave.saverId, trackerId), eq(listSave.tracking, true), activeUserCondition()))
    .orderBy(desc(userList.updatedAt));
  if (rows.length === 0) return [];

  const listIds = rows.map((r) => r.listId);
  const [counts, enrichment] = await Promise.all([
    countsByListId(trackerId, listIds),
    enrichLists(listIds),
  ]);

  return rows.map((row) => {
    const count = counts.get(row.listId);
    const selectedCount = count?.selected ?? 0;
    const listenedCount = count?.listened ?? 0;
    return {
      id: row.listId,
      title: row.title,
      coverThumbUrl: enrichment.get(row.listId)?.coverThumbs[0] ?? null,
      kind: row.kind as "standard" | "custom_journey",
      owner: { id: row.ownerId, username: row.ownerUsername, displayName: row.ownerDisplayName },
      state: deriveJourneyState(null, selectedCount, listenedCount),
      progress: { selectedCount, listenedCount },
      updatedAt: row.updatedAt.toISOString(),
    };
  });
}

interface SavedRow {
  following: boolean;
  tracking: boolean;
  id: string;
  entityType: string;
  title: string;
  description: string | null;
  audience: string;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
  ownerUsername: string;
  ownerDisplayName: string | null;
  ownerVisibility: string;
}

const SAVED_ROW_COLUMNS = {
  following: listSave.following,
  tracking: listSave.tracking,
  id: userList.id,
  entityType: userList.entityType,
  title: userList.title,
  description: userList.description,
  audience: userList.audience,
  createdAt: userList.createdAt,
  updatedAt: userList.updatedAt,
  ownerId: appUser.id,
  ownerUsername: appUser.username,
  ownerDisplayName: appUser.displayName,
  ownerVisibility: appUser.profileVisibility,
} as const;

async function mapSavedRows(saverId: string, rows: SavedRow[]): Promise<SavedListSummary[]> {
  const [enrichment, relations] = await Promise.all([
    enrichLists(rows.map((row) => row.id)),
    relationsFor(
      saverId,
      rows.map((row) => row.ownerId),
    ),
  ]);
  return rows.map((row): SavedListSummary => {
    const allowed = audiencesFor(
      saverId,
      row.ownerId,
      row.ownerVisibility,
      relations.get(row.ownerId) ?? "none",
    );
    const enriched = enrichment.get(row.id);
    return {
      id: row.id,
      entityType: row.entityType as ListEntityType,
      title: row.title,
      description: row.description,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      itemCount: enriched?.itemCount ?? 0,
      coverThumbs: enriched?.coverThumbs ?? [],
      owner: {
        id: row.ownerId,
        username: row.ownerUsername,
        displayName: row.ownerDisplayName,
      },
      following: row.following,
      tracking: row.tracking,
      unavailable: !allowed.includes(row.audience as Audience),
    };
  });
}

async function buildSavedSummaries(
  saverId: string,
  keys: { listId: string }[],
): Promise<SavedListSummary[]> {
  if (keys.length === 0) return [];
  const rows = await db
    .select(SAVED_ROW_COLUMNS)
    .from(listSave)
    .innerJoin(userList, eq(listSave.listId, userList.id))
    .innerJoin(appUser, eq(userList.ownerId, appUser.id))
    .where(
      and(
        eq(listSave.saverId, saverId),
        inArray(
          listSave.listId,
          keys.map((key) => key.listId),
        ),
        activeUserCondition(),
      ),
    );
  return mapSavedRows(saverId, rows);
}

/** Listado paginado de las listas que guardó un usuario. */
export async function listSavedLists(saverId: string, page = 1, pageSize = 20) {
  if (page < 1 || pageSize < 1 || pageSize > 50) {
    throw new ApiError("VALIDATION_ERROR", 400, "La paginación no es válida");
  }

  const rows = await db
    .select(SAVED_ROW_COLUMNS)
    .from(listSave)
    .innerJoin(userList, eq(listSave.listId, userList.id))
    .innerJoin(appUser, eq(userList.ownerId, appUser.id))
    .where(and(eq(listSave.saverId, saverId), activeUserCondition()))
    .orderBy(desc(listSave.createdAt))
    .limit(pageSize + 1)
    .offset((page - 1) * pageSize);

  const pageRows = rows.slice(0, pageSize);

  return {
    lists: await mapSavedRows(saverId, pageRows),
    page,
    pageSize,
    hasNext: rows.length > pageSize,
  };
}

/** IDs de las listas que un usuario sigue (`following = true`). Para el feed. */
export async function followedListIds(saverId: string): Promise<string[]> {
  const rows = await db
    .select({ listId: listSave.listId })
    .from(listSave)
    .where(and(eq(listSave.saverId, saverId), eq(listSave.following, true)));
  return rows.map((row) => row.listId);
}

/**
 * Conteo total de guardados por lista. Dato público del agregado —nunca expone
 * quién guardó—, para la sección "Populares" y el detalle de una lista pública
 * (cambio add-community-lists-surface). Se apoya en `idx_list_save_list`.
 */
export async function saveCountsFor(listIds: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (listIds.length === 0) return result;
  const rows = await db
    .select({ listId: listSave.listId, n: count() })
    .from(listSave)
    .where(inArray(listSave.listId, listIds))
    .groupBy(listSave.listId);
  for (const row of rows) result.set(row.listId, Number(row.n));
  return result;
}

/** Estado de guardado del lector para un conjunto de listas (para Descubrir). */
export async function savedStateFor(
  saverId: string,
  listIds: string[],
): Promise<Map<string, { saved: boolean; following: boolean; tracking: boolean }>> {
  const result = new Map<string, { saved: boolean; following: boolean; tracking: boolean }>();
  if (listIds.length === 0) return result;
  const rows = await db
    .select({ listId: listSave.listId, following: listSave.following, tracking: listSave.tracking })
    .from(listSave)
    .where(and(eq(listSave.saverId, saverId), inArray(listSave.listId, listIds)));
  for (const row of rows) {
    result.set(row.listId, { saved: true, following: row.following, tracking: row.tracking });
  }
  return result;
}
