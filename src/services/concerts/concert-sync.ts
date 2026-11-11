// Sincronización de los eventos de MusicBrainz de un artista como conciertos compartidos (openspec:
// add-shared-concerts-phase1, capability `musicbrainz-event-sync`, ADR 0057). Bajo demanda, como la discografía: al
// abrir la pestaña Conciertos de un artista nunca sincronizado se importa la primera página antes de responder y el
// resto después (`after()`); con más de 30 días se refresca en segundo plano. Idempotente por `mbid`; un concierto que
// desaparece de MusicBrainz no se borra (puede tener asistentes). No crea artistas: el cartel se enlaza por `mbid` solo
// a los que ya están en el catálogo.

import { after } from "next/server";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { artist, concert, concertPerformer, type ArtistRow } from "@/db/schema";
import { musicbrainz, RELEASE_BROWSE_PAGE_SIZE } from "@/services/musicbrainz/client";
import { mapEventToConcert, type ConcertInput } from "@/services/musicbrainz/event-mappers";

/** Cada cuánto se vuelve a recorrer MusicBrainz. */
export const CONCERTS_REFRESH_MS = 30 * 24 * 60 * 60 * 1000;
/** Tope de eventos por artista (Taylor Swift tenía 747 en el spike). */
export const CONCERTS_SYNC_MAX_EVENTS = 1000;

type SyncTarget = Pick<ArtistRow, "id" | "mbid" | "concertsSyncedAt">;

/** Guarda una página de conciertos: upsert por `mbid`, cartel reemplazado y enlazado por `mbid` al catálogo. */
export async function saveConcerts(inputs: ConcertInput[], now: Date = new Date()): Promise<number> {
  if (inputs.length === 0) return 0;
  const performerMbids = [...new Set(inputs.flatMap((input) => input.performers.map((p) => p.artistMbid)))];
  const catalog = performerMbids.length
    ? await db.select({ id: artist.id, mbid: artist.mbid }).from(artist).where(inArray(artist.mbid, performerMbids))
    : [];
  const artistIdByMbid = new Map(catalog.map((row) => [row.mbid!, row.id]));

  await db.transaction(async (tx) => {
    for (const input of inputs) {
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
