// Gestión editorial de las colecciones destacadas de /explore (openspec:
// manage-explore-featured-console, ADR 0034). Las lecturas las sirve cualquiera con
// `editorial.author`; todas las escrituras exigen `editorial.publish` y las reglas de elegibilidad
// viven aquí, no en la UI.

import { after } from "next/server";
import { and, asc, desc, eq, isNotNull, isNull, notInArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  appUser,
  exploreCollectionSync,
  exploreCollectionTemplateState,
  userList,
  userListFeatured,
  userListItem,
} from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import { requirePermissionForUser } from "@/services/auth/authorization";
import { recordEditorialAction } from "@/services/lists/editorial";
import { AUTOMATIC_RAIL_LIMIT, COLLECTION_REFRESH_DAYS, CURATOR_USERNAME, EDITORIAL_RAIL_LIMIT } from "./constants";
import { GROUP_SOURCE, featuredRailCondition, type CollectionGroup } from "./discovery";
import { syncTemplate } from "./collections/sync";
import { COLLECTION_TEMPLATES, findTemplate } from "./collections/templates";

const REFRESH_MS = COLLECTION_REFRESH_DAYS * 24 * 60 * 60 * 1000;
const MAX_RANK = 32000;

export type FeaturedStatus =
  | "in_rail"
  | "beyond_limit"
  | "scheduled"
  | "expired"
  | "withdrawn"
  | "hidden"
  | "not_public";

export interface FeaturedAdminRow {
  listId: string;
  title: string;
  source: "curated" | "template";
  /** Rail al que pertenece: la selección editorial (`curated`) o las automáticas (`automatic`). */
  group: CollectionGroup;
  templateKey: string | null;
  periodKey: string | null;
  rank: number;
  weight: number;
  startsAt: string;
  expiresAt: string | null;
  itemCount: number;
  status: FeaturedStatus;
  /** Participa del orden editable (vigente o programada): lo que `reorderFeatured` espera completo. */
  orderable: boolean;
}

export interface EligibleList {
  id: string;
  title: string;
}

export interface FeaturedSchedule {
  startsAt?: Date;
  expiresAt?: Date | null;
  weight?: number;
}

export interface TemplateAdminRow {
  key: string;
  paused: boolean;
  pausedAt: string | null;
  lastRun: { status: "running" | "succeeded" | "failed"; startedAt: string; finishedAt: string | null; itemCount: number | null; error: string | null } | null;
  lastSuccessAt: string | null;
  /** Álbumes que cumplió la regla en la última corrida exitosa (puede ser menos del mínimo: no se crea la colección). */
  lastItemCount: number | null;
  nextDueAt: string | null;
  current: { listId: string; title: string; periodKey: string; inRail: boolean } | null;
}

// --- Lecturas ---------------------------------------------------------------------------------

const GROUP_LIMIT: Record<CollectionGroup, number> = {
  curated: EDITORIAL_RAIL_LIMIT,
  automatic: AUTOMATIC_RAIL_LIMIT,
};

/** Ids de las listas que hoy muestra el rail de un grupo (mismas condiciones, orden y tope que el rail público). */
async function railIdsOf(group: CollectionGroup): Promise<string[]> {
  const rows = await db
    .select({ id: userList.id })
    .from(userListFeatured)
    .innerJoin(userList, eq(userList.id, userListFeatured.listId))
    .where(and(featuredRailCondition(), eq(userListFeatured.source, GROUP_SOURCE[group])))
    .orderBy(desc(userListFeatured.weight), asc(userListFeatured.rank), desc(userListFeatured.startsAt))
    .limit(GROUP_LIMIT[group]);
  return rows.map((row) => row.id);
}

/** Ids de las listas que hoy muestran los dos riles de `/explore`, cada uno con su propio tope. */
async function railListIds(): Promise<Set<string>> {
  const [curated, automatic] = await Promise.all([railIdsOf("curated"), railIdsOf("automatic")]);
  return new Set([...curated, ...automatic]);
}

/** Todas las filas de `user_list_featured`, con su estado frente al riel. */
export async function listFeaturedAdmin(now = new Date()): Promise<FeaturedAdminRow[]> {
  const [rows, inRail] = await Promise.all([
    db
      .select({
        listId: userList.id,
        title: userList.title,
        audience: userList.audience,
        moderationStatus: userList.moderationStatus,
        isOfficial: userList.isOfficial,
        officialWithdrawnAt: userList.officialWithdrawnAt,
        source: userListFeatured.source,
        templateKey: userListFeatured.templateKey,
        periodKey: userListFeatured.periodKey,
        rank: userListFeatured.rank,
        weight: userListFeatured.weight,
        startsAt: userListFeatured.startsAt,
        expiresAt: userListFeatured.expiresAt,
        itemCount: sql<number>`(select count(*)::int from ${userListItem} where ${userListItem.listId} = ${userList.id})`,
      })
      .from(userListFeatured)
      .innerJoin(userList, eq(userList.id, userListFeatured.listId))
      .orderBy(desc(userListFeatured.weight), asc(userListFeatured.rank), desc(userListFeatured.startsAt)),
    railListIds(),
  ]);

  const result = rows.map<FeaturedAdminRow>((row) => {
    const expired = row.expiresAt !== null && row.expiresAt.getTime() <= now.getTime();
    let status: FeaturedStatus;
    if (expired) status = "expired";
    else if (row.startsAt.getTime() > now.getTime()) status = "scheduled";
    else if (row.moderationStatus !== "visible") status = "hidden";
    else if (row.audience !== "public") status = "not_public";
    else if (row.source === "curated" && (!row.isOfficial || row.officialWithdrawnAt)) status = "withdrawn";
    else status = inRail.has(row.listId) ? "in_rail" : "beyond_limit";
    return {
      listId: row.listId,
      title: row.title,
      source: row.source,
      group: row.source === "curated" ? "curated" : "automatic",
      templateKey: row.templateKey,
      periodKey: row.periodKey,
      rank: row.rank,
      weight: row.weight,
      startsAt: row.startsAt.toISOString(),
      expiresAt: row.expiresAt?.toISOString() ?? null,
      itemCount: Number(row.itemCount),
      status,
      orderable: !expired,
    };
  });
  // Las vencidas al final; el resto conserva el orden del riel.
  return [...result.filter((row) => row.orderable), ...result.filter((row) => !row.orderable)];
}

/** Listas que se pueden destacar: oficiales publicadas de la cuenta curadora, aún sin fila destacada. */
export async function listEligibleForFeature(): Promise<EligibleList[]> {
  return db
    .select({ id: userList.id, title: userList.title })
    .from(userList)
    .innerJoin(appUser, eq(appUser.id, userList.ownerId))
    .where(
      and(
        eq(appUser.username, CURATOR_USERNAME),
        eligibleListCondition(),
        notInArray(userList.id, db.select({ id: userListFeatured.listId }).from(userListFeatured)),
      ),
    )
    .orderBy(desc(userList.officialPublishedAt));
}

function eligibleListCondition() {
  return and(
    eq(userList.kind, "standard"),
    eq(userList.entityType, "release-group"),
    eq(userList.audience, "public"),
    eq(userList.moderationStatus, "visible"),
    eq(userList.isOfficial, true),
    isNull(userList.officialWithdrawnAt),
  );
}

// --- Escrituras sobre destacadas ----------------------------------------------------------------

function assertSchedule(startsAt: Date, expiresAt: Date | null): void {
  if (expiresAt && expiresAt.getTime() <= startsAt.getTime()) {
    throw new ApiError("VALIDATION_ERROR", 400, "La vigencia termina antes de empezar");
  }
}

/** Destaca una lista oficial publicada. Si ya estaba destacada, solo aplica la vigencia y el peso dados. */
export async function featureList(actorId: string, listId: string, schedule: FeaturedSchedule = {}): Promise<void> {
  await requirePermissionForUser(actorId, "editorial.publish");

  const [list] = await db
    .select({
      ownerUsername: appUser.username,
      kind: userList.kind,
      entityType: userList.entityType,
      audience: userList.audience,
      moderationStatus: userList.moderationStatus,
      isOfficial: userList.isOfficial,
      officialWithdrawnAt: userList.officialWithdrawnAt,
    })
    .from(userList)
    .innerJoin(appUser, eq(appUser.id, userList.ownerId))
    .where(eq(userList.id, listId))
    .limit(1);
  if (!list) throw new ApiError("LIST_NOT_FOUND", 404, "La lista no existe");
  if (
    list.ownerUsername !== CURATOR_USERNAME ||
    list.kind !== "standard" ||
    list.entityType !== "release-group" ||
    list.audience !== "public" ||
    list.moderationStatus !== "visible"
  ) {
    throw new ApiError("FEATURE_NOT_ELIGIBLE", 409, "La lista no se puede destacar");
  }
  if (!list.isOfficial || list.officialWithdrawnAt) {
    throw new ApiError("FEATURE_NOT_PUBLISHED", 409, "La lista no está publicada");
  }

  const [existing] = await db
    .select({ listId: userListFeatured.listId })
    .from(userListFeatured)
    .where(eq(userListFeatured.listId, listId));
  if (existing) {
    await updateFeaturedSchedule(actorId, listId, schedule);
    return;
  }

  const startsAt = schedule.startsAt ?? new Date();
  const expiresAt = schedule.expiresAt ?? null;
  assertSchedule(startsAt, expiresAt);
  const [last] = await db
    .select({ next: sql<number>`coalesce(max(${userListFeatured.rank}), 0) + 1` })
    .from(userListFeatured);
  await db.insert(userListFeatured).values({
    listId,
    rank: Math.min(Number(last?.next ?? 1), MAX_RANK),
    weight: schedule.weight ?? 0,
    source: "curated",
    startsAt,
    expiresAt,
  });
  await recordEditorialAction(listId, actorId, "feature");
}

/** Cambia la vigencia y/o el peso de una destacada. */
export async function updateFeaturedSchedule(
  actorId: string,
  listId: string,
  schedule: FeaturedSchedule,
): Promise<void> {
  await requirePermissionForUser(actorId, "editorial.publish");
  const [row] = await db
    .select({ startsAt: userListFeatured.startsAt, expiresAt: userListFeatured.expiresAt })
    .from(userListFeatured)
    .where(eq(userListFeatured.listId, listId));
  if (!row) throw new ApiError("FEATURED_NOT_FOUND", 404, "La colección no está destacada");

  const startsAt = schedule.startsAt ?? row.startsAt;
  const expiresAt = schedule.expiresAt === undefined ? row.expiresAt : schedule.expiresAt;
  assertSchedule(startsAt, expiresAt);
  const changes: Partial<typeof userListFeatured.$inferInsert> = {};
  if (schedule.startsAt !== undefined) changes.startsAt = startsAt;
  if (schedule.expiresAt !== undefined) changes.expiresAt = expiresAt;
  if (schedule.weight !== undefined) changes.weight = schedule.weight;
  if (Object.keys(changes).length === 0) return;
  await db.update(userListFeatured).set(changes).where(eq(userListFeatured.listId, listId));
  await recordEditorialAction(listId, actorId, "feature");
}

/**
 * Quita una destacada: la curada pierde su fila; la generada vence ahora (la plantilla puede volver a
 * crear la del período siguiente; para impedirlo se pausa la plantilla).
 */
export async function unfeatureList(actorId: string, listId: string): Promise<void> {
  await requirePermissionForUser(actorId, "editorial.publish");
  const [row] = await db
    .select({ source: userListFeatured.source })
    .from(userListFeatured)
    .where(eq(userListFeatured.listId, listId));
  if (!row) throw new ApiError("FEATURED_NOT_FOUND", 404, "La colección no está destacada");

  if (row.source === "curated") {
    await db.delete(userListFeatured).where(eq(userListFeatured.listId, listId));
  } else {
    await db
      .update(userListFeatured)
      .set({ expiresAt: sql`greatest(now(), ${userListFeatured.startsAt} + interval '1 millisecond')` })
      .where(and(eq(userListFeatured.listId, listId), isNull(userListFeatured.expiresAt)));
  }
  await recordEditorialAction(listId, actorId, "unfeature");
}

/**
 * Reordena las destacadas vigentes **de un grupo** (selección editorial o automáticas). `listIds` debe ser
 * exactamente el conjunto de filas vigentes o programadas (`orderable`) de ese grupo; el primero queda arriba. El
 * otro grupo no se toca. Atómico: falla con `FEATURED_ORDER_CONFLICT` si
 * el conjunto cambió mientras tanto.
 */
export async function reorderFeatured(actorId: string, group: CollectionGroup, listIds: string[]): Promise<void> {
  await requirePermissionForUser(actorId, "editorial.publish");
  const changed = await db.transaction(async (tx) => {
    const current = await tx
      .select({ listId: userListFeatured.listId, rank: userListFeatured.rank, weight: userListFeatured.weight })
      .from(userListFeatured)
      .where(
        and(
          eq(userListFeatured.source, GROUP_SOURCE[group]),
          or(isNull(userListFeatured.expiresAt), sql`${userListFeatured.expiresAt} > now()`),
        ),
      )
      .for("update");

    const sent = new Set(listIds);
    const currentIds = new Set(current.map((row) => row.listId));
    const sameSet =
      sent.size === listIds.length && sent.size === currentIds.size && [...sent].every((id) => currentIds.has(id));
    if (!sameSet) throw new ApiError("FEATURED_ORDER_CONFLICT", 409, "El conjunto de destacadas cambió");

    const before = new Map(current.map((row) => [row.listId, row]));
    const touched: string[] = [];
    for (const [index, listId] of listIds.entries()) {
      const weight = listIds.length - index;
      const rank = index + 1;
      const previous = before.get(listId)!;
      if (previous.weight === weight && previous.rank === rank) continue;
      await tx.update(userListFeatured).set({ weight, rank }).where(eq(userListFeatured.listId, listId));
      touched.push(listId);
    }
    return touched;
  });
  for (const listId of changed) await recordEditorialAction(listId, actorId, "feature");
}

// --- Plantillas ---------------------------------------------------------------------------------

function requireTemplate(key: string) {
  const template = findTemplate(key);
  if (!template) throw new ApiError("TEMPLATE_NOT_FOUND", 404, "La plantilla no existe");
  return template;
}

/** Estado de cada plantilla para el panel "Generadas automáticamente". */
export async function listTemplatesAdmin(now = new Date()): Promise<TemplateAdminRow[]> {
  const [states, inRail] = await Promise.all([
    db.select().from(exploreCollectionTemplateState),
    railListIds(),
  ]);
  const stateByKey = new Map(states.map((row) => [row.templateKey, row]));

  const rows: TemplateAdminRow[] = [];
  for (const template of COLLECTION_TEMPLATES) {
    const [lastRun] = await db
      .select()
      .from(exploreCollectionSync)
      .where(eq(exploreCollectionSync.templateKey, template.key))
      .orderBy(desc(exploreCollectionSync.startedAt))
      .limit(1);
    const [lastSuccess] = await db
      .select({ finishedAt: exploreCollectionSync.finishedAt, itemCount: exploreCollectionSync.itemCount })
      .from(exploreCollectionSync)
      .where(and(eq(exploreCollectionSync.templateKey, template.key), eq(exploreCollectionSync.status, "succeeded")))
      .orderBy(desc(exploreCollectionSync.finishedAt))
      .limit(1);
    const [current] = await db
      .select({ listId: userList.id, title: userList.title, periodKey: userListFeatured.periodKey })
      .from(userListFeatured)
      .innerJoin(userList, eq(userList.id, userListFeatured.listId))
      .where(
        and(
          eq(userListFeatured.source, "template"),
          eq(userListFeatured.templateKey, template.key),
          or(isNull(userListFeatured.expiresAt), sql`${userListFeatured.expiresAt} > now()`),
        ),
      )
      .orderBy(desc(userListFeatured.startsAt))
      .limit(1);

    const state = stateByKey.get(template.key);
    const lastSuccessAt = lastSuccess?.finishedAt ?? null;
    rows.push({
      key: template.key,
      paused: Boolean(state?.pausedAt),
      pausedAt: state?.pausedAt?.toISOString() ?? null,
      lastRun: lastRun
        ? {
            status: lastRun.status,
            startedAt: lastRun.startedAt.toISOString(),
            finishedAt: lastRun.finishedAt?.toISOString() ?? null,
            itemCount: lastRun.itemCount,
            error: lastRun.error,
          }
        : null,
      lastSuccessAt: lastSuccessAt?.toISOString() ?? null,
      lastItemCount: lastSuccess?.itemCount ?? null,
      nextDueAt: state?.pausedAt ? null : new Date((lastSuccessAt?.getTime() ?? now.getTime()) + REFRESH_MS).toISOString(),
      current: current
        ? { listId: current.listId, title: current.title, periodKey: current.periodKey ?? "", inRail: inRail.has(current.listId) }
        : null,
    });
  }
  return rows;
}

/** Pausa una plantilla: deja de regenerarse y su colección vigente sale del riel. */
export async function pauseTemplate(actorId: string, key: string): Promise<void> {
  await requirePermissionForUser(actorId, "editorial.publish");
  requireTemplate(key);
  const retired = await db.transaction(async (tx) => {
    const now = new Date();
    await tx
      .insert(exploreCollectionTemplateState)
      .values({ templateKey: key, pausedAt: now, pausedBy: actorId, updatedAt: now })
      .onConflictDoUpdate({
        target: exploreCollectionTemplateState.templateKey,
        set: { pausedAt: now, pausedBy: actorId, updatedAt: now },
      });
    return tx
      .update(userListFeatured)
      .set({ expiresAt: sql`greatest(now(), ${userListFeatured.startsAt} + interval '1 millisecond')` })
      .where(
        and(
          eq(userListFeatured.source, "template"),
          eq(userListFeatured.templateKey, key),
          isNull(userListFeatured.expiresAt),
        ),
      )
      .returning({ listId: userListFeatured.listId });
  });
  for (const { listId } of retired) await recordEditorialAction(listId, actorId, "unfeature");
}

/**
 * Reanuda una plantilla y devuelve al riel su colección más reciente (la de `starts_at` mayor), si existe.
 * No se calcula el período con la plantilla: el de Grammy o el de género dependen de los datos.
 */
export async function resumeTemplate(actorId: string, key: string): Promise<void> {
  await requirePermissionForUser(actorId, "editorial.publish");
  requireTemplate(key);
  const revived = await db.transaction(async (tx) => {
    await tx
      .update(exploreCollectionTemplateState)
      .set({ pausedAt: null, pausedBy: null, updatedAt: new Date() })
      .where(eq(exploreCollectionTemplateState.templateKey, key));
    const [latest] = await tx
      .select({ listId: userListFeatured.listId })
      .from(userListFeatured)
      .where(and(eq(userListFeatured.source, "template"), eq(userListFeatured.templateKey, key)))
      .orderBy(desc(userListFeatured.startsAt))
      .limit(1);
    if (!latest) return [];
    return tx
      .update(userListFeatured)
      .set({ expiresAt: null })
      .where(and(eq(userListFeatured.listId, latest.listId), isNotNull(userListFeatured.expiresAt)))
      .returning({ listId: userListFeatured.listId });
  });
  for (const { listId } of revived) await recordEditorialAction(listId, actorId, "feature");
}

/** Fuerza la regeneración de una plantilla en segundo plano (respeta el lock de corridas). */
export async function runTemplateNow(actorId: string, key: string): Promise<void> {
  await requirePermissionForUser(actorId, "editorial.publish");
  const template = requireTemplate(key);
  try {
    after(() => syncTemplate(template).then(() => undefined));
  } catch {
    // Fuera de una request de Next (scripts, tests) `after()` no existe: se lanza sin esperar.
    void syncTemplate(template);
  }
}
