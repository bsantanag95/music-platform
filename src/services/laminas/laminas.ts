// Láminas Top N (openspec: add-top-n-lamina-phase1, docs/05-features/sharing.md §4.2): rankings armados a mano sobre
// user_list / user_list_item con kind = 'top', mismo patrón que Camino. Quedan fuera de las superficies de listas, que
// filtran por kind = 'standard', y tienen sus propias rutas. Las notas nacen apagadas: `rating` no tiene audiencia, así
// que mostrarlas es una decisión explícita del dueño.

import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { appUser, rating, userList, userListItem } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import { enrichLists, listItems, normalizeTitle, resolveListTarget, type UserListItemEntry } from "@/services/lists/lists";
import { resolveNewContentAudience } from "@/services/social/default-audience";
import { getProfileByUsername } from "@/services/social/profiles";
import type { Audience } from "@/services/social/types";
import { audiencesForProfile } from "@/services/social/visibility";

export const LAMINA_FORMATS = ["top5", "top10", "grid9"] as const;
export type LaminaFormat = (typeof LAMINA_FORMATS)[number];

export const LAMINA_ENTITY_TYPES = ["release-group", "recording"] as const;
export type LaminaEntityType = (typeof LAMINA_ENTITY_TYPES)[number];

export const LAMINA_CAPACITY: Record<LaminaFormat, number> = { top5: 5, top10: 10, grid9: 9 };

/** Láminas de autor guardadas en `user_list`: el Top N (0083) y la tier list (0086, `src/services/laminas/tiers.ts`). */
export const LAMINA_KINDS = ["top", "tier"] as const;
export type LaminaKind = (typeof LAMINA_KINDS)[number];

export interface LaminaScore {
  stars: string;
  detailedScore: number | null;
}

export type LaminaItem = UserListItemEntry & { score: LaminaScore | null };

export interface LaminaSummary {
  id: string;
  kind: LaminaKind;
  title: string;
  /** Formato del Top N; `null` en una tier list, que tiene uno solo. */
  format: LaminaFormat | null;
  entityType: LaminaEntityType;
  audience: Audience;
  updatedAt: string;
  itemCount: number;
  coverThumbs: string[];
}

export interface LaminaDetail extends Omit<LaminaSummary, "itemCount" | "coverThumbs" | "kind" | "format"> {
  format: LaminaFormat;
  showScores: boolean;
  items: LaminaItem[];
}

export type LaminaRow = typeof userList.$inferSelect;

export function notFound(): ApiError {
  return new ApiError("LAMINA_NOT_FOUND", 404, "La Lámina no existe");
}

/** Tipo de una Lámina propia; `LAMINA_NOT_FOUND` si no existe o es de otra persona. Sirve para despachar rutas y páginas. */
export async function ownedLaminaKind(id: string, ownerId: string): Promise<LaminaKind> {
  const [row] = await db
    .select({ kind: userList.kind })
    .from(userList)
    .where(and(eq(userList.id, id), eq(userList.ownerId, ownerId), inArray(userList.kind, [...LAMINA_KINDS])))
    .limit(1);
  if (!row) throw notFound();
  return row.kind as LaminaKind;
}

/**
 * Tipo de una Lámina por su id, sin mirar quién la ve: solo despacha la página pública y sus metadatos, que después aplican las reglas de
 * visibilidad de cada tipo. `null` si no es una Lámina.
 */
export async function laminaKindById(id: string): Promise<LaminaKind | null> {
  const [row] = await db
    .select({ kind: userList.kind })
    .from(userList)
    .where(and(eq(userList.id, id), inArray(userList.kind, [...LAMINA_KINDS])))
    .limit(1);
  return (row?.kind as LaminaKind | undefined) ?? null;
}

/**
 * Fila de una Lámina ajena con las reglas de su página pública: audiencia del perfil y, salvo para el dueño, sin lo oculto por
 * moderación. `LAMINA_NOT_FOUND` si no se puede ver.
 */
export async function findVisibleLamina(
  username: string,
  id: string,
  viewerId: string | null,
): Promise<{ row: LaminaRow; forOwner: boolean }> {
  const profile = await getProfileByUsername(username, viewerId);
  const audiences = audiencesForProfile(profile);
  if (audiences.length === 0) throw notFound();
  const [row] = await db
    .select()
    .from(userList)
    .where(
      and(
        eq(userList.id, id),
        eq(userList.ownerId, profile.id),
        inArray(userList.kind, [...LAMINA_KINDS]),
        inArray(userList.audience, audiences),
        profile.relation === "self" ? undefined : eq(userList.moderationStatus, "visible"),
      ),
    )
    .limit(1);
  if (!row) throw notFound();
  return { row, forOwner: profile.relation === "self" };
}

async function requireOwned(id: string, ownerId: string): Promise<LaminaRow> {
  const [row] = await db
    .select()
    .from(userList)
    .where(and(eq(userList.id, id), eq(userList.ownerId, ownerId), eq(userList.kind, "top")))
    .limit(1);
  if (!row) throw notFound();
  return row;
}

/** Notas vigentes del dueño para los ítems, por id del objetivo. */
export async function ownerScores(row: LaminaRow, items: UserListItemEntry[]): Promise<Map<string, LaminaScore>> {
  const ids = items.map((item) => item.target.id);
  if (ids.length === 0) return new Map();
  const column = row.entityType === "recording" ? rating.recordingId : rating.releaseGroupId;
  const rows = await db
    .select({ targetId: column, stars: rating.stars, detailedScore: rating.detailedScore })
    .from(rating)
    .where(and(eq(rating.userId, row.ownerId), inArray(column, ids)));
  return new Map(rows.flatMap((r) => (r.targetId ? [[r.targetId, { stars: r.stars, detailedScore: r.detailedScore }] as const] : [])));
}

async function buildDetail(row: LaminaRow, { forOwner }: { forOwner: boolean }): Promise<LaminaDetail> {
  const items = await listItems(row.id);
  // El dueño ve sus notas para decidir si las muestra; los demás, solo si las encendió.
  const scores = forOwner || row.laminaShowScores ? await ownerScores(row, items) : new Map<string, LaminaScore>();
  return {
    id: row.id,
    title: row.title,
    format: row.laminaFormat as LaminaFormat,
    entityType: row.entityType as LaminaEntityType,
    audience: row.audience as Audience,
    updatedAt: row.updatedAt.toISOString(),
    showScores: row.laminaShowScores,
    items: items.map((item) => ({ ...item, score: scores.get(item.target.id) ?? null })),
  };
}

async function assertTargets(entityType: LaminaEntityType, targetIds: string[]): Promise<void> {
  for (const targetId of targetIds) await resolveListTarget(entityType, targetId);
}

function itemRows(listId: string, entityType: LaminaEntityType, targetIds: string[], lastPosition: number) {
  return targetIds.map((targetId, index) => ({
    listId,
    position: lastPosition + index + 1,
    ...(entityType === "recording" ? { recordingId: targetId } : { releaseGroupId: targetId }),
  }));
}

export async function listMyLaminas(ownerId: string): Promise<LaminaSummary[]> {
  const rows = await db
    .select()
    .from(userList)
    .where(and(eq(userList.ownerId, ownerId), inArray(userList.kind, [...LAMINA_KINDS])))
    .orderBy(desc(userList.updatedAt), desc(userList.id));
  const enrichment = await enrichLists(rows.map((row) => row.id));
  return rows.map((row) => ({
    id: row.id,
    kind: row.kind as LaminaKind,
    title: row.title,
    format: (row.laminaFormat as LaminaFormat | null) ?? null,
    entityType: row.entityType as LaminaEntityType,
    audience: row.audience as Audience,
    updatedAt: row.updatedAt.toISOString(),
    itemCount: enrichment.get(row.id)?.itemCount ?? 0,
    coverThumbs: enrichment.get(row.id)?.coverThumbs ?? [],
  }));
}

export async function createLamina(
  ownerId: string,
  params: { title: string; format: LaminaFormat; entityType: LaminaEntityType; audience?: Audience; targetIds?: string[] },
): Promise<LaminaDetail> {
  const targetIds = [...new Set(params.targetIds ?? [])];
  const fromSource = targetIds.length > 0;
  if (fromSource && params.audience) throw new ApiError("VALIDATION_ERROR", 400, "Una Lámina armada desde una fuente nace privada");
  if (targetIds.length > LAMINA_CAPACITY[params.format]) throw new ApiError("VALIDATION_ERROR", 400, "No entran en la Lámina");
  // Fuera de la transacción: mismo motivo que en `addLaminaItems`.
  await assertTargets(params.entityType, targetIds);
  // Una fuente puede traer favoritos, listas o escuchas privadas: publicarla es una decisión aparte, y no depende del defecto.
  const audience = fromSource ? "private" : await resolveNewContentAudience(ownerId, "list", params.audience);

  const created = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(userList)
      .values({ ownerId, entityType: params.entityType, title: normalizeTitle(params.title), audience, kind: "top", laminaFormat: params.format })
      .returning();
    if (!row) throw new ApiError("INTERNAL_ERROR", 500, "No se pudo crear la Lámina");
    if (fromSource) await tx.insert(userListItem).values(itemRows(row.id, params.entityType, targetIds, 0));
    return row;
  });
  return buildDetail(created, { forOwner: true });
}

export async function getOwnedLamina(id: string, ownerId: string): Promise<LaminaDetail> {
  return buildDetail(await requireOwned(id, ownerId), { forOwner: true });
}

/** Lectura ajena de un Top N, con las reglas de `findVisibleLamina`. */
export async function getUserLamina(username: string, id: string, viewerId: string | null): Promise<LaminaDetail> {
  const { row, forOwner } = await findVisibleLamina(username, id, viewerId);
  if (row.kind !== "top") throw notFound();
  return buildDetail(row, { forOwner });
}

export interface LaminaInspiration {
  id: string;
  title: string;
  format: LaminaFormat;
  entityType: LaminaEntityType;
  ownerUsername: string;
}

/**
 * Lo que "Arma la tuya" hereda de una Lámina ajena, con las reglas de su página pública. `null` si no existe, no se puede ver o
 * es propia: el formulario queda como siempre y no revela nada. Nunca trae ítems ni notas.
 */
export async function getLaminaInspiration(id: string, viewerId: string): Promise<LaminaInspiration | null> {
  const [owner] = await db
    .select({ id: appUser.id, username: appUser.username })
    .from(userList)
    .innerJoin(appUser, eq(appUser.id, userList.ownerId))
    .where(and(eq(userList.id, id), eq(userList.kind, "top")))
    .limit(1);
  if (!owner || owner.id === viewerId) return null;
  try {
    const { title, format, entityType } = await getUserLamina(owner.username, id, viewerId);
    return { id, title, format, entityType, ownerUsername: owner.username };
  } catch (error) {
    if (error instanceof ApiError) return null;
    throw error;
  }
}

export async function updateLamina(
  id: string,
  ownerId: string,
  changes: { title?: string; format?: LaminaFormat; audience?: Audience; showScores?: boolean },
): Promise<LaminaDetail> {
  await db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(userList)
      .where(and(eq(userList.id, id), eq(userList.ownerId, ownerId), eq(userList.kind, "top")))
      .for("update")
      .limit(1);
    if (!row) throw notFound();
    await tx
      .update(userList)
      .set({
        ...(changes.title !== undefined ? { title: normalizeTitle(changes.title) } : {}),
        ...(changes.format ? { laminaFormat: changes.format } : {}),
        ...(changes.audience ? { audience: changes.audience } : {}),
        ...(changes.showScores !== undefined ? { laminaShowScores: changes.showScores } : {}),
      })
      .where(eq(userList.id, id));
    // Bajar de formato deja afuera los últimos puestos: la interfaz avisa antes de guardar.
    if (changes.format) {
      const overflow = await tx
        .select({ id: userListItem.id })
        .from(userListItem)
        .where(eq(userListItem.listId, id))
        .orderBy(asc(userListItem.position), asc(userListItem.id))
        .offset(LAMINA_CAPACITY[changes.format]);
      if (overflow.length > 0) await tx.delete(userListItem).where(inArray(userListItem.id, overflow.map((item) => item.id)));
    }
  });
  return getOwnedLamina(id, ownerId);
}

/** Borra una Lámina propia de cualquier tipo. */
export async function deleteLamina(id: string, ownerId: string): Promise<void> {
  await ownedLaminaKind(id, ownerId);
  await db.delete(userList).where(and(eq(userList.id, id), eq(userList.ownerId, ownerId), inArray(userList.kind, [...LAMINA_KINDS])));
}

/** Agrega al final. Idempotente: un repetido no cambia nada. */
export function addLaminaItem(id: string, ownerId: string, targetId: string): Promise<LaminaDetail> {
  return addLaminaItems(id, ownerId, [targetId]);
}

/** Agrega en orden, entero o nada: los repetidos se omiten y el tope se cuenta con la lista bloqueada. */
export async function addLaminaItems(id: string, ownerId: string, targetIds: string[]): Promise<LaminaDetail> {
  // Fuera de la transacción: leer con otra conexión mientras se espera el bloqueo agotaría el pool con pedidos en paralelo.
  const { entityType: rawEntityType } = await requireOwned(id, ownerId);
  const entityType = rawEntityType as LaminaEntityType;
  const requested = [...new Set(targetIds)];
  await assertTargets(entityType, requested);

  await db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(userList)
      .where(and(eq(userList.id, id), eq(userList.ownerId, ownerId), eq(userList.kind, "top")))
      .for("update")
      .limit(1);
    if (!row) throw notFound();

    const column = entityType === "recording" ? userListItem.recordingId : userListItem.releaseGroupId;
    const current = await tx.select({ target: column, position: userListItem.position }).from(userListItem).where(eq(userListItem.listId, id));
    const known = new Set(current.map((item) => item.target));
    const fresh = requested.filter((targetId) => !known.has(targetId));
    if (fresh.length === 0) return;
    if (current.length + fresh.length > LAMINA_CAPACITY[row.laminaFormat as LaminaFormat]) {
      throw new ApiError("VALIDATION_ERROR", 400, "La Lámina ya está completa");
    }
    const last = current.reduce((max, item) => Math.max(max, item.position), 0);
    await tx.insert(userListItem).values(itemRows(id, entityType, fresh, last));
    // Toca `updated_at` por el trigger: el feed y el listado la muestran como actualizada.
    await tx.update(userList).set({ title: row.title }).where(eq(userList.id, id));
  });
  return getOwnedLamina(id, ownerId);
}

export async function removeLaminaItem(id: string, ownerId: string, itemId: string): Promise<LaminaDetail> {
  const row = await requireOwned(id, ownerId);
  const removed = await db
    .delete(userListItem)
    .where(and(eq(userListItem.listId, id), eq(userListItem.id, itemId)))
    .returning({ id: userListItem.id });
  if (removed.length > 0) await db.update(userList).set({ title: row.title }).where(eq(userList.id, id));
  return getOwnedLamina(id, ownerId);
}

/** Reordena: `itemIds` debe traer exactamente los ítems de la Lámina. */
export async function reorderLamina(id: string, ownerId: string, itemIds: string[]): Promise<LaminaDetail> {
  const row = await requireOwned(id, ownerId);
  const current = await db.select({ id: userListItem.id }).from(userListItem).where(eq(userListItem.listId, id));
  const known = new Set(current.map((item) => item.id));
  if (itemIds.length !== known.size || new Set(itemIds).size !== known.size || itemIds.some((item) => !known.has(item))) {
    throw new ApiError("VALIDATION_ERROR", 400, "El orden no coincide con los ítems de la Lámina");
  }
  await db.transaction(async (tx) => {
    for (const [index, itemId] of itemIds.entries()) {
      await tx.update(userListItem).set({ position: index + 1 }).where(and(eq(userListItem.listId, id), eq(userListItem.id, itemId)));
    }
    await tx.update(userList).set({ title: row.title }).where(eq(userList.id, id));
  });
  return getOwnedLamina(id, ownerId);
}
