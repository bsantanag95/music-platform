export {};

// Smoke test del cambio add-shared-concerts-phase3 contra Postgres REAL (el SQL que las pruebas unitarias mockean): los
// CHECK de la migración 0095, giras y festival padre desde la sincronización de MusicBrainz (simulado: no sale a
// internet; un padre existente no se pisa), la página de la gira y la del festival, "Estuve ahí" con la gira, las
// sugerencias de enlace (día ±1, mes, año, ciudad, país, artista, tope, descarte, ya enlazado), enlazar (inválido,
// conflicto, descartado, confirmación), desvincular, cascadas y la lectura de sugerencias bajo 100 ms con 500 recuerdos.
// Escribe artistas sintéticos (MBID `5e0ce000-0000-4000-8000-00000000dd0*`), conciertos y giras con MBID
// `5e0ce000-0000-4000-8000-00000000dd*` y usuarios `smoke_ct_*`, y los borra al terminar (también si falla). Si se
// interrumpió, limpiar con
//   DELETE FROM app_user WHERE username LIKE 'smoke_ct_%';
//   DELETE FROM concert WHERE mbid::text LIKE '5e0ce000-0000-4000-8000-00000000dd%' OR id IN (SELECT concert_id FROM
//     concert_performer WHERE artist_mbid::text LIKE '5e0ce000-0000-4000-8000-00000000dd%');
//   DELETE FROM concert_series WHERE mbid::text LIKE '5e0ce000-0000-4000-8000-00000000dd%';
//   DELETE FROM artist WHERE mbid::text LIKE '5e0ce000-0000-4000-8000-00000000dd%';
// Necesita la migración 0095 aplicada. Correr contra una BD de scratch:
//   ALLOW_SMOKE_ON_REAL_DB=1 npx tsx --env-file=.env scripts/smoke-test-concert-links-tours.ts

import { randomUUID } from "node:crypto";
import { and, eq, inArray, like, or, sql } from "drizzle-orm";
import { assertSmokeAllowed } from "./assert-smoke-allowed";
import { db } from "../src/db";
import { appUser, artist, concert, concertEntry, concertLinkDismissal, concertPerformer, concertSeries } from "../src/db/schema";

assertSmokeAllowed();

const suffix = randomUUID().slice(0, 8);
const PREFIX = "5e0ce000-0000-4000-8000-00000000dd";
const BAND_MBID = `${PREFIX}01`;
const OTHER_MBID = `${PREFIX}02`;
const TOUR_MBID = `${PREFIX}a1`;
// Un dígito hexadecimal: el prefijo deja lugar para dos caracteres en el último grupo del UUID.
const EV = (n: number) => `${PREFIX}e${n.toString(16)}`;
const DAY = 24 * 60 * 60 * 1000;

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

/** Nombre de la restricción que rechazó la escritura (`null` si no falló). */
async function constraintOf(fn: () => Promise<unknown>): Promise<string | null> {
  try {
    await fn();
    return null;
  } catch (error) {
    const e = error as { constraint_name?: string; cause?: { constraint_name?: string } };
    return e.constraint_name ?? e.cause?.constraint_name ?? "SIN_RESTRICCION";
  }
}

const old = new Date(Date.now() - 30 * DAY);
const newUser = (label: string) => ({
  id: randomUUID(),
  username: `smoke_ct_${label}_${suffix}`,
  email: `smoke_ct_${label}_${suffix}@example.test`,
  createdAt: old,
  emailVerifiedAt: old,
});

const santiago = { id: `${PREFIX}f2`, name: "Santiago", type: "City" };
const placeRel = { "target-type": "place", type: "held at", place: { id: `${PREFIX}f1`, name: "Estadio Smoke", area: santiago } };
const bandRel = (name: string) => ({ "target-type": "artist", type: "main performer", artist: { id: BAND_MBID, name } });
const tourRel = { "target-type": "series", type: "part of", direction: "forward", series: { id: TOUR_MBID, name: "Smoke World Tour", type: "Tour" } };
const partsRel = (id: string, name: string, begin: string, end: string) => ({
  "target-type": "event",
  type: "parts",
  direction: "backward",
  event: { id, name, type: "Festival", "life-span": { begin, end } },
});

async function main() {
  const realFetch = global.fetch;
  const bandName = `Smoke CT Band ${suffix}`;
  const events = [
    { id: EV(1), name: "Smoke World Tour: Santiago", type: "Concert", "life-span": { begin: "2019-11-02" }, relations: [placeRel, bandRel(bandName), tourRel] },
    {
      id: EV(2),
      name: "Smoke Fest 2023, Day 1",
      type: "Festival",
      "life-span": { begin: "2023-04-21", end: "2023-04-21" },
      relations: [placeRel, bandRel(bandName), partsRel(EV(10), "Smoke Fest 2023", "2023-04-21", "2023-04-23")],
    },
    {
      id: EV(3),
      name: "Smoke reprogramado",
      type: "Concert",
      "life-span": { begin: "2020-01-05" },
      relations: [
        bandRel(bandName),
        { "target-type": "event", type: "rescheduled as", direction: "backward", event: { id: EV(13), name: "Antes", type: "Concert", "life-span": { begin: "2019-12-05" } } },
      ],
    },
    {
      id: EV(4),
      name: "Smoke Otro Fest, Day 2",
      type: "Festival",
      "life-span": { begin: "2022-02-02" },
      relations: [bandRel(bandName), partsRel(EV(11), "Nombre de la relación", "2022-02-01", "2022-02-03")],
    },
  ];
  global.fetch = (async (input: RequestInfo | URL) => {
    const url = new URL(input.toString());
    if (url.hostname !== "musicbrainz.org") throw new Error(`salida inesperada a ${url.hostname}`);
    return new Response(JSON.stringify({ "event-count": events.length, "event-offset": 0, events }), { status: 200 });
  }) as typeof fetch;

  const sync = await import("../src/services/concerts/concert-sync");
  const shared = await import("../src/services/concerts/shared");
  const concerts = await import("../src/services/concerts/concerts");
  const suggestions = await import("../src/services/concerts/suggestions");
  const tours = await import("../src/services/concerts/tours");

  const owner = newUser("owner");
  const other = newUser("other");
  const perf = newUser("perf");

  try {
    await db.insert(appUser).values([owner, other, perf]);
    const [band] = await db.insert(artist).values({ mbid: BAND_MBID, type: "group", name: bandName }).returning();
    const [otherBand] = await db.insert(artist).values({ mbid: OTHER_MBID, type: "group", name: `Smoke CT Other ${suffix}` }).returning();
    if (!band || !otherBand) throw new Error("no se crearon los artistas");

    console.log("CHECK de la migración 0095");
    const [probe] = await db.insert(concert).values({ mbid: EV(15), name: "x", kind: "concert", eventDate: "2010-01-01", source: "musicbrainz" }).returning();
    check(
      (await constraintOf(() => db.update(concert).set({ parentId: probe!.id }).where(eq(concert.id, probe!.id)))) === "chk_concert_parent",
      "un concierto no es parte de sí mismo",
    );
    check(
      (await constraintOf(() => db.update(concert).set({ endDate: "2009-12-31" }).where(eq(concert.id, probe!.id)))) === "chk_concert_end_date",
      "el fin no es anterior al inicio",
    );
    check(
      (await constraintOf(() => db.insert(concertSeries).values({ mbid: `${PREFIX}a9`, name: "" }))) === "chk_concert_series_name",
      "gira sin nombre",
    );
    await db.delete(concert).where(eq(concert.id, probe!.id));

    console.log("Sincronización: giras y festivales");
    // Un festival ya importado por su propio cartel: no se pisa, solo se completa el fin.
    const [existingParent] = await db
      .insert(concert)
      .values({ mbid: EV(11), name: "Smoke Otro Fest (original)", kind: "festival", eventDate: "2022-02-01", source: "musicbrainz", venue: "Parque Smoke" })
      .returning();
    await sync.syncArtistConcerts({ id: band.id, mbid: band.mbid, concertsSyncedAt: null });
    const rows = await db.select().from(concert).where(like(sql`${concert.mbid}::text`, `${PREFIX}e%`));
    const byMbid = new Map(rows.map((row) => [row.mbid, row]));
    const [tourRow] = await db.select().from(concertSeries).where(eq(concertSeries.mbid, TOUR_MBID));
    check(tourRow?.name === "Smoke World Tour" && byMbid.get(EV(1))?.seriesId === tourRow.id, "la gira se guarda y se enlaza");
    const fest = byMbid.get(EV(10));
    check(fest?.kind === "festival" && fest.eventDate === "2023-04-21" && fest.endDate === "2023-04-23", "el festival padre se crea con su rango");
    check((await db.select().from(concertPerformer).where(eq(concertPerformer.concertId, fest!.id))).length === 0, "el padre no tiene cartel");
    check(byMbid.get(EV(2))?.parentId === fest!.id, "el día queda enlazado al festival");
    check(byMbid.get(EV(3))?.parentId === null && !byMbid.has(EV(13)), "un reprogramado no crea festival");
    const [kept] = await db.select().from(concert).where(eq(concert.id, existingParent!.id));
    check(kept?.name === "Smoke Otro Fest (original)" && kept.venue === "Parque Smoke" && kept.endDate === "2022-02-03", "un padre existente no se pisa; se completa el fin");
    check(byMbid.get(EV(4))?.parentId === existingParent!.id, "la parte enlaza al padre existente");
    await sync.syncArtistConcerts({ id: band.id, mbid: band.mbid, concertsSyncedAt: new Date() });
    check((await db.select().from(concertSeries).where(eq(concertSeries.mbid, TOUR_MBID))).length === 1, "resincronizar no duplica la gira");

    console.log("Lecturas de gira y festival");
    const e1 = byMbid.get(EV(1))!;
    const e2 = byMbid.get(EV(2))!;
    check((await shared.getSharedConcert(e1.id, null))?.tour?.name === "Smoke World Tour", "la página del concierto nombra su gira");
    check((await shared.getSharedConcert(e2.id, null))?.parent?.id === fest!.id, "la parte nombra su festival");
    const festPage = await shared.getSharedConcert(fest!.id, null);
    check(festPage?.parts.some((p) => p.id === e2.id) && festPage.attendable === false, "el festival lista sus partes y no ofrece «Estuve ahí»");
    check(festPage?.performers.some((p) => p.artistId === band.id) && festPage.venue === "Estadio Smoke", "cartel y recinto reunidos de sus partes");
    check((await codeOf(() => shared.attendConcert(owner.id, fest!.id))) === "VALIDATION_ERROR", "«Estuve ahí» en el festival sin cartel: rechazado");
    const tab = await shared.listArtistConcerts({ id: band.id, mbid: band.mbid }, null);
    check(!tab.past.some((c) => c.id === fest!.id) && tab.past.find((c) => c.id === e2.id)?.parent?.id === fest!.id, "la pestaña no lista el padre y la parte lo nombra");
    const anonTour = await tours.getTour(tourRow!.id, null);
    check(anonTour?.total === 1 && anonTour.attended === null && anonTour.artists[0]?.artistId === band.id, "página de la gira para un anónimo");
    const attended = await shared.attendConcert(owner.id, e1.id, band.id);
    const [memory] = await db.select().from(concertEntry).where(eq(concertEntry.id, attended.entryId));
    check(memory?.tour === "Smoke World Tour", "«Estuve ahí» copia la gira al recuerdo nuevo");
    check((await tours.getTour(tourRow!.id, owner.id))?.attended === 1, "la gira cuenta en cuántas estuvo quien mira");

    console.log("Sugerencias de enlace");
    const mk = async (mbid: string, date: string, city: string | null, country: string | null, status = "confirmed") => {
      const [row] = await db
        .insert(concert)
        .values({ mbid, name: `Smoke ${date} ${city ?? "-"}`, kind: "concert", eventDate: date, source: "musicbrainz", status, city, country })
        .returning();
      await db.insert(concertPerformer).values({ concertId: row!.id, artistMbid: BAND_MBID, artistName: bandName, artistId: band.id, role: "main", position: 0 });
      return row!;
    };
    const c1 = await mk(`${PREFIX}c1`, "2010-03-10", "Santiago", "CL");
    const c2 = await mk(`${PREFIX}c2`, "2010-03-20", "Santiago", "CL");
    const c3 = await mk(`${PREFIX}c3`, "2010-03-12", "Valparaíso", "CL");
    const c4 = await mk(`${PREFIX}c4`, "2010-03-25", "Santiago", "CL");
    // Sin país y con la ciudad en mayúsculas: también calza con un recuerdo de Santiago, CL (cuarto candidato del tope).
    await mk(`${PREFIX}c5`, "2010-03-28", "SANTIAGO", null);
    const add = (artistId: string, eventDate: string, city: string | null, country: string | null) =>
      concerts.addConcert(owner.id, { artistId, eventDate, city, country });
    const mExact = await add(band.id, "2010-03-11", null, null);
    const mMonth = await add(band.id, "2010-03", "santiago", "CL");
    const mYearNoCity = await add(band.id, "2010", null, null);
    const mOtherCity = await add(band.id, "2010-03", "Concepción", "CL");
    const mCountry = await add(band.id, "2010-03-10", null, "AR");
    const mOtherArtist = await add(otherBand.id, "2010-03-10", null, null);
    const list = await suggestions.listLinkSuggestions(owner.id);
    const forEntry = (id: string) => list.suggestions.filter((s) => s.entry.id === id).map((s) => s.concert.id);
    check(JSON.stringify(forEntry(mExact.id).sort()) === JSON.stringify([c1.id, c3.id].sort()), "día exacto sin ciudad: ±1 día, cualquier ciudad");
    check(forEntry(mMonth.id).length === 3 && !forEntry(mMonth.id).includes(c3.id), "mes con ciudad: solo la misma ciudad y tope de 3");
    check(forEntry(mYearNoCity.id).length === 0, "año sin ciudad: nada");
    check(forEntry(mOtherCity.id).length === 0, "otra ciudad: nada");
    check(forEntry(mCountry.id).length === 0, "otro país: nada");
    check(forEntry(mOtherArtist.id).length === 0, "otro artista: nada");
    check(!list.suggestions.some((s) => s.concert.id === e1.id), "un concierto donde ya estuvo no se sugiere");

    await suggestions.dismissLinkSuggestion(owner.id, mExact.id, c1.id);
    await suggestions.dismissLinkSuggestion(owner.id, mExact.id, c1.id);
    const afterDismiss = await suggestions.listLinkSuggestions(owner.id);
    check(
      JSON.stringify(afterDismiss.suggestions.filter((s) => s.entry.id === mExact.id).map((s) => s.concert.id)) === JSON.stringify([c3.id]),
      "«No es este» (idempotente) lo saca de las sugerencias",
    );

    console.log("Enlazar y desvincular");
    const linked = await suggestions.linkEntryToConcert(owner.id, mMonth.id, c2.id);
    check(linked.concertId === c2.id && linked.eventDate === "2010-03" && linked.city === "santiago", "enlaza sin tocar lo escrito");
    check(
      !(await suggestions.listLinkSuggestions(owner.id)).suggestions.some((s) => s.entry.id === mMonth.id || s.concert.id === c2.id),
      "el recuerdo enlazado y su concierto salen de las sugerencias",
    );
    check((await codeOf(() => suggestions.linkEntryToConcert(owner.id, mExact.id, c2.id))) === "CONCERT_LINK_CONFLICT", "otro recuerdo en el mismo concierto: 409");
    check((await codeOf(() => suggestions.linkEntryToConcert(owner.id, mYearNoCity.id, c1.id))) === "CONCERT_LINK_INVALID", "un par que no coincide: 400");
    check((await codeOf(() => suggestions.linkEntryToConcert(owner.id, mOtherArtist.id, c1.id))) === "CONCERT_LINK_INVALID", "otro artista: 400");
    check((await codeOf(() => suggestions.linkEntryToConcert(other.id, mExact.id, c1.id))) === "CONCERT_NOT_FOUND", "recuerdo ajeno: 404");
    check((await suggestions.linkEntryToConcert(owner.id, mExact.id, c1.id)).concertId === c1.id, "un descartado se puede enlazar a mano");
    check((await suggestions.linkEntryToConcert(owner.id, mExact.id, c1.id)).concertId === c1.id, "enlazar de nuevo es idempotente");

    const unlinked = await suggestions.unlinkEntry(owner.id, mMonth.id);
    const [mMonthRow] = await db.select().from(concertEntry).where(eq(concertEntry.id, mMonth.id));
    check(unlinked.concertId === null && mMonthRow?.city === "santiago" && mMonthRow.fromConcert === false, "desvincular conserva el recuerdo");
    check(
      !(await suggestions.listLinkSuggestions(owner.id)).suggestions.some((s) => s.entry.id === mMonth.id && s.concert.id === c2.id),
      "lo desvinculado no se vuelve a sugerir",
    );
    const fromAttend = await suggestions.unlinkEntry(owner.id, attended.entryId);
    const [attendRow] = await db.select().from(concertEntry).where(eq(concertEntry.id, attended.entryId));
    check(fromAttend.concertId === null && attendRow?.fromConcert === false && attendRow.tour === "Smoke World Tour", "un recuerdo de «Estuve ahí» también se conserva");

    console.log("Confirmación al enlazar uno por confirmar");
    const [pending] = await db
      .insert(concert)
      .values({ name: "Smoke pendiente", kind: "concert", eventDate: "2012-05-05", source: "community", status: "pending", venue: "Club", city: "Santiago", country: "CL" })
      .returning();
    await db.insert(concertPerformer).values({ concertId: pending!.id, artistMbid: BAND_MBID, artistName: bandName, artistId: band.id, role: "main", position: 0 });
    const mPending = await add(band.id, "2012-05-05", "Santiago", "CL");
    check((await shared.getSharedConcert(pending!.id, owner.id))?.missing === 3, "por confirmar: faltan 3");
    await suggestions.linkEntryToConcert(owner.id, mPending.id, pending!.id);
    check((await shared.getSharedConcert(pending!.id, owner.id))?.missing === 2, "enlazar cuenta como asistencia");

    console.log("Cascadas");
    await suggestions.dismissLinkSuggestion(owner.id, mOtherCity.id, c4.id);
    await db.delete(concert).where(eq(concert.id, c4.id));
    check((await db.select().from(concertLinkDismissal).where(eq(concertLinkDismissal.concertId, c4.id))).length === 0, "borrar el concierto borra sus descartes");
    await concerts.removeConcert(mExact.id, owner.id);
    check((await db.select().from(concertLinkDismissal).where(eq(concertLinkDismissal.entryId, mExact.id))).length === 0, "borrar el recuerdo borra sus descartes");
    await db.delete(concertSeries).where(eq(concertSeries.id, tourRow!.id));
    check((await db.select({ s: concert.seriesId }).from(concert).where(eq(concert.id, e1.id)))[0]?.s === null, "borrar la gira deja el concierto sin gira");

    console.log("Rendimiento");
    const dates = Array.from({ length: 500 }, (_, i) => {
      const year = 2000 + (i % 20);
      const month = String((i % 12) + 1).padStart(2, "0");
      return i % 3 === 0 ? `${year}` : i % 3 === 1 ? `${year}-${month}` : `${year}-${month}-${String((i % 27) + 1).padStart(2, "0")}`;
    });
    await db.insert(concertEntry).values(
      dates.map((eventDate) => ({ userId: perf.id, artistId: band.id, eventDate, city: "Santiago", country: "CL", audience: "private" })),
    );
    await suggestions.listLinkSuggestions(perf.id);
    const started = performance.now();
    const perfList = await suggestions.listLinkSuggestions(perf.id);
    const elapsed = performance.now() - started;
    check(elapsed < 100, `sugerencias con 500 recuerdos en ${elapsed.toFixed(1)} ms (< 100 ms; ${perfList.total} sugerencias)`);

    console.log("\nSmoke test de sugerencias, giras y festivales: OK");
  } finally {
    global.fetch = realFetch;
    await db.delete(appUser).where(like(appUser.username, "smoke_ct_%"));
    const smokeConcerts = db
      .select({ id: concertPerformer.concertId })
      .from(concertPerformer)
      .where(like(sql`${concertPerformer.artistMbid}::text`, `${PREFIX}%`));
    await db.delete(concert).where(or(like(sql`${concert.mbid}::text`, `${PREFIX}%`), inArray(concert.id, smokeConcerts)));
    await db.delete(concertSeries).where(like(sql`${concertSeries.mbid}::text`, `${PREFIX}%`));
    await db.delete(artist).where(and(like(sql`${artist.mbid}::text`, `${PREFIX}%`)));
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
