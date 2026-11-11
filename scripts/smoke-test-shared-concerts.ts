export {};

// Smoke test del cambio add-shared-concerts-phase1 contra Postgres REAL (el SQL que las pruebas unitarias mockean): los
// CHECK y únicos de la migración 0092, la sincronización de eventos de MusicBrainz (simulado: no sale a internet) y su
// idempotencia, el enlace del cartel por mbid, la pestaña (próximos, pasados, cancelados), "Estuve ahí" (crear, enlazar un
// recuerdo existente, idempotencia, rechazos, quitar con y sin edición), la cifra con umbral, la lista por visitante
// (anónimo, seguidor, bloqueo) y el ON DELETE SET NULL.
// Escribe dos artistas sintéticos (MBID `5e0ce000-0000-4000-8000-00000000bc0*`), conciertos con MBID
// `5e0ce000-0000-4000-8000-00000000bce*` y usuarios `smoke_sc_*`, y los borra al terminar (también si falla). Si se
// interrumpió, limpiar con
//   DELETE FROM app_user WHERE username LIKE 'smoke_sc_%';
//   DELETE FROM concert WHERE mbid::text LIKE '5e0ce000-0000-4000-8000-00000000bc%';
//   DELETE FROM artist WHERE mbid::text LIKE '5e0ce000-0000-4000-8000-00000000bc%';
// Necesita la migración 0092 aplicada. Correr contra una BD de scratch:
//   ALLOW_SMOKE_ON_REAL_DB=1 npx tsx --env-file=.env scripts/smoke-test-shared-concerts.ts

import { randomUUID } from "node:crypto";
import { and, eq, like, sql } from "drizzle-orm";
import { assertSmokeAllowed } from "./assert-smoke-allowed";
import { db } from "../src/db";
import { appUser, artist, concert, concertEntry, concertPerformer, userBlock, userFollow } from "../src/db/schema";

assertSmokeAllowed();

const suffix = randomUUID().slice(0, 8);
const PREFIX = "5e0ce000-0000-4000-8000-00000000bc";
const ARTIST_MBID = `${PREFIX}01`;
const GUEST_MBID = `${PREFIX}02`;
const UNKNOWN_MBID = `${PREFIX}03`;
const EV = (n: number) => `${PREFIX}e${n}`;

function check(condition: unknown, message: string): void {
  if (!condition) throw new Error(`FALLÓ: ${message}`);
  console.log(`  ✓ ${message}`);
}

async function codeOf(fn: () => Promise<unknown>): Promise<string | null> {
  try {
    await fn();
    return null;
  } catch (error) {
    const e = error as { code?: string; cause?: { code?: string } };
    return e.code ?? e.cause?.code ?? "SIN_CODIGO";
  }
}

const artistRel = (id: string, name: string, type: string) => ({ "target-type": "artist", type, artist: { id, name } });
const placeRel = { "target-type": "place", type: "held at", place: { id: `${PREFIX}f1`, name: "Estadio Smoke", area: { id: `${PREFIX}f2`, name: "Santiago", type: "City" } } };
const events = [
  { id: EV(1), name: "Smoke Tour: Santiago", type: "Concert", "life-span": { begin: "2019-11-02" }, relations: [placeRel, artistRel(ARTIST_MBID, "Smoke Band", "main performer"), artistRel(GUEST_MBID, "Smoke Guest", "support act"), artistRel(UNKNOWN_MBID, "Smoke Desconocido", "support act")] },
  { id: EV(2), name: "Smoke Fest 2023", type: "Festival", "life-span": { begin: "2023-04-22" }, relations: [artistRel(ARTIST_MBID, "Smoke Band", "main performer")] },
  { id: EV(3), name: "Smoke Awards", type: "Award ceremony", "life-span": { begin: "2021-05-23" }, relations: [artistRel(ARTIST_MBID, "Smoke Band", "main performer")] },
  { id: EV(4), name: "Smoke parcial", type: "Concert", "life-span": { begin: "1972-11" }, relations: [artistRel(ARTIST_MBID, "Smoke Band", "main performer")] },
  { id: EV(5), name: "Smoke cancelado", type: "Concert", cancelled: true, "life-span": { begin: "2020-01-01" }, relations: [artistRel(ARTIST_MBID, "Smoke Band", "main performer")] },
  { id: EV(6), name: "Smoke futuro", type: "Concert", "life-span": { begin: "2099-01-01" }, relations: [artistRel(ARTIST_MBID, "Smoke Band", "main performer")] },
];

const newUser = (label: string, extra: Partial<typeof appUser.$inferInsert> = {}) => ({
  id: randomUUID(),
  username: `smoke_sc_${label}_${suffix}`,
  email: `smoke_sc_${label}_${suffix}@example.test`,
  ...extra,
});

async function main() {
  const realFetch = global.fetch;
  let mbCalls = 0;
  global.fetch = (async (input: RequestInfo | URL) => {
    const url = new URL(input.toString());
    if (url.hostname !== "musicbrainz.org") throw new Error(`salida inesperada a ${url.hostname}`);
    mbCalls += 1;
    check(url.pathname === "/ws/2/event" && url.searchParams.get("inc") === "place-rels+area-rels+artist-rels", "browse de eventos con recinto, área y artistas");
    return new Response(JSON.stringify({ "event-count": events.length, "event-offset": 0, events }), { status: 200 });
  }) as typeof fetch;

  const sync = await import("../src/services/concerts/concert-sync");
  const shared = await import("../src/services/concerts/shared");
  const concerts = await import("../src/services/concerts/concerts");

  const owner = newUser("owner");
  const fan = newUser("fan");
  const stranger = newUser("stranger");
  const blocked = newUser("blocked");

  try {
    await db.insert(appUser).values([owner, fan, stranger, blocked]);
    const [band] = await db.insert(artist).values({ mbid: ARTIST_MBID, type: "group", name: `Smoke Band ${suffix}` }).returning();
    const [guest] = await db.insert(artist).values({ mbid: GUEST_MBID, type: "group", name: `Smoke Guest ${suffix}` }).returning();
    if (!band || !guest) throw new Error("no se crearon los artistas");
    await db.insert(userFollow).values({ followerId: fan.id, followedId: owner.id, status: "accepted" });
    await db.insert(userBlock).values({ blockerId: owner.id, blockedId: blocked.id });

    console.log("CHECK de la migración 0092");
    check((await codeOf(() => db.insert(concert).values({ name: "x", kind: "concert", eventDate: "2020-01-01", source: "musicbrainz" }))) === "23514", "MusicBrainz sin mbid");
    check((await codeOf(() => db.insert(concert).values({ name: "x", kind: "gala", eventDate: "2020-01-01", source: "community" }))) === "23514", "tipo inválido");
    check((await codeOf(() => db.insert(concert).values({ name: "x", kind: "concert", eventDate: "2020-01-01", source: "community", status: "maybe" }))) === "23514", "estado inválido");
    check((await codeOf(() => db.insert(concert).values({ name: "x", kind: "concert", eventDate: "2020-01-01", source: "community", country: "Chile" }))) === "23514", "país que no es código");

    console.log("Sincronización");
    await sync.ensureArtistConcerts({ id: band.id, mbid: band.mbid, concertsSyncedAt: null });
    const imported = await db.select().from(concert).where(like(sql`${concert.mbid}::text`, `${PREFIX}%`));
    check(imported.length === 4, "importa concierto, festival, cancelado y futuro (no premios ni fecha parcial)");
    const [tour] = imported.filter((c) => c.mbid === EV(1));
    check(tour?.venue === "Estadio Smoke" && tour.city === "Santiago" && tour.country === null && tour.status === "confirmed", "recinto, ciudad, sin país, confirmado");
    const performers = await db.select().from(concertPerformer).where(eq(concertPerformer.concertId, tour!.id));
    check(performers.find((p) => p.artistMbid === GUEST_MBID)?.artistId === guest.id, "el telonero del catálogo queda enlazado");
    check(performers.find((p) => p.artistMbid === UNKNOWN_MBID)?.artistId === null, "el telonero fuera del catálogo queda sin artista (sin stub)");
    const [synced] = await db.select({ at: artist.concertsSyncedAt }).from(artist).where(eq(artist.id, band.id));
    check(synced?.at !== null, "marca concerts_synced_at con todo en una página");
    await sync.syncArtistConcerts({ id: band.id, mbid: band.mbid, concertsSyncedAt: synced!.at });
    const again = await db.select({ id: concert.id }).from(concert).where(like(sql`${concert.mbid}::text`, `${PREFIX}%`));
    const performersAgain = await db.select().from(concertPerformer).where(eq(concertPerformer.concertId, tour!.id));
    check(again.length === 4 && performersAgain.length === performers.length, "la segunda sincronización es idempotente");
    check(mbCalls === 2, "una request por recorrido");

    console.log("Pestaña");
    const tab = await shared.listArtistConcerts(band, owner.id);
    check(tab.upcoming.length === 1 && tab.upcoming[0]!.name === "Smoke futuro", "un próximo");
    check(tab.past.map((c) => c.name).join(",") === "Smoke Fest 2023,Smoke Tour: Santiago", "pasados por fecha, sin el cancelado");
    check(tab.past.every((c) => c.attending === false && c.attendees === null), "nadie estuvo todavía");
    check((await shared.listArtistConcerts(guest, null)).past.length === 1, "el telonero también lo tiene en su pestaña");

    console.log("Estuve ahí");
    const first = await shared.attendConcert(owner.id, tour!.id, band.id);
    const [created] = await db.select().from(concertEntry).where(eq(concertEntry.id, first.entryId));
    check(created?.fromConcert && created.eventDate === "2019-11-02" && created.venue === "Estadio Smoke" && created.artistId === band.id, "crea el recuerdo con los datos del concierto");
    check((await shared.attendConcert(owner.id, tour!.id, band.id)).entryId === first.entryId, "idempotente");
    const manual = await concerts.addConcert(fan.id, { artistId: band.id, eventDate: "2019-11-02", note: "fui con amigos", audience: "public" });
    check((await shared.attendConcert(fan.id, tour!.id, band.id)).entryId === manual.id, "enlaza el recuerdo propio del mismo artista y fecha");
    const future = imported.find((c) => c.mbid === EV(6))!;
    const cancelled = imported.find((c) => c.mbid === EV(5))!;
    check((await codeOf(() => shared.attendConcert(stranger.id, future.id))) === "VALIDATION_ERROR", "rechaza un concierto futuro");
    check((await codeOf(() => shared.attendConcert(stranger.id, cancelled.id))) === "SHARED_CONCERT_NOT_FOUND", "rechaza un cancelado");
    check((await codeOf(() => db.insert(concertEntry).values({ userId: owner.id, artistId: band.id, eventDate: "2019", concertId: tour!.id }))) === "23505", "dos veces en el mismo concierto: la base lo rechaza");

    console.log("Personas que estuvieron");
    const anon = await shared.getSharedConcert(tour!.id, null);
    check(anon?.attendees?.kind === "fewer", "dos personas: 'menos de 5'");
    check(anon?.visibleAttendees.length === 1 && anon.visibleAttendees[0]!.username === fan.username, "anónimo: solo el recuerdo público");
    check((await shared.getSharedConcert(tour!.id, fan.id))?.visibleAttendees.length === 2, "seguidora: ve también el de seguidores");
    check((await shared.getSharedConcert(tour!.id, blocked.id))?.visibleAttendees.every((a) => a.username !== owner.username), "bloqueado: no ve a quien lo bloqueó");
    check(anon?.performers.map((p) => p.role).join(",") === "main,support,support", "cartel en orden");

    console.log("Quitar");
    check((await shared.unattendConcert(owner.id, tour!.id)).removed === "deleted", "recuerdo creado por la acción y sin editar: se borra");
    check((await shared.unattendConcert(fan.id, tour!.id)).removed === "unlinked", "recuerdo propio: solo se desenlaza");
    const [kept] = await db.select().from(concertEntry).where(eq(concertEntry.id, manual.id));
    check(kept?.concertId === null && kept.note === "fui con amigos", "lo escrito queda");
    const second = await shared.attendConcert(owner.id, tour!.id, band.id);
    await concerts.updateConcert(second.entryId, owner.id, { note: "una nota" });
    check((await shared.unattendConcert(owner.id, tour!.id)).removed === "unlinked", "creado por la acción pero editado: solo se desenlaza");

    console.log("Cascadas");
    await shared.attendConcert(stranger.id, tour!.id, band.id);
    await db.delete(concert).where(eq(concert.id, tour!.id));
    const orphans = await db.select().from(concertEntry).where(and(eq(concertEntry.userId, stranger.id), eq(concertEntry.artistId, band.id)));
    check(orphans.length === 1 && orphans[0]!.concertId === null, "borrar el concierto deja el recuerdo sin enlace");

    console.log("\nSmoke test de conciertos compartidos: OK");
  } finally {
    global.fetch = realFetch;
    await db.delete(appUser).where(like(appUser.username, "smoke_sc_%"));
    await db.delete(concert).where(like(sql`${concert.mbid}::text`, `${PREFIX}%`));
    await db.delete(artist).where(like(sql`${artist.mbid}::text`, `${PREFIX}%`));
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
