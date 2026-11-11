// Conciertos de la comunidad (openspec: add-shared-concerts-phase2, capability `community-concerts`, ADR 0058): crear un
// concierto compartido que MusicBrainz no tiene, sin abrirle la puerta a datos falsos. Requisitos de cuenta y un límite
// diario, plausibilidad contra la actividad del artista, duplicado exacto con un `advisory lock`, candidatos antes de
// crear, reportes y moderación (ocultar, restaurar, fusionar). La confirmación vive en `confirmation.ts`.

import { and, asc, count, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { appUser, artist, concert, concertEntry, concertPerformer, contentReport, moderationAction } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import type { ConcertCandidate, ConcertReportReason, CreateSharedConcertRequestSchema } from "@/lib/api/schemas";
import { isValidConcertDate } from "@/lib/api/schemas";
import { requirePermissionForUser, requireSocialActivityAllowed } from "@/services/auth/authorization";
import { accountCountsSql, evaluateConfirmation } from "./confirmation";
import { mergeConcertInto } from "./merge";
import { linkOrCreateEntry, performedBy, SIGNED_IN_CONCERT } from "./shared";
import type { z } from "zod";

/** Conciertos que una persona puede crear en 24 horas. */
export const CONCERT_CREATE_LIMIT_PER_DAY = 5;
/** Días a cada lado de la fecha para los candidatos (diferencias de zona horaria, fechas mal recordadas). */
export const CONCERT_CANDIDATE_WINDOW_DAYS = 1;
/** Candidatos que se muestran antes de crear. */
export const CONCERT_CANDIDATES_MAX = 10;

export type CreateSharedConcertInput = z.output<typeof CreateSharedConcertRequestSchema>;

/** `409 CONCERT_DUPLICATE` con el id del concierto existente (la ruta lo agrega a la respuesta). */
export class ConcertDuplicateError extends ApiError {
  constructor(readonly concertId: string) {
    super("CONCERT_DUPLICATE", 409, "Ya existe ese concierto");
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Requisitos para crear: activa, email verificado, 7 días, sin suspensión social; y el límite de 24 horas. */
export async function assertCanCreateConcert(userId: string, now: Date = new Date()): Promise<void> {
  await requireSocialActivityAllowed(userId);
  const [allowed] = await db
    .select({ id: appUser.id })
    .from(appUser)
    .where(and(eq(appUser.id, userId), accountCountsSql(now)))
    .limit(1);
  if (!allowed) {
    throw new ApiError(
      "CONCERT_CREATE_NOT_ALLOWED",
      403,
      "Para registrar conciertos hace falta una cuenta de al menos 7 días con el email verificado",
    );
  }
  const since = new Date(now.getTime() - DAY_MS).toISOString();
  const [created] = await db
    .select({ n: count() })
    .from(concert)
    .where(and(eq(concert.createdBy, userId), sql`${concert.createdAt} > ${since}::timestamptz`));
  if (Number(created?.n ?? 0) >= CONCERT_CREATE_LIMIT_PER_DAY) {
    throw new ApiError("CONCERT_CREATE_LIMIT", 429, "Llegaste al límite de conciertos registrados por hoy");
  }
}

interface LineupArtist {
  id: string;
  mbid: string;
  name: string;
  role: "main" | "support";
  lifeBegin: string | null;
  lifeEnd: string | null;
  lifeEnded: boolean | null;
}

/** El cartel: principal primero, después los demás en su orden, sin repetir artista. Todos del catálogo y con mbid. */
async function loadLineup(input: CreateSharedConcertInput): Promise<LineupArtist[]> {
  const requested: { artistId: string; role: "main" | "support" }[] = [{ artistId: input.artistId, role: "main" }];
  for (const performer of input.performers) {
    if (!requested.some((r) => r.artistId === performer.artistId)) requested.push(performer);
  }
  const rows = await db
    .select({
      id: artist.id,
      mbid: artist.mbid,
      name: artist.name,
      lifeBegin: artist.lifeBegin,
      lifeEnd: artist.lifeEnd,
      lifeEnded: artist.lifeEnded,
    })
    .from(artist)
    .where(inArray(artist.id, requested.map((r) => r.artistId)));
  const byId = new Map(rows.map((row) => [row.id, row]));
  return requested.map(({ artistId, role }) => {
    const row = byId.get(artistId);
    if (!row) throw new ApiError("ARTIST_NOT_FOUND", 404, "El artista indicado no existe");
    if (!row.mbid) throw new ApiError("VALIDATION_ERROR", 400, "El artista no se puede usar en un concierto compartido");
    return { ...row, mbid: row.mbid, role };
  });
}

/**
 * Plausibilidad: para cada artista principal con datos de actividad, el año del concierto no es anterior a su formación
 * o nacimiento ni, si terminó, posterior a su separación o muerte. Sin datos de actividad no se restringe.
 */
export function implausibleFor(year: number, lineup: Pick<LineupArtist, "role" | "lifeBegin" | "lifeEnd" | "lifeEnded">[]): boolean {
  return lineup.some((performer) => {
    if (performer.role !== "main") return false;
    const begin = performer.lifeBegin ? Number(performer.lifeBegin.slice(0, 4)) : null;
    const end = performer.lifeEnded && performer.lifeEnd ? Number(performer.lifeEnd.slice(0, 4)) : null;
    return (begin !== null && year < begin) || (end !== null && year > end);
  });
}

/** Nombre por defecto: "<artista principal> en <recinto>". */
export function defaultConcertName(mainArtist: string, venue: string): string {
  return `${mainArtist} en ${venue}`.slice(0, 300);
}

/**
 * Crea un concierto de la comunidad por confirmar, con quien lo crea como creadora y primera asistente (con la regla de
 * "Estuve ahí", o enlazando el recuerdo de "Compartir este concierto"). Reevalúa la confirmación (un setlist que lo
 * prueba lo confirma al nacer). Un duplicado exacto (mismo artista principal, fecha y ciudad normalizada) lanza
 * `ConcertDuplicateError`, también con pedidos simultáneos.
 */
export async function createCommunityConcert(
  userId: string,
  input: CreateSharedConcertInput,
  now: Date = new Date(),
): Promise<{ concert: { id: string; name: string; status: "confirmed" | "pending" }; entryId: string }> {
  if (input.eventDate.length !== 10 || !isValidConcertDate(input.eventDate, now)) {
    throw new ApiError("VALIDATION_ERROR", 400, "La fecha no es válida");
  }
  await assertCanCreateConcert(userId, now);
  const lineup = await loadLineup(input);
  if (implausibleFor(Number(input.eventDate.slice(0, 4)), lineup)) {
    throw new ApiError("CONCERT_IMPLAUSIBLE", 400, "La fecha no coincide con la actividad del artista");
  }
  const main = lineup[0]!;

  if (input.fromEntryId) {
    const [entry] = await db
      .select({ artistId: concertEntry.artistId, eventDate: concertEntry.eventDate, concertId: concertEntry.concertId })
      .from(concertEntry)
      .where(and(eq(concertEntry.id, input.fromEntryId), eq(concertEntry.userId, userId)))
      .limit(1);
    if (!entry || entry.concertId) throw new ApiError("CONCERT_NOT_FOUND", 404, "El concierto no existe");
    if (entry.eventDate !== input.eventDate || !lineup.some((p) => p.id === entry.artistId)) {
      throw new ApiError("VALIDATION_ERROR", 400, "El recuerdo no coincide con el concierto");
    }
  }

  const name = input.name ?? defaultConcertName(main.name, input.venue);
  return db.transaction(async (tx) => {
    // Un pedido a la vez por artista principal y fecha: el segundo ve el concierto del primero.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`concert:${main.mbid}:${input.eventDate}`}))`);
    const [duplicate] = await tx
      .select({ id: concert.id })
      .from(concert)
      .innerJoin(concertPerformer, eq(concertPerformer.concertId, concert.id))
      .where(
        and(
          sql`${concert.status} <> 'hidden'`,
          eq(concert.eventDate, input.eventDate),
          sql`${concert.cityKey} = search_key(${input.city})`,
          eq(concertPerformer.role, "main"),
          eq(concertPerformer.artistMbid, main.mbid),
        ),
      )
      .limit(1);
    if (duplicate) throw new ConcertDuplicateError(duplicate.id);

    const [created] = await tx
      .insert(concert)
      .values({
        name,
        kind: "concert",
        eventDate: input.eventDate,
        venue: input.venue,
        city: input.city,
        country: input.country,
        source: "community",
        status: "pending",
        createdBy: userId,
        setlistfmUrl: input.setlistfmUrl ?? null,
      })
      .returning({ id: concert.id, eventDate: concert.eventDate, venue: concert.venue, city: concert.city, country: concert.country });
    if (!created) throw new ApiError("INTERNAL_ERROR", 500, "No se pudo crear el concierto");
    await tx.insert(concertPerformer).values(
      lineup.map((performer, position) => ({
        concertId: created.id,
        artistMbid: performer.mbid,
        artistName: performer.name,
        artistId: performer.id,
        role: performer.role,
        position,
      })),
    );

    let entryId: string;
    if (input.fromEntryId) {
      const [linked] = await tx
        .update(concertEntry)
        .set({ concertId: created.id })
        .where(and(eq(concertEntry.id, input.fromEntryId), eq(concertEntry.userId, userId), isNull(concertEntry.concertId)))
        .returning({ id: concertEntry.id });
      if (!linked) throw new ApiError("CONCERT_NOT_FOUND", 404, "El concierto no existe");
      entryId = linked.id;
    } else {
      entryId = await linkOrCreateEntry(tx, userId, created, main.id);
    }
    const status = await evaluateConfirmation(tx, created.id, now);
    return { concert: { id: created.id, name, status: status === "confirmed" ? "confirmed" : "pending" }, entryId };
  });
}

function shiftDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  return new Date(date.getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

/**
 * Candidatos antes de crear: conciertos confirmados o por confirmar del artista a ±1 día, primero los de la misma
 * ciudad (normalizada), después por cercanía de fecha.
 */
export async function listConcertCandidates(
  viewerId: string,
  artistRef: { id: string; mbid: string | null },
  date: string,
  city: string | null,
): Promise<ConcertCandidate[]> {
  const sameCity = city?.trim() ? sql<boolean>`coalesce(${concert.cityKey} = search_key(${city.trim()}), false)` : sql<boolean>`false`;
  const rows = await db
    .select({
      id: concert.id,
      name: concert.name,
      eventDate: concert.eventDate,
      venue: concert.venue,
      city: concert.city,
      country: concert.country,
      status: concert.status,
      sameCity,
    })
    .from(concert)
    .where(
      and(
        SIGNED_IN_CONCERT,
        performedBy(artistRef),
        gte(concert.eventDate, shiftDays(date, -CONCERT_CANDIDATE_WINDOW_DAYS)),
        lte(concert.eventDate, shiftDays(date, CONCERT_CANDIDATE_WINDOW_DAYS)),
      ),
    )
    .orderBy(sql`${sameCity} desc`, sql`abs(${concert.eventDate} - ${date}::date)`, asc(concert.id))
    .limit(CONCERT_CANDIDATES_MAX);
  const ids = rows.map((row) => row.id);
  const mine = ids.length
    ? await db
        .select({ concertId: concertEntry.concertId })
        .from(concertEntry)
        .where(and(eq(concertEntry.userId, viewerId), inArray(concertEntry.concertId, ids)))
    : [];
  const attending = new Set(mine.map((row) => row.concertId));
  return rows.map((row) => ({
    ...row,
    status: row.status as "confirmed" | "pending",
    sameCity: Boolean(row.sameCity),
    attending: attending.has(row.id),
  }));
}

/** Reporta un concierto que quien reporta puede ver. Un reporte abierto por persona y concierto. */
export async function reportConcert(
  reporterId: string,
  concertId: string,
  reason: ConcertReportReason,
  details: string | null,
): Promise<{ id: string } | null> {
  const [target] = await db.select({ id: concert.id }).from(concert).where(and(eq(concert.id, concertId), SIGNED_IN_CONCERT)).limit(1);
  if (!target) throw new ApiError("SHARED_CONCERT_NOT_FOUND", 404, "El concierto no existe");
  const [report] = await db
    .insert(contentReport)
    .values({ reporterId, concertId, reasonCode: reason, reason: details?.trim() || reason })
    .onConflictDoNothing()
    .returning({ id: contentReport.id });
  return report ?? null;
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function normalizedReason(reason: string): string {
  const value = reason.trim();
  if (!value) throw new ApiError("VALIDATION_ERROR", 400, "El motivo es obligatorio");
  return value.slice(0, 1000);
}

/** Resuelve los reportes abiertos de un concierto (la acción de moderación ya quedó auditada). */
async function resolveOpenReports(tx: Tx, actorId: string, concertId: string, now: Date): Promise<void> {
  await tx
    .update(contentReport)
    .set({ status: "resolved", resolvedBy: actorId, resolvedAt: now })
    .where(and(eq(contentReport.concertId, concertId), eq(contentReport.status, "pending")));
}

/** Oculta un concierto (moderación). Los recuerdos enlazados quedan como están. */
export async function hideConcert(actorId: string, concertId: string, reason: string, now: Date = new Date()): Promise<void> {
  await requirePermissionForUser(actorId, "moderation.review_content");
  const normalized = normalizedReason(reason);
  await db.transaction(async (tx) => {
    const [target] = await tx
      .update(concert)
      .set({ status: "hidden" })
      .where(eq(concert.id, concertId))
      .returning({ id: concert.id });
    if (!target) throw new ApiError("SHARED_CONCERT_NOT_FOUND", 404, "El concierto no existe");
    await tx.insert(moderationAction).values({ actorId, action: "hide", concertId, reason: normalized });
    await resolveOpenReports(tx, actorId, concertId, now);
  });
}

/**
 * Restaura un concierto oculto: vuelve a confirmado si es de MusicBrainz o alguna vez se confirmó; si no, a por
 * confirmar (y se reevalúa). Uno fusionado no se restaura: su contenido ya está en el destino.
 */
export async function restoreConcert(actorId: string, concertId: string, reason: string, now: Date = new Date()): Promise<void> {
  await requirePermissionForUser(actorId, "moderation.review_content");
  const normalized = normalizedReason(reason);
  await db.transaction(async (tx) => {
    const [target] = await tx
      .select({ source: concert.source, confirmedAt: concert.confirmedAt, mergedIntoId: concert.mergedIntoId })
      .from(concert)
      .where(eq(concert.id, concertId))
      .limit(1);
    if (!target) throw new ApiError("SHARED_CONCERT_NOT_FOUND", 404, "El concierto no existe");
    if (target.mergedIntoId) throw new ApiError("CONCERT_MERGE_INVALID", 400, "Un concierto fusionado no se restaura");
    const confirmed = target.source === "musicbrainz" || target.confirmedAt !== null;
    await tx.update(concert).set({ status: confirmed ? "confirmed" : "pending" }).where(eq(concert.id, concertId));
    if (!confirmed) await evaluateConfirmation(tx, concertId, now);
    await tx.insert(moderationAction).values({ actorId, action: "restore", concertId, reason: normalized });
    await resolveOpenReports(tx, actorId, concertId, now);
  });
}

/**
 * Fusiona un concierto duplicado en otro (moderación): el destino no puede ser el mismo, estar oculto ni ser uno ya
 * fusionado. Auditado con la acción `merge` y resuelve los reportes abiertos del origen.
 */
export async function mergeConcert(
  actorId: string,
  sourceId: string,
  targetId: string,
  reason: string,
  now: Date = new Date(),
): Promise<{ moved: number; unlinked: number }> {
  await requirePermissionForUser(actorId, "moderation.review_content");
  const normalized = normalizedReason(reason);
  if (sourceId === targetId) throw new ApiError("CONCERT_MERGE_INVALID", 400, "No se puede fusionar un concierto consigo mismo");
  return db.transaction(async (tx) => {
    const rows = await tx
      .select({ id: concert.id, status: concert.status, mergedIntoId: concert.mergedIntoId })
      .from(concert)
      .where(inArray(concert.id, [sourceId, targetId]))
      .for("update");
    const source = rows.find((row) => row.id === sourceId);
    const target = rows.find((row) => row.id === targetId);
    if (!source || !target) throw new ApiError("SHARED_CONCERT_NOT_FOUND", 404, "El concierto no existe");
    if (source.mergedIntoId || target.status === "hidden") {
      throw new ApiError("CONCERT_MERGE_INVALID", 400, "Ese concierto no se puede fusionar");
    }
    const result = await mergeConcertInto(tx, sourceId, targetId, now);
    await tx.insert(moderationAction).values({
      actorId,
      action: "merge",
      concertId: sourceId,
      reason: `${normalized} → ${targetId}`.slice(0, 1000),
    });
    await resolveOpenReports(tx, actorId, sourceId, now);
    return result;
  });
}
