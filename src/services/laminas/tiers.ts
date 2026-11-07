// Tier list (openspec: add-tier-list-lamina-phase1, docs/05-features/sharing.md §4.3): discos repartidos en seis niveles, S a E,
// sobre user_list / user_list_item con kind = 'tier' (migración 0086), como el Top N. El nivel es un dato del ítem: 0 = S … 5 = E y
// NULL = bandeja "Sin escuchar / sin valorar", que solo ve el dueño. Este servicio es el único que escribe `user_list_item.tier`.
//
// Puede nacer de las valoraciones de una discografía (cada disco en el tramo de su nota de la escala de la casa), pero es una foto:
// nunca escribe valoraciones (D8) y no se mueve si después cambian.

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { artist, rating, userList, userListItem } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import { DEFAULT_TIER_LABELS, TIER_COUNT, TIER_LABEL_MAX, TIER_LIST_MAX_ITEMS, tierForScore } from "@/lib/laminas/tiers";
import { compareByYear } from "@/services/catalog/artist-discography-view";
import { findOrIngestOwnDiscography, readArtistDiscography } from "@/services/catalog/ingest-discography";
import { isMainDisc } from "@/services/laminas/discography";
import {
  findVisibleLamina,
  notFound,
  ownerScores,
  type LaminaRow,
  type LaminaScore,
} from "@/services/laminas/laminas";
import { listItems, normalizeTitle, type UserListItemEntry } from "@/services/lists/lists";
import type { Audience } from "@/services/social/types";

export type TierListEntityType = "release-group";

export type TierListItem = UserListItemEntry & { score: LaminaScore | null };

export interface TierListDetail {
  id: string;
  kind: "tier";
  title: string;
  entityType: TierListEntityType;
  audience: Audience;
  updatedAt: string;
  showScores: boolean;
  /** Las seis etiquetas, de S a E. */
  labels: string[];
  /** Seis niveles, de S a E, cada uno en su orden. */
  tiers: TierListItem[][];
  /** Bandeja "Sin escuchar / sin valorar": solo para el dueño; vacía para cualquier otra persona. */
  tray: TierListItem[];
}

export type TierListSource = { type: "discography"; artistId: string };

async function requireOwnedTier(id: string, ownerId: string): Promise<LaminaRow> {
  const [row] = await db
    .select()
    .from(userList)
    .where(and(eq(userList.id, id), eq(userList.ownerId, ownerId), eq(userList.kind, "tier")))
    .limit(1);
  if (!row) throw notFound();
  return row;
}

async function itemTiers(listId: string): Promise<Map<string, number | null>> {
  const rows = await db.select({ id: userListItem.id, tier: userListItem.tier }).from(userListItem).where(eq(userListItem.listId, listId));
  return new Map(rows.map((row) => [row.id, row.tier]));
}

async function buildTierDetail(row: LaminaRow, { forOwner }: { forOwner: boolean }): Promise<TierListDetail> {
  const [items, tierOf] = await Promise.all([listItems(row.id), itemTiers(row.id)]);
  // El dueño ve sus notas, discretas, para orientarse; los demás, solo si las encendió.
  const scores = forOwner || row.laminaShowScores ? await ownerScores(row, items) : new Map<string, LaminaScore>();
  const tiers: TierListItem[][] = Array.from({ length: TIER_COUNT }, () => []);
  const tray: TierListItem[] = [];
  for (const item of items) {
    const entry = { ...item, score: scores.get(item.target.id) ?? null };
    const tier = tierOf.get(item.id) ?? null;
    if (tier === null) {
      if (forOwner) tray.push(entry);
    } else {
      tiers[tier]!.push(entry);
    }
  }
  return {
    id: row.id,
    kind: "tier",
    title: row.title,
    entityType: row.entityType as TierListEntityType,
    audience: row.audience as Audience,
    updatedAt: row.updatedAt.toISOString(),
    showScores: row.laminaShowScores,
    labels: row.tierLabels ?? [...DEFAULT_TIER_LABELS],
    tiers,
    tray,
  };
}

/** Normaliza y valida las seis etiquetas; la base repite la regla con `fn_tier_labels_valid`. */
export function normalizeTierLabels(labels: readonly string[]): string[] {
  if (labels.length !== TIER_COUNT) throw new ApiError("VALIDATION_ERROR", 400, "Una tier list tiene seis niveles");
  return labels.map((label) => {
    const trimmed = label.trim();
    if (trimmed.length === 0 || [...trimmed].length > TIER_LABEL_MAX) {
      throw new ApiError("VALIDATION_ERROR", 400, `Cada nivel lleva entre 1 y ${TIER_LABEL_MAX} caracteres`);
    }
    return trimmed;
  });
}

interface Placement {
  targetId: string;
  tier: number | null;
}

/**
 * Discos de la sección principal del artista, por año, cada uno en el nivel del tramo de la nota del dueño y los sin valorar
 * en la bandeja. Con más de `TIER_LIST_MAX_ITEMS`, primero los valorados.
 */
export async function placementsFromDiscography(ownerId: string, artistId: string): Promise<Placement[]> {
  const [target] = await db.select().from(artist).where(eq(artist.id, artistId)).limit(1);
  if (!target) throw new ApiError("VALIDATION_ERROR", 400, "El artista no existe");
  // Si ya está sincronizada se lee tal cual: armar una tier list no dispara una resincronización.
  const rows = target.discographySyncedAt ? await readArtistDiscography(artistId) : await findOrIngestOwnDiscography(target);
  const discs = rows
    .filter(isMainDisc)
    .map((row) => ({ id: row.id, title: row.title, year: row.firstReleaseYear }))
    .sort(compareByYear);
  if (discs.length === 0) throw new ApiError("VALIDATION_ERROR", 400, "El artista no tiene discos para armar la tier list");

  const ratings = await db
    .select({ id: rating.releaseGroupId, stars: rating.stars, detailedScore: rating.detailedScore })
    .from(rating)
    .where(and(eq(rating.userId, ownerId), inArray(rating.releaseGroupId, discs.map((disc) => disc.id))));
  const tierOf = new Map(
    ratings.flatMap((row) => (row.id ? [[row.id, tierForScore({ stars: Number(row.stars), detailedScore: row.detailedScore })] as const] : [])),
  );
  const placements = discs.map((disc) => ({ targetId: disc.id, tier: tierOf.get(disc.id) ?? null }));
  if (placements.length <= TIER_LIST_MAX_ITEMS) return placements;
  const kept = new Set(
    [...placements.filter((p) => p.tier !== null), ...placements.filter((p) => p.tier === null)]
      .slice(0, TIER_LIST_MAX_ITEMS)
      .map((p) => p.targetId),
  );
  return placements.filter((p) => kept.has(p.targetId));
}

/** Posiciones en el orden de la lista: S … E y al final la bandeja; dentro de cada uno, el orden recibido. */
function orderedPlacements(placements: readonly Placement[]): Placement[] {
  const rank = (tier: number | null) => (tier === null ? TIER_COUNT : tier);
  return placements.map((p, index) => ({ p, index })).sort((a, b) => rank(a.p.tier) - rank(b.p.tier) || a.index - b.index).map(({ p }) => p);
}

export async function createTierList(
  ownerId: string,
  params: { title: string; entityType: TierListEntityType; source: TierListSource },
): Promise<TierListDetail> {
  const title = normalizeTitle(params.title);
  // Fuera de la transacción: puede sincronizar la discografía con MusicBrainz.
  const placements = orderedPlacements(await placementsFromDiscography(ownerId, params.source.artistId));
  const created = await db.transaction(async (tx) => {
    // Armada desde una fuente: nace privada, como un Top N desde una fuente. Publicarla es un gesto aparte.
    const [row] = await tx
      .insert(userList)
      .values({ ownerId, entityType: params.entityType, title, audience: "private", kind: "tier", tierLabels: [...DEFAULT_TIER_LABELS] })
      .returning();
    if (!row) throw new ApiError("INTERNAL_ERROR", 500, "No se pudo crear la tier list");
    await tx
      .insert(userListItem)
      .values(placements.map((p, index) => ({ listId: row.id, position: index + 1, releaseGroupId: p.targetId, tier: p.tier })));
    return row;
  });
  return buildTierDetail(created, { forOwner: true });
}

export async function getOwnedTierList(id: string, ownerId: string): Promise<TierListDetail> {
  return buildTierDetail(await requireOwnedTier(id, ownerId), { forOwner: true });
}

/** Lectura ajena con las reglas de la página pública; la bandeja nunca sale. */
export async function getUserTierList(username: string, id: string, viewerId: string | null): Promise<TierListDetail> {
  const { row } = await findVisibleLamina(username, id, viewerId);
  if (row.kind !== "tier") throw notFound();
  // Aun para el dueño, la página pública es la vista de los demás: sin bandeja ni notas apagadas.
  return buildTierDetail(row, { forOwner: false });
}

export async function updateTierList(
  id: string,
  ownerId: string,
  changes: { title?: string; audience?: Audience; showScores?: boolean; tierLabels?: string[] },
): Promise<TierListDetail> {
  const labels = changes.tierLabels ? normalizeTierLabels(changes.tierLabels) : undefined;
  const title = changes.title !== undefined ? normalizeTitle(changes.title) : undefined;
  const updated = await db
    .update(userList)
    .set({
      ...(title !== undefined ? { title } : {}),
      ...(changes.audience ? { audience: changes.audience } : {}),
      ...(changes.showScores !== undefined ? { laminaShowScores: changes.showScores } : {}),
      ...(labels ? { tierLabels: labels } : {}),
    })
    .where(and(eq(userList.id, id), eq(userList.ownerId, ownerId), eq(userList.kind, "tier")))
    .returning({ id: userList.id });
  if (updated.length === 0) throw notFound();
  return getOwnedTierList(id, ownerId);
}

/**
 * Guarda la disposición completa: seis niveles y la bandeja, como ids de ítem. Debe traer exactamente los ítems de la tier list;
 * si no (otra pestaña quitó uno, por ejemplo), `VALIDATION_ERROR` sin cambiar nada. No toca ninguna valoración.
 */
export async function arrangeTierList(
  id: string,
  ownerId: string,
  arrangement: { tiers: string[][]; tray: string[] },
): Promise<TierListDetail> {
  if (arrangement.tiers.length !== TIER_COUNT) throw new ApiError("VALIDATION_ERROR", 400, "Una tier list tiene seis niveles");
  const placed = [...arrangement.tiers.flatMap((ids, tier) => ids.map((itemId) => ({ itemId, tier }))), ...arrangement.tray.map((itemId) => ({ itemId, tier: null }))];

  await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ id: userList.id, title: userList.title })
      .from(userList)
      .where(and(eq(userList.id, id), eq(userList.ownerId, ownerId), eq(userList.kind, "tier")))
      .for("update")
      .limit(1);
    if (!row) throw notFound();
    const current = await tx.select({ id: userListItem.id }).from(userListItem).where(eq(userListItem.listId, id));
    const known = new Set(current.map((item) => item.id));
    const sent = new Set(placed.map((p) => p.itemId));
    if (placed.length !== known.size || sent.size !== known.size || placed.some((p) => !known.has(p.itemId))) {
      throw new ApiError("VALIDATION_ERROR", 400, "La disposición no coincide con los discos de la tier list");
    }
    for (const [index, p] of placed.entries()) {
      await tx
        .update(userListItem)
        .set({ position: index + 1, tier: p.tier })
        .where(and(eq(userListItem.listId, id), eq(userListItem.id, p.itemId)));
    }
    // Toca `updated_at` por el trigger: versiona la imagen y ordena el listado.
    await tx.update(userList).set({ title: row.title }).where(eq(userList.id, id));
  });
  return getOwnedTierList(id, ownerId);
}

export async function removeTierListItem(id: string, ownerId: string, itemId: string): Promise<TierListDetail> {
  const row = await requireOwnedTier(id, ownerId);
  const removed = await db
    .delete(userListItem)
    .where(and(eq(userListItem.listId, id), eq(userListItem.id, itemId)))
    .returning({ id: userListItem.id });
  if (removed.length > 0) await db.update(userList).set({ title: row.title }).where(eq(userList.id, id));
  return getOwnedTierList(id, ownerId);
}
