// Mis conciertos (openspec: add-my-concerts, capability `concert-log`, ADR 0056). Cada registro es un recuerdo de la
// persona sobre un artista del catálogo, no un concierto verificado: se guarda lo que escribió y nada más. Mismo patrón
// que la colección física: audiencia por registro (con la audiencia por defecto del usuario al crear) y lectura ajena
// filtrada por la matriz de visibilidad del perfil.

import { and, count, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { artist, concert, concertEntry } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import { isValidConcertDate, type ConcertEntryDto, type ConcertTotals } from "@/lib/api/schemas";
import { resolveNewContentAudience } from "@/services/social/default-audience";
import { audiencesForProfile } from "@/services/social/visibility";
import type { Audience } from "@/services/social/types";
import { linkedConcertSummaries } from "./shared";

export type ConcertEntry = ConcertEntryDto;

/** Datos de un registro nuevo, ya validados por `CreateConcertRequestSchema`. */
export interface NewConcert {
  artistId: string;
  eventDate: string;
  country?: string | null;
  city?: string | null;
  venue?: string | null;
  tour?: string | null;
  setlistfmUrl?: string | null;
  note?: string | null;
  audience?: Audience;
}

/** Cambios de un registro propio; `undefined` = sin cambio, `null` = quitar el dato. */
export type ConcertChanges = Partial<NewConcert>;

export interface ConcertList {
  entries: ConcertEntry[];
  totals: ConcertTotals;
  /** Hay más registros que el tope de lectura (`CONCERT_LIST_MAX`). */
  truncated: boolean;
}

export interface ConcertPreview {
  entries: ConcertEntry[];
  total: number;
}

/** Tope de registros por lectura: una vida de conciertos cabe holgada; evita paginar una lista agrupada por año. */
export const CONCERT_LIST_MAX = 500;
/** Registros del riel del perfil. */
export const CONCERT_PREVIEW_SIZE = 6;

/**
 * Enlace al concierto compartido que se muestra (add-shared-concerts-phase2, ADR 0058): para la dueña, a uno no oculto
 * (también por confirmar: lo ve con sesión); en el perfil, solo a uno confirmado.
 */
function linkedConcertId(owner: boolean): SQL<string | null> {
  const visible = owner ? sql`${concert.status} <> 'hidden'` : sql`${concert.status} = 'confirmed'`;
  return sql<string | null>`(select ${concert.id} from ${concert} where ${concert.id} = ${concertEntry.concertId} and ${visible})`;
}

const baseSelection = {
  id: concertEntry.id,
  artistId: concertEntry.artistId,
  artistName: artist.name,
  artistPhoto: artist.photoUrl,
  eventDate: concertEntry.eventDate,
  country: concertEntry.country,
  city: concertEntry.city,
  venue: concertEntry.venue,
  tour: concertEntry.tour,
  setlistfmUrl: concertEntry.setlistfmUrl,
  note: concertEntry.note,
  audience: concertEntry.audience,
  createdAt: concertEntry.createdAt,
  updatedAt: concertEntry.updatedAt,
} as const;

const ownSelection = { ...baseSelection, concertId: linkedConcertId(true) };
const profileSelection = { ...baseSelection, concertId: linkedConcertId(false) };

type Row = {
  id: string;
  artistId: string;
  artistName: string;
  artistPhoto: string | null;
  eventDate: string;
  country: string | null;
  city: string | null;
  venue: string | null;
  tour: string | null;
  setlistfmUrl: string | null;
  note: string | null;
  audience: string;
  concertId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type LinkedSummaries = Awaited<ReturnType<typeof linkedConcertSummaries>>;

function serialize(row: Row, linked: LinkedSummaries = new Map()): ConcertEntry {
  const shared = row.concertId ? linked.get(row.concertId) : undefined;
  return {
    id: row.id,
    artist: { id: row.artistId, name: row.artistName, photoUrl: row.artistPhoto },
    eventDate: row.eventDate,
    country: row.country,
    city: row.city,
    venue: row.venue,
    tour: row.tour,
    setlistfmUrl: row.setlistfmUrl,
    note: row.note,
    audience: row.audience as Audience,
    concertId: row.concertId,
    concertKind: shared?.kind ?? null,
    concertAttendees: shared?.attendees ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Filas con el tipo y las personas de su concierto compartido, leídos por lote. */
async function serializeAll(rows: Row[]): Promise<ConcertEntry[]> {
  const linked = await linkedConcertSummaries(rows.map((row) => row.concertId).filter((id): id is string => Boolean(id)));
  return rows.map((row) => serialize(row, linked));
}

// Fecha descendente como texto: dentro de un mismo período, la fecha más precisa queda antes que la parcial
// ("2019-11-02" > "2019-11" > "2019"). Desempata el alta más reciente. Lo resuelve idx_concert_entry_user_date.
const ORDER = [desc(concertEntry.eventDate), desc(concertEntry.createdAt), desc(concertEntry.id)];

function notFound(): never {
  throw new ApiError("CONCERT_NOT_FOUND", 404, "El concierto no existe");
}

async function assertArtistExists(artistId: string): Promise<void> {
  const [row] = await db.select({ id: artist.id }).from(artist).where(eq(artist.id, artistId)).limit(1);
  if (!row) throw new ApiError("ARTIST_NOT_FOUND", 404, "El artista indicado no existe");
}

/** Segunda barrera de la fecha (el esquema de la petición ya la validó): el servicio no confía en su llamador. */
function assertDate(eventDate: string): void {
  if (!isValidConcertDate(eventDate)) throw new ApiError("VALIDATION_ERROR", 400, "La fecha no es válida");
}

export async function getOwned(entryId: string, userId: string): Promise<ConcertEntry> {
  const [row] = await db
    .select(ownSelection)
    .from(concertEntry)
    .innerJoin(artist, eq(artist.id, concertEntry.artistId))
    .where(and(eq(concertEntry.id, entryId), eq(concertEntry.userId, userId)))
    .limit(1);
  if (!row) notFound();
  const [entry] = await serializeAll([row]);
  return entry!;
}

/** Registra un concierto. No es un toggle: cada llamada crea un registro, aunque haya otro igual. */
export async function addConcert(userId: string, input: NewConcert): Promise<ConcertEntry> {
  assertDate(input.eventDate);
  await assertArtistExists(input.artistId);
  const [created] = await db
    .insert(concertEntry)
    .values({
      userId,
      artistId: input.artistId,
      eventDate: input.eventDate,
      country: input.country ?? null,
      city: input.city ?? null,
      venue: input.venue ?? null,
      tour: input.tour ?? null,
      setlistfmUrl: input.setlistfmUrl ?? null,
      note: input.note ?? null,
      audience: await resolveNewContentAudience(userId, "concert", input.audience),
    })
    .returning({ id: concertEntry.id });
  if (!created) throw new ApiError("INTERNAL_ERROR", 500, "No se pudo registrar el concierto");
  return getOwned(created.id, userId);
}

/** Edita un registro propio. Un registro ajeno o inexistente responde `CONCERT_NOT_FOUND`, sin revelar si existe. */
export async function updateConcert(entryId: string, userId: string, changes: ConcertChanges): Promise<ConcertEntry> {
  if (changes.eventDate !== undefined) assertDate(changes.eventDate);
  if (changes.artistId !== undefined) await assertArtistExists(changes.artistId);

  const patch: Partial<typeof concertEntry.$inferInsert> = {};
  for (const key of ["artistId", "eventDate", "country", "city", "venue", "tour", "setlistfmUrl", "note", "audience"] as const) {
    const value = changes[key];
    if (value !== undefined) (patch as Record<string, unknown>)[key] = value;
  }
  if (Object.keys(patch).length === 0) return getOwned(entryId, userId);

  const [updated] = await db
    .update(concertEntry)
    .set(patch)
    .where(and(eq(concertEntry.id, entryId), eq(concertEntry.userId, userId)))
    .returning({ id: concertEntry.id });
  if (!updated) notFound();
  return getOwned(updated.id, userId);
}

/** Quita un registro propio. */
export async function removeConcert(entryId: string, userId: string): Promise<void> {
  const [deleted] = await db
    .delete(concertEntry)
    .where(and(eq(concertEntry.id, entryId), eq(concertEntry.userId, userId)))
    .returning({ id: concertEntry.id });
  if (!deleted) notFound();
}

async function readList(conditions: SQL[], owner: boolean): Promise<ConcertList> {
  const where = and(...conditions);
  const [rows, [totals]] = await Promise.all([
    db
      .select(owner ? ownSelection : profileSelection)
      .from(concertEntry)
      .innerJoin(artist, eq(artist.id, concertEntry.artistId))
      .where(where)
      .orderBy(...ORDER)
      .limit(CONCERT_LIST_MAX + 1),
    db
      .select({
        concerts: count(),
        artists: sql<number>`count(distinct ${concertEntry.artistId})`.mapWith(Number),
        // Una ciudad es el par ciudad + país, sin distinguir mayúsculas: "Santiago, CL" y "Santiago, ES" son dos.
        cities: sql<number>`count(distinct lower(${concertEntry.city}) || '|' || coalesce(${concertEntry.country}, ''))`.mapWith(Number),
        countries: sql<number>`count(distinct ${concertEntry.country})`.mapWith(Number),
      })
      .from(concertEntry)
      .where(where),
  ]);
  return {
    entries: await serializeAll(rows.slice(0, CONCERT_LIST_MAX)),
    totals: {
      concerts: Number(totals?.concerts ?? 0),
      artists: totals?.artists ?? 0,
      cities: totals?.cities ?? 0,
      countries: totals?.countries ?? 0,
    },
    truncated: rows.length > CONCERT_LIST_MAX,
  };
}

const EMPTY_LIST: ConcertList = { entries: [], totals: { concerts: 0, artists: 0, cities: 0, countries: 0 }, truncated: false };

/** Conciertos propios, opcionalmente de un artista. Los totales siguen el mismo filtro. */
export async function listOwnConcerts(userId: string, filters: { artistId?: string } = {}): Promise<ConcertList> {
  const conditions: SQL[] = [eq(concertEntry.userId, userId)];
  if (filters.artistId) conditions.push(eq(concertEntry.artistId, filters.artistId));
  return readList(conditions, true);
}

/** Audiencias del perfil visibles para el lector; `null` si no puede ver nada (bloqueo, perfil privado). */
async function visibleScope(username: string, viewerId: string | null): Promise<{ ownerId: string; audiences: Audience[] } | null> {
  const { getProfileByUsername } = await import("@/services/social/profiles");
  const profile = await getProfileByUsername(username, viewerId);
  const audiences = audiencesForProfile(profile);
  return audiences.length === 0 ? null : { ownerId: profile.id, audiences };
}

/** Conciertos de un perfil visibles para el lector (misma matriz que la colección física). */
export async function listProfileConcerts(username: string, viewerId: string | null): Promise<ConcertList> {
  const scope = await visibleScope(username, viewerId);
  if (!scope) return EMPTY_LIST;
  return readList([eq(concertEntry.userId, scope.ownerId), inArray(concertEntry.audience, scope.audiences)], false);
}

/** Riel del perfil: los últimos registros visibles y el total visible. */
export async function getConcertPreview(username: string, viewerId: string | null): Promise<ConcertPreview> {
  const scope = await visibleScope(username, viewerId);
  if (!scope) return { entries: [], total: 0 };
  const where = and(eq(concertEntry.userId, scope.ownerId), inArray(concertEntry.audience, scope.audiences));
  const [rows, [total]] = await Promise.all([
    db
      .select(profileSelection)
      .from(concertEntry)
      .innerJoin(artist, eq(artist.id, concertEntry.artistId))
      .where(where)
      .orderBy(...ORDER)
      .limit(CONCERT_PREVIEW_SIZE),
    db.select({ n: count() }).from(concertEntry).where(where),
  ]);
  return { entries: await serializeAll(rows), total: Number(total?.n ?? 0) };
}

/** Cuántas veces el usuario registró haber visto al artista (fila En vivo del panel), con cualquier audiencia. */
export async function countOwnConcertsForArtist(userId: string, artistId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(concertEntry)
    .where(and(eq(concertEntry.userId, userId), eq(concertEntry.artistId, artistId)));
  return Number(row?.n ?? 0);
}

/** Nombre de un artista para el filtro `?artista=` de Mis conciertos; `null` si no existe. */
export async function concertArtistName(artistId: string): Promise<string | null> {
  const [row] = await db.select({ name: artist.name }).from(artist).where(eq(artist.id, artistId)).limit(1);
  return row?.name ?? null;
}
