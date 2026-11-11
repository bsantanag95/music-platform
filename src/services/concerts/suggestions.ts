// Sugerencias de enlace de Mis conciertos (openspec: add-shared-concerts-phase3, capability `concert-log`, ADR 0059):
// para cada recuerdo sin enlazar, los conciertos compartidos que probablemente son ese recuerdo; enlazar, descartar
// ("No es este") y desvincular. Usa solo los recuerdos de la propia persona y conciertos que ya puede ver con sesión: no
// revela nada ajeno. Enlazar nunca modifica lo escrito (ADR 0056) y cuenta como asistencia (puede confirmar uno por
// confirmar, ADR 0058).

import { and, eq, isNull, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { concert, concertEntry, concertLinkDismissal } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import { evaluateConfirmation } from "./confirmation";
import { getOwned, type ConcertEntry } from "./concerts";
import { isUniqueViolation } from "./shared";

/** Sugerencias por recuerdo (las de fecha más cercana). */
export const SUGGESTIONS_PER_ENTRY = 3;
/** Sugerencias que muestra el bloque de Mis conciertos. */
export const SUGGESTIONS_SHOWN = 20;

export interface ConcertLinkSuggestion {
  entry: { id: string; artistName: string; eventDate: string; city: string | null; country: string | null };
  concert: {
    id: string;
    name: string;
    eventDate: string;
    venue: string | null;
    city: string | null;
    country: string | null;
    status: "confirmed" | "pending";
  };
}

export interface ConcertLinkSuggestions {
  suggestions: ConcertLinkSuggestion[];
  /** Total de sugerencias (con el tope por recuerdo); puede ser mayor que las mostradas. */
  total: number;
}

/** Hoy (UTC+14, como la validación de fechas): un concierto de hoy ya puede ser un recuerdo. */
function latestTodayIso(now: Date): string {
  return new Date(now.getTime() + 14 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/**
 * Pares (recuerdo, concierto) compatibles (D1): recuerdo sin enlazar de la persona; concierto visible con sesión y
 * pasado; el artista del recuerdo en el cartel (por fila o por mbid); fecha compatible (día exacto ±1, mismo mes o mismo
 * año); misma ciudad normalizada si el recuerdo tiene ciudad (obligatoria con fecha parcial); mismo país si los dos lo
 * tienen; sin otro recuerdo de la persona en ese concierto. `pair` acota a un recuerdo y un concierto; `withDismissed`
 * incluye los descartados (la validación de "Enlazar").
 */
function candidatePairs(userId: string, now: Date, options: { pair?: { entryId: string; concertId: string }; withDismissed?: boolean }): SQL {
  const today = latestTodayIso(now);
  const pairFilter = options.pair
    ? sql`AND e.id = ${options.pair.entryId}::uuid AND c.id = ${options.pair.concertId}::uuid`
    : sql``;
  const dismissedFilter = options.withDismissed
    ? sql``
    : sql`AND NOT EXISTS (SELECT 1 FROM concert_link_dismissal d WHERE d.entry_id = e.id AND d.concert_id = c.id)`;
  return sql`
    SELECT DISTINCT
      e.id AS entry_id, e.event_date AS entry_date, e.city AS entry_city, e.country AS entry_country,
      e.created_at AS entry_created_at, a.name AS artist_name,
      c.id AS concert_id, c.name AS concert_name, c.event_date::text AS concert_date, c.venue, c.city, c.country,
      c.status,
      abs(c.event_date - to_date(rpad(e.event_date, 10, '-01'), 'YYYY-MM-DD')) AS distance
    FROM concert_entry e
    JOIN artist a ON a.id = e.artist_id
    JOIN concert_performer p ON p.artist_id = e.artist_id OR (a.mbid IS NOT NULL AND p.artist_mbid = a.mbid)
    JOIN concert c ON c.id = p.concert_id
    WHERE e.user_id = ${userId}::uuid
      AND e.concert_id IS NULL
      AND c.status IN ('confirmed', 'pending')
      AND NOT c.cancelled
      AND c.event_date <= ${today}::date
      AND (
        (length(e.event_date) = 10
          AND c.event_date BETWEEN e.event_date::date - 1 AND e.event_date::date + 1)
        OR (length(e.event_date) = 7 AND e.city IS NOT NULL AND to_char(c.event_date, 'YYYY-MM') = e.event_date)
        OR (length(e.event_date) = 4 AND e.city IS NOT NULL AND to_char(c.event_date, 'YYYY') = e.event_date)
      )
      AND (e.city IS NULL OR c.city_key = search_key(e.city))
      AND (e.country IS NULL OR c.country IS NULL OR c.country = e.country)
      AND NOT EXISTS (
        SELECT 1 FROM concert_entry o WHERE o.user_id = e.user_id AND o.concert_id = c.id
      )
      ${dismissedFilter}
      ${pairFilter}
  `;
}

interface PairRow extends Record<string, unknown> {
  entry_id: string;
  entry_date: string;
  entry_city: string | null;
  entry_country: string | null;
  artist_name: string;
  concert_id: string;
  concert_name: string;
  concert_date: string;
  venue: string | null;
  city: string | null;
  country: string | null;
  status: string;
}

/** Bloque "¿Son estos tus conciertos?": hasta 3 por recuerdo y hasta 20 en total, los recuerdos más recientes primero. */
export async function listLinkSuggestions(userId: string, now: Date = new Date()): Promise<ConcertLinkSuggestions> {
  const result = await db.execute<PairRow & { total: number }>(sql`
    WITH pairs AS (${candidatePairs(userId, now, {})}),
    ranked AS (
      SELECT pairs.*, row_number() OVER (PARTITION BY entry_id ORDER BY distance, concert_date, concert_id) AS rank
      FROM pairs
    ),
    kept AS (SELECT * FROM ranked WHERE rank <= ${SUGGESTIONS_PER_ENTRY})
    SELECT kept.*, (SELECT count(*) FROM kept)::int AS total
    FROM kept
    ORDER BY entry_date DESC, entry_created_at DESC, entry_id, rank
    LIMIT ${SUGGESTIONS_SHOWN}
  `);
  const rows = Array.from(result);
  return {
    total: rows[0]?.total ?? 0,
    suggestions: rows.map((row) => ({
      entry: {
        id: row.entry_id,
        artistName: row.artist_name,
        eventDate: row.entry_date,
        city: row.entry_city,
        country: row.entry_country,
      },
      concert: {
        id: row.concert_id,
        name: row.concert_name,
        eventDate: row.concert_date,
        venue: row.venue,
        city: row.city,
        country: row.country,
        status: row.status as "confirmed" | "pending",
      },
    })),
  };
}

function entryNotFound(): never {
  throw new ApiError("CONCERT_NOT_FOUND", 404, "El concierto no existe");
}

async function ownEntry(entryId: string, userId: string): Promise<{ concertId: string | null }> {
  const [row] = await db
    .select({ concertId: concertEntry.concertId })
    .from(concertEntry)
    .where(and(eq(concertEntry.id, entryId), eq(concertEntry.userId, userId)))
    .limit(1);
  if (!row) entryNotFound();
  return row;
}

/**
 * "Enlazar": une el recuerdo con el concierto si el par es una sugerencia válida (aunque se haya descartado antes). No
 * modifica nada de lo escrito. Idempotente si ya está enlazado a ese concierto.
 */
export async function linkEntryToConcert(userId: string, entryId: string, concertId: string, now: Date = new Date()): Promise<ConcertEntry> {
  const entry = await ownEntry(entryId, userId);
  if (entry.concertId === concertId) return getOwned(entryId, userId);
  if (entry.concertId) throw new ApiError("CONCERT_LINK_INVALID", 400, "El recuerdo ya está enlazado a otro concierto");

  const [target] = await db
    .select({ status: concert.status })
    .from(concert)
    .where(and(eq(concert.id, concertId), sql`${concert.status} IN ('confirmed', 'pending')`, eq(concert.cancelled, false)))
    .limit(1);
  if (!target) throw new ApiError("SHARED_CONCERT_NOT_FOUND", 404, "El concierto no existe");

  const [other] = await db
    .select({ id: concertEntry.id })
    .from(concertEntry)
    .where(and(eq(concertEntry.userId, userId), eq(concertEntry.concertId, concertId)))
    .limit(1);
  if (other) throw new ApiError("CONCERT_LINK_CONFLICT", 409, "Ya tienes otro recuerdo de ese concierto");

  const matches = Array.from(await db.execute(candidatePairs(userId, now, { pair: { entryId, concertId }, withDismissed: true })));
  if (matches.length === 0) throw new ApiError("CONCERT_LINK_INVALID", 400, "El recuerdo no coincide con ese concierto");

  try {
    const [linked] = await db
      .update(concertEntry)
      .set({ concertId })
      .where(and(eq(concertEntry.id, entryId), eq(concertEntry.userId, userId), isNull(concertEntry.concertId)))
      .returning({ id: concertEntry.id });
    if (!linked) throw new ApiError("CONCERT_LINK_INVALID", 400, "El recuerdo ya está enlazado a otro concierto");
  } catch (error) {
    if (isUniqueViolation(error)) throw new ApiError("CONCERT_LINK_CONFLICT", 409, "Ya tienes otro recuerdo de ese concierto");
    throw error;
  }
  if (target.status === "pending") await evaluateConfirmation(db, concertId, now);
  return getOwned(entryId, userId);
}

/** "No es este": descarta el concierto como sugerencia para ese recuerdo, para siempre. Idempotente. */
export async function dismissLinkSuggestion(userId: string, entryId: string, concertId: string): Promise<void> {
  await ownEntry(entryId, userId);
  const [target] = await db.select({ id: concert.id }).from(concert).where(eq(concert.id, concertId)).limit(1);
  if (!target) throw new ApiError("SHARED_CONCERT_NOT_FOUND", 404, "El concierto no existe");
  await db.insert(concertLinkDismissal).values({ entryId, concertId }).onConflictDoNothing();
}

/**
 * Desvincula un recuerdo de su concierto sin borrarlo: deja de tratarse como creado por "Estuve ahí" y ese concierto no
 * se le vuelve a sugerir. La confirmación del concierto no cambia (pegajosa). Idempotente.
 */
export async function unlinkEntry(userId: string, entryId: string): Promise<ConcertEntry> {
  const entry = await ownEntry(entryId, userId);
  if (!entry.concertId) return getOwned(entryId, userId);
  const previous = entry.concertId;
  await db.transaction(async (tx) => {
    await tx
      .update(concertEntry)
      .set({ concertId: null, fromConcert: false })
      .where(and(eq(concertEntry.id, entryId), eq(concertEntry.userId, userId)));
    await tx.insert(concertLinkDismissal).values({ entryId, concertId: previous }).onConflictDoNothing();
  });
  return getOwned(entryId, userId);
}
