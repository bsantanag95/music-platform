// Sincronización de los eventos de MusicBrainz de un artista como conciertos compartidos (openspec:
// add-shared-concerts-phase1, capability `musicbrainz-event-sync`, ADR 0057). Bajo demanda, como la discografía: al
// abrir la pestaña Conciertos de un artista nunca sincronizado se importa la primera página antes de responder y el
// resto después (`after()`); con más de 30 días se refresca en segundo plano. Idempotente por `mbid`; un concierto que
// desaparece de MusicBrainz no se borra (puede tener asistentes). No crea artistas: el cartel se enlaza por `mbid` solo
// a los que ya están en el catálogo. Un concierto de la comunidad con el mismo artista principal, fecha y ciudad se
// fusiona en el importado (add-shared-concerts-phase2). Fase 3 (add-shared-concerts-phase3, ADR 0059): cada concierto
// enlaza su gira y, si es un día o un escenario, su festival, que se guarda sin cartel si no existía.

import { after } from "next/server";
import { and, eq, inArray, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { artist, concert, concertPerformer, concertSeries, type ArtistRow } from "@/db/schema";
import { musicbrainz, RELEASE_BROWSE_PAGE_SIZE } from "@/services/musicbrainz/client";
import { mapEventToConcert, type ConcertInput, type ConcertParentInput, type ConcertTourInput } from "@/services/musicbrainz/event-mappers";
import { mergeCommunityDuplicatesInto } from "./merge";

/** Cada cuánto se vuelve a recorrer MusicBrainz. */
export const CONCERTS_REFRESH_MS = 30 * 24 * 60 * 60 * 1000;
/** Tope de eventos por artista (Taylor Swift tenía 747 en el spike). */
export const CONCERTS_SYNC_MAX_EVENTS = 1000;

type SyncTarget = Pick<ArtistRow, "id" | "mbid" | "concertsSyncedAt">;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** La gira por `mbid` (el nombre se actualiza). */
async function upsertTour(tx: Tx, tour: ConcertTourInput): Promise<string | null> {
  const [row] = await tx
    .insert(concertSeries)
    .values({ mbid: tour.mbid, name: tour.name })
    .onConflictDoUpdate({ target: concertSeries.mbid, set: { name: tour.name } })
    .returning({ id: concertSeries.id });
  return row?.id ?? null;
}

/**
 * El festival padre: se crea sin cartel ni recinto si no existe; si ya existe (importado por su propio cartel) no se
 * pisan sus datos y solo se completa el fin del rango si faltaba.
 */
async function ensureParent(tx: Tx, parent: ConcertParentInput, now: Date): Promise<string | null> {
  await tx
    .insert(concert)
    .values({
      mbid: parent.mbid,
      name: parent.name,
      kind: "festival",
      eventDate: parent.eventDate,
      endDate: parent.endDate,
      source: "musicbrainz",
      cancelled: parent.cancelled,
      syncedAt: now,
    })
    .onConflictDoNothing({ target: concert.mbid });
  if (parent.endDate) {
    await tx
      .update(concert)
      .set({ endDate: parent.endDate })
      .where(and(eq(concert.mbid, parent.mbid), isNull(concert.endDate), lte(concert.eventDate, parent.endDate)));
  }
  const [row] = await tx.select({ id: concert.id }).from(concert).where(eq(concert.mbid, parent.mbid)).limit(1);
  return row?.id ?? null;
}

/** Guarda una página de conciertos: upsert por `mbid`, cartel reemplazado y enlazado por `mbid` al catálogo. */
export async function saveConcerts(inputs: ConcertInput[], now: Date = new Date()): Promise<number> {
  if (inputs.length === 0) return 0;
  const performerMbids = [...new Set(inputs.flatMap((input) => input.performers.map((p) => p.artistMbid)))];
  const catalog = performerMbids.length
    ? await db.select({ id: artist.id, mbid: artist.mbid }).from(artist).where(inArray(artist.mbid, performerMbids))
    : [];
  const artistIdByMbid = new Map(catalog.map((row) => [row.mbid!, row.id]));

  await db.transaction(async (tx) => {
    const tourIds = new Map<string, string | null>();
    const parentIds = new Map<string, string | null>();
    for (const input of inputs) {
      if (input.tour && !tourIds.has(input.tour.mbid)) tourIds.set(input.tour.mbid, await upsertTour(tx, input.tour));
      if (input.parent && !parentIds.has(input.parent.mbid)) parentIds.set(input.parent.mbid, await ensureParent(tx, input.parent, now));
      const seriesId = input.tour ? (tourIds.get(input.tour.mbid) ?? null) : null;
      const parentId = input.parent ? (parentIds.get(input.parent.mbid) ?? null) : null;
      const values = {
        mbid: input.mbid,
        name: input.name,
        kind: input.kind,
        eventDate: input.eventDate,
        venue: input.venue,
        venueMbid: input.venueMbid,
        city: input.city,
        areaMbid: input.areaMbid,
        country: input.country,
        source: "musicbrainz" as const,
        cancelled: input.cancelled,
        syncedAt: now,
        endDate: input.endDate,
        seriesId,
        parentId,
      };
      const [row] = await tx
        .insert(concert)
        .values(values)
        .onConflictDoUpdate({
          target: concert.mbid,
          // El estado no se toca: lo decide la moderación (Fase 2), no MusicBrainz.
          set: {
            name: values.name,
            kind: values.kind,
            eventDate: values.eventDate,
            venue: values.venue,
            venueMbid: values.venueMbid,
            city: values.city,
            areaMbid: values.areaMbid,
            country: values.country,
            cancelled: values.cancelled,
            syncedAt: values.syncedAt,
            endDate: values.endDate,
            seriesId: values.seriesId,
            parentId: values.parentId,
          },
        })
        .returning({ id: concert.id });
      if (!row) continue;
      await tx.delete(concertPerformer).where(eq(concertPerformer.concertId, row.id));
      if (input.performers.length > 0) {
        await tx.insert(concertPerformer).values(
          input.performers.map((performer) => ({
            concertId: row.id,
            artistMbid: performer.artistMbid,
            artistName: performer.artistName,
            artistId: artistIdByMbid.get(performer.artistMbid) ?? null,
            role: performer.role,
            position: performer.position,
          })),
        );
      }
      // Fase 2 (ADR 0058): si la comunidad ya había registrado este concierto, se fusiona en el de MusicBrainz.
      await mergeCommunityDuplicatesInto(tx, row.id, now);
    }
  });
  return inputs.length;
}

/** Enlaza las filas del cartel de un artista que entró al catálogo después de importarse el concierto. */
export async function linkPerformerRows(target: Pick<ArtistRow, "id" | "mbid">): Promise<void> {
  if (!target.mbid) return;
  await db
    .update(concertPerformer)
    .set({ artistId: target.id })
    .where(and(eq(concertPerformer.artistMbid, target.mbid), isNull(concertPerformer.artistId)));
}

/** Importa una página de eventos; devuelve cuántos eventos tiene el artista en total en MusicBrainz. */
async function syncPage(artistMbid: string, offset: number): Promise<{ total: number; fetched: number }> {
  const page = await musicbrainz.browseEventsByArtist(artistMbid, offset);
  const inputs = page.events.map(mapEventToConcert).filter((input): input is ConcertInput => input !== null);
  await saveConcerts(inputs);
  return { total: page["event-count"], fetched: page.events.length };
}

/** Recorre las páginas desde `offset` y marca el recorrido completo. Un fallo deja la marca como estaba. */
export async function syncArtistConcerts(target: SyncTarget, fromOffset = 0): Promise<{ complete: boolean }> {
  if (!target.mbid) return { complete: false };
  let offset = fromOffset;
  for (;;) {
    const { total, fetched } = await syncPage(target.mbid, offset);
    offset += fetched;
    if (fetched === 0 || offset >= total || offset >= CONCERTS_SYNC_MAX_EVENTS) break;
  }
  await linkPerformerRows(target);
  await db.update(artist).set({ concertsSyncedAt: sql`now()` }).where(eq(artist.id, target.id));
  return { complete: true };
}

function schedule(task: () => Promise<unknown>, label: string): void {
  try {
    after(() => task().then(() => undefined, (error) => console.error(`[concerts] ${label}`, error)));
  } catch {
    console.warn(`[concerts] ${label} omitida: fuera de una request`);
  }
}

/**
 * Asegura los conciertos de un artista al abrir su pestaña. Nunca sincronizado: la primera página antes de responder y
 * el resto en segundo plano. Vencido: refresco completo en segundo plano. Un fallo de MusicBrainz no se propaga: la
 * pestaña muestra lo guardado y la próxima visita reintenta.
 */
export async function ensureArtistConcerts(target: SyncTarget, now: Date = new Date()): Promise<void> {
  if (!target.mbid) return;
  if (target.concertsSyncedAt === null) {
    try {
      const { total, fetched } = await syncPage(target.mbid, 0);
      if (fetched === 0 || fetched >= total) {
        await linkPerformerRows(target);
        await db.update(artist).set({ concertsSyncedAt: sql`now()` }).where(eq(artist.id, target.id));
      } else {
        schedule(() => syncArtistConcerts(target, RELEASE_BROWSE_PAGE_SIZE), `resto de los conciertos de ${target.id}`);
      }
    } catch (error) {
      console.error(`[concerts] no se pudieron traer los conciertos de ${target.id}`, error);
    }
    return;
  }
  if (now.getTime() - target.concertsSyncedAt.getTime() > CONCERTS_REFRESH_MS) {
    schedule(() => syncArtistConcerts(target), `refresco de los conciertos de ${target.id}`);
  }
}
