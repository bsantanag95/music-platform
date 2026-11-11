// Conciertos compartidos: lectura, "Estuve ahí" y personas que estuvieron (openspec: add-shared-concerts-phase1,
// capability `shared-concerts`, ADR 0057). El concierto es el hecho; el registro personal (`concert_entry`) es el
// recuerdo, enlazado de forma opcional (ADR 0056). Las lecturas públicas solo ven conciertos confirmados y no cancelados.

import { and, asc, count, countDistinct, desc, eq, gt, inArray, isNull, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { appUser, concert, concertEntry, concertPerformer } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import { isValidConcertDate } from "@/lib/api/schemas";
import { COMMUNITY_MIN_COUNT, type ThresholdedCount } from "@/services/catalog/album-community-shared";
import { resolveNewContentAudience } from "@/services/social/default-audience";
import { relationsFor } from "@/services/social/relations";
import { audiencesForProfile } from "@/services/social/visibility";
import type { Audience, FollowRelation, ProfileVisibility } from "@/services/social/types";
import type { ConcertKind, PerformerRole } from "@/services/musicbrainz/event-mappers";

/** Conciertos pasados por página en la pestaña del artista. */
export const ARTIST_CONCERTS_PAGE_SIZE = 50;
/** Tope de próximos en la pestaña (una gira anunciada). */
export const UPCOMING_CONCERTS_MAX = 50;
/** Personas que se listan en la página del concierto. */
export const CONCERT_ATTENDEES_MAX = 50;

export interface SharedConcertSummary {
  id: string;
  name: string;
  kind: ConcertKind;
  eventDate: string; // 'YYYY-MM-DD'
  venue: string | null;
  city: string | null;
  country: string | null;
  /** `null` si nadie estuvo; con umbral de anonimato (menos de 5 no da la cifra exacta). */
  attendees: ThresholdedCount | null;
  /** Si quien mira estuvo; `null` sin sesión. */
  attending: boolean | null;
  upcoming: boolean;
}

export interface ArtistConcertsPage {
  upcoming: SharedConcertSummary[];
  past: SharedConcertSummary[];
  page: number;
  hasNext: boolean;
}

export interface ConcertPerformerView {
  name: string;
  artistId: string | null;
  role: PerformerRole;
}

export interface ConcertAttendee {
  username: string;
  displayName: string | null;
}

export interface SharedConcertDetail extends SharedConcertSummary {
  performers: ConcertPerformerView[];
  /** Personas que quien mira puede ver, hasta `CONCERT_ATTENDEES_MAX`. */
  visibleAttendees: ConcertAttendee[];
  /** Personas visibles que no entraron en la lista. */
  moreAttendees: number;
}

/** Concierto que las superficies públicas pueden mostrar. */
const PUBLIC_CONCERT: SQL = and(eq(concert.status, "confirmed"), eq(concert.cancelled, false))!;

const summarySelection = {
  id: concert.id,
  name: concert.name,
  kind: concert.kind,
  eventDate: concert.eventDate,
  venue: concert.venue,
  city: concert.city,
  country: concert.country,
} as const;

type SummaryRow = { id: string; name: string; kind: string; eventDate: string; venue: string | null; city: string | null; country: string | null };

function thresholded(value: number): ThresholdedCount | null {
  if (value === 0) return null;
  return value >= COMMUNITY_MIN_COUNT ? { kind: "exact", value } : { kind: "fewer", threshold: COMMUNITY_MIN_COUNT };
}

/** Hoy (UTC) como `YYYY-MM-DD`: un concierto de hoy ya cuenta como pasado. */
function todayIso(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/** Personas distintas por concierto, de cuentas activas y con cualquier audiencia (la cifra no identifica a nadie). */
async function attendeeCounts(concertIds: string[]): Promise<Map<string, number>> {
  if (concertIds.length === 0) return new Map();
  const rows = await db
    .select({ concertId: concertEntry.concertId, n: countDistinct(concertEntry.userId) })
    .from(concertEntry)
    .innerJoin(appUser, eq(appUser.id, concertEntry.userId))
    .where(and(inArray(concertEntry.concertId, concertIds), isNull(appUser.deactivatedAt)))
    .groupBy(concertEntry.concertId);
  return new Map(rows.map((row) => [row.concertId!, Number(row.n)]));
}

async function attendingSet(viewerId: string | null, concertIds: string[]): Promise<Set<string> | null> {
  if (!viewerId) return null;
  if (concertIds.length === 0) return new Set();
  const rows = await db
    .select({ concertId: concertEntry.concertId })
    .from(concertEntry)
    .where(and(eq(concertEntry.userId, viewerId), inArray(concertEntry.concertId, concertIds)));
  return new Set(rows.map((row) => row.concertId!));
}

async function summarize(rows: SummaryRow[], viewerId: string | null, now: Date): Promise<SharedConcertSummary[]> {
  const ids = rows.map((row) => row.id);
  const [counts, attending] = await Promise.all([attendeeCounts(ids), attendingSet(viewerId, ids)]);
  const today = todayIso(now);
  return rows.map((row) => ({
    ...row,
    kind: row.kind as ConcertKind,
    attendees: thresholded(counts.get(row.id) ?? 0),
    attending: attending ? attending.has(row.id) : null,
    upcoming: row.eventDate > today,
  }));
}

/** Conciertos donde toca el artista (por su fila del catálogo o por su `mbid`). */
function performedBy(artistRef: { id: string; mbid: string | null }): SQL {
  const match = artistRef.mbid
    ? or(eq(concertPerformer.artistId, artistRef.id), eq(concertPerformer.artistMbid, artistRef.mbid))
    : eq(concertPerformer.artistId, artistRef.id);
  // Correlación con el literal "concert"."id" (gotcha de SQL crudo del proyecto: no depender del render de la columna).
  return sql`exists (select 1 from ${concertPerformer} where ${concertPerformer.concertId} = "concert"."id" and ${match})`;
}

/** Pestaña Conciertos: próximos (todos, hasta el tope) y pasados por fecha descendente, paginados. */
export async function listArtistConcerts(
  artistRef: { id: string; mbid: string | null },
  viewerId: string | null,
  page = 1,
  now: Date = new Date(),
): Promise<ArtistConcertsPage> {
  const today = todayIso(now);
  const scope = and(PUBLIC_CONCERT, performedBy(artistRef));
  const [upcomingRows, pastRows] = await Promise.all([
    page === 1
      ? db
          .select(summarySelection)
          .from(concert)
          .where(and(scope, gt(concert.eventDate, today)))
          .orderBy(asc(concert.eventDate), asc(concert.id))
          .limit(UPCOMING_CONCERTS_MAX)
      : Promise.resolve([]),
    db
      .select(summarySelection)
      .from(concert)
      .where(and(scope, lte(concert.eventDate, today)))
      .orderBy(desc(concert.eventDate), desc(concert.id))
      .limit(ARTIST_CONCERTS_PAGE_SIZE + 1)
      .offset((page - 1) * ARTIST_CONCERTS_PAGE_SIZE),
  ]);
  const [upcoming, past] = await Promise.all([
    summarize(upcomingRows, viewerId, now),
    summarize(pastRows.slice(0, ARTIST_CONCERTS_PAGE_SIZE), viewerId, now),
  ]);
  return { upcoming, past, page, hasNext: pastRows.length > ARTIST_CONCERTS_PAGE_SIZE };
}

/** Personas que quien mira puede ver: audiencia del registro y matriz de visibilidad del perfil (bloqueo incluido). */
async function visibleAttendees(concertId: string, viewerId: string | null): Promise<{ list: ConcertAttendee[]; more: number }> {
  const rows = await db
    .select({
      userId: concertEntry.userId,
      audience: concertEntry.audience,
      username: appUser.username,
      displayName: appUser.displayName,
      profileVisibility: appUser.profileVisibility,
    })
    .from(concertEntry)
    .innerJoin(appUser, eq(appUser.id, concertEntry.userId))
    .where(and(eq(concertEntry.concertId, concertId), isNull(appUser.deactivatedAt)))
    .orderBy(asc(concertEntry.createdAt));
  const relations = await relationsFor(viewerId, rows.map((row) => row.userId));
  const visible = rows.filter((row) => {
    const relation: FollowRelation = row.userId === viewerId ? "self" : (relations.get(row.userId) ?? "none");
    const audiences = audiencesForProfile({
      profileVisibility: row.profileVisibility as ProfileVisibility,
      relation,
      blockedByMe: false,
    });
    return audiences.includes(row.audience as Audience);
  });
  return {
    list: visible.slice(0, CONCERT_ATTENDEES_MAX).map(({ username, displayName }) => ({ username, displayName })),
    more: Math.max(0, visible.length - CONCERT_ATTENDEES_MAX),
  };
}

/** Página del concierto; `null` si no existe, no está confirmado o fue cancelado. */
export async function getSharedConcert(
  concertId: string,
  viewerId: string | null,
  now: Date = new Date(),
): Promise<SharedConcertDetail | null> {
  const [row] = await db.select(summarySelection).from(concert).where(and(eq(concert.id, concertId), PUBLIC_CONCERT)).limit(1);
  if (!row) return null;
  const [[summary], performers, attendees] = await Promise.all([
    summarize([row], viewerId, now),
    db
      .select({ name: concertPerformer.artistName, artistId: concertPerformer.artistId, role: concertPerformer.role })
      .from(concertPerformer)
      .where(eq(concertPerformer.concertId, concertId))
      .orderBy(asc(concertPerformer.position)),
    visibleAttendees(concertId, viewerId),
  ]);
  return {
    ...summary!,
    performers: performers.map((p) => ({ ...p, role: p.role as PerformerRole })),
    visibleAttendees: attendees.list,
    moreAttendees: attendees.more,
  };
}

/** Error de unicidad de Postgres (dos pedidos simultáneos de "Estuve ahí"). */
function isUniqueViolation(error: unknown): boolean {
  const code = (error as { code?: string; cause?: { code?: string } }).code ?? (error as { cause?: { code?: string } }).cause?.code;
  return code === "23505";
}

async function linkedEntryId(userId: string, concertId: string): Promise<string | null> {
  const [row] = await db
    .select({ id: concertEntry.id })
    .from(concertEntry)
    .where(and(eq(concertEntry.userId, userId), eq(concertEntry.concertId, concertId)))
    .limit(1);
  return row?.id ?? null;
}

/**
 * "Estuve ahí": enlaza a la persona con un concierto confirmado, no cancelado y pasado. Idempotente. Si la persona ya
 * registró a mano el mismo artista en la misma fecha exacta, enlaza ese registro; si no, crea uno con los datos del
 * concierto como valores iniciales (después son suyos). Devuelve el id del registro personal.
 */
export async function attendConcert(
  userId: string,
  concertId: string,
  contextArtistId: string | null = null,
): Promise<{ entryId: string }> {
  const [target] = await db
    .select({ ...summarySelection })
    .from(concert)
    .where(and(eq(concert.id, concertId), PUBLIC_CONCERT))
    .limit(1);
  if (!target) throw new ApiError("SHARED_CONCERT_NOT_FOUND", 404, "El concierto no existe");
  if (!isValidConcertDate(target.eventDate)) {
    throw new ApiError("VALIDATION_ERROR", 400, "Todavía no se puede decir que estuviste en este concierto");
  }

  const existing = await linkedEntryId(userId, concertId);
  if (existing) return { entryId: existing };

  const performers = await db
    .select({ artistId: concertPerformer.artistId, role: concertPerformer.role })
    .from(concertPerformer)
    .where(eq(concertPerformer.concertId, concertId))
    .orderBy(asc(concertPerformer.position));
  const inCatalog = performers.filter((p): p is { artistId: string; role: string } => p.artistId !== null);
  const artistId =
    (contextArtistId && inCatalog.find((p) => p.artistId === contextArtistId)?.artistId) ??
    inCatalog.find((p) => p.role === "main")?.artistId ??
    inCatalog[0]?.artistId;
  if (!artistId) throw new ApiError("VALIDATION_ERROR", 400, "Ningún artista del concierto está en el catálogo");

  try {
    // Un registro propio sin enlazar del mismo artista y la misma fecha exacta: se enlaza en vez de duplicarlo.
    const [candidate] = await db
      .select({ id: concertEntry.id })
      .from(concertEntry)
      .where(
        and(
          eq(concertEntry.userId, userId),
          eq(concertEntry.artistId, artistId),
          eq(concertEntry.eventDate, target.eventDate),
          isNull(concertEntry.concertId),
        ),
      )
      .orderBy(asc(concertEntry.createdAt))
      .limit(1);
    if (candidate) {
      const [manual] = await db
        .update(concertEntry)
        .set({ concertId })
        .where(and(eq(concertEntry.id, candidate.id), isNull(concertEntry.concertId)))
        .returning({ id: concertEntry.id });
      if (manual) return { entryId: manual.id };
    }

    const [created] = await db
      .insert(concertEntry)
      .values({
        userId,
        artistId,
        eventDate: target.eventDate,
        venue: target.venue ? target.venue.slice(0, 100) : null,
        city: target.city ? target.city.slice(0, 100) : null,
        country: target.country,
        audience: await resolveNewContentAudience(userId, "concert"),
        concertId,
        fromConcert: true,
      })
      .returning({ id: concertEntry.id });
    return { entryId: created!.id };
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const raced = await linkedEntryId(userId, concertId);
    if (!raced) throw error;
    return { entryId: raced };
  }
}

/**
 * Quita "Estuve ahí". Si el registro lo creó la acción y nunca se editó, se borra; si no, solo se desenlaza (lo escrito
 * es de la persona). Idempotente.
 */
export async function unattendConcert(userId: string, concertId: string): Promise<{ removed: "deleted" | "unlinked" | "none" }> {
  const deleted = await db
    .delete(concertEntry)
    .where(
      and(
        eq(concertEntry.userId, userId),
        eq(concertEntry.concertId, concertId),
        eq(concertEntry.fromConcert, true),
        sql`${concertEntry.updatedAt} = ${concertEntry.createdAt}`,
      ),
    )
    .returning({ id: concertEntry.id });
  if (deleted.length > 0) return { removed: "deleted" };
  const unlinked = await db
    .update(concertEntry)
    .set({ concertId: null })
    .where(and(eq(concertEntry.userId, userId), eq(concertEntry.concertId, concertId)))
    .returning({ id: concertEntry.id });
  return { removed: unlinked.length > 0 ? "unlinked" : "none" };
}

/** Cuántos conciertos compartidos visibles tiene un artista (para tests y el estado vacío). */
export async function countArtistConcerts(artistRef: { id: string; mbid: string | null }): Promise<number> {
  const [row] = await db.select({ n: count() }).from(concert).where(and(PUBLIC_CONCERT, performedBy(artistRef)));
  return Number(row?.n ?? 0);
}
