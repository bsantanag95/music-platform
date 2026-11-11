export {};

// Smoke test del cambio add-shared-concerts-phase2 contra Postgres REAL (el SQL que las pruebas unitarias mockean): los
// CHECK y la columna generada de la migración 0093, los requisitos para crear y el límite de 24 horas, la plausibilidad,
// el duplicado exacto (también con pedidos simultáneos), la confirmación (3 personas, cuentas que no cuentan, setlist,
// pegajosa), la visibilidad con y sin sesión, el enlace en el perfil, "Compartir este concierto", los candidatos, los
// reportes, la moderación (ocultar, restaurar, fusionar) y la fusión automática con MusicBrainz (simulado: no sale a
// internet).
// Escribe artistas sintéticos (MBID `5e0ce000-0000-4000-8000-00000000cc0*`), conciertos de la comunidad con esos artistas,
// un concierto de MusicBrainz con MBID `5e0ce000-0000-4000-8000-00000000cce*` y usuarios `smoke_cc_*`, y los borra al
// terminar (también si falla). Si se interrumpió, limpiar con
//   DELETE FROM moderation_action WHERE actor_id IN (SELECT id FROM app_user WHERE username LIKE 'smoke_cc_%');
//   DELETE FROM app_user WHERE username LIKE 'smoke_cc_%';
//   DELETE FROM concert WHERE mbid::text LIKE '5e0ce000-0000-4000-8000-00000000cc%' OR id IN (SELECT concert_id FROM
//     concert_performer WHERE artist_mbid::text LIKE '5e0ce000-0000-4000-8000-00000000cc%');
//   DELETE FROM artist WHERE mbid::text LIKE '5e0ce000-0000-4000-8000-00000000cc%';
// Necesita la migración 0093 aplicada. Correr contra una BD de scratch:
//   ALLOW_SMOKE_ON_REAL_DB=1 npx tsx --env-file=.env scripts/smoke-test-community-concerts.ts

import { randomUUID } from "node:crypto";
import { and, eq, inArray, like, or, sql } from "drizzle-orm";
import { assertSmokeAllowed } from "./assert-smoke-allowed";
import { db } from "../src/db";
import {
  appUser,
  artist,
  concert,
  concertEntry,
  concertPerformer,
  contentReport,
  moderationAction,
  userRestriction,
  userRole,
} from "../src/db/schema";

assertSmokeAllowed();

const suffix = randomUUID().slice(0, 8);
const PREFIX = "5e0ce000-0000-4000-8000-00000000cc";
const BAND_MBID = `${PREFIX}01`;
const OPENER_MBID = `${PREFIX}02`;
const MB_EVENT = `${PREFIX}e1`;
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

const old = new Date(Date.now() - 30 * DAY);
const newUser = (label: string, extra: Partial<typeof appUser.$inferInsert> = {}) => ({
  id: randomUUID(),
  username: `smoke_cc_${label}_${suffix}`,
  email: `smoke_cc_${label}_${suffix}@example.test`,
  createdAt: old,
  emailVerifiedAt: old,
  ...extra,
});

async function main() {
  const realFetch = global.fetch;
  global.fetch = (async (input: RequestInfo | URL) => {
    throw new Error(`salida inesperada a ${new URL(input.toString()).hostname}`);
  }) as typeof fetch;

  const community = await import("../src/services/concerts/community");
  const shared = await import("../src/services/concerts/shared");
  const concerts = await import("../src/services/concerts/concerts");
  const sync = await import("../src/services/concerts/concert-sync");

  const creator = newUser("creator");
  const fan1 = newUser("fan1");
  const fan2 = newUser("fan2");
  const fan3 = newUser("fan3");
  const newbie = newUser("newbie", { createdAt: new Date(Date.now() - 2 * DAY) });
  const unverified = newUser("unverified", { emailVerifiedAt: null });
  const suspended = newUser("suspended");
  const moderator = newUser("moderator");
  const users = [creator, fan1, fan2, fan3, newbie, unverified, suspended, moderator];

  try {
    await db.insert(appUser).values(users);
    await db.insert(userRole).values({ userId: moderator.id, role: "moderator" });
    await db.insert(userRestriction).values({ userId: suspended.id, scope: "social_activity", reason: "smoke", expiresAt: new Date(Date.now() + DAY) });
    const bandName = `Smoke CC Band ${suffix}`;
    const [band] = await db
      .insert(artist)
      .values({ mbid: BAND_MBID, type: "group", name: bandName, lifeBegin: "2003-06", lifeEnd: "2014-10-02", lifeEnded: true })
      .returning();
    const [opener] = await db.insert(artist).values({ mbid: OPENER_MBID, type: "group", name: `Smoke CC Opener ${suffix}` }).returning();
    if (!band || !opener) throw new Error("no se crearon los artistas");
    const bandRef = { id: band.id, mbid: band.mbid };
    const base = { artistId: band.id, performers: [] as { artistId: string; role: "main" | "support" }[], venue: "Teatro Smoke", city: "Santiago", country: "CL" };
    const create = (userId: string, over: Partial<typeof base> & { eventDate: string; setlistfmUrl?: string | null; fromEntryId?: string; name?: string | null }) =>
      community.createCommunityConcert(userId, { ...base, setlistfmUrl: null, name: null, ...over });

    console.log("CHECK y columna generada de la migración 0093");
    const raw = { name: "x", kind: "concert", eventDate: "2010-01-01", source: "community", venue: "v", city: "c", country: "CL" };
    check((await codeOf(() => db.insert(concert).values({ ...raw, venue: null }))) === "23514", "comunitario sin recinto");
    check((await codeOf(() => db.insert(concert).values({ ...raw, city: "!!" }))) === "23514", "comunitario con una ciudad que normalizada queda vacía");
    check((await codeOf(() => db.insert(concert).values({ ...raw, status: "confirmed" }))) === "23514", "comunitario confirmado sin confirmed_at");
    check((await codeOf(() => db.insert(concert).values({ ...raw, setlistfmUrl: "https://www.setlist.fm/setlists/x.html" }))) === "23514", "setlist que no es un setlist");
    const [probe] = await db.insert(concert).values({ ...raw, city: "  São Paulo-Centro " }).returning();
    check(probe?.cityKey === "sao paulo centro", "city_key la calcula la base (sin tildes, puntuación a espacio)");
    check((await codeOf(() => db.update(concert).set({ mergedIntoId: probe!.id }).where(eq(concert.id, probe!.id)))) === "23514", "fusionado en sí mismo / sin ocultar");
    check(
      (await codeOf(() => db.insert(contentReport).values({ reporterId: fan1.id, concertId: probe!.id, reason: "x" }))) === "23514",
      "reporte de concierto sin motivo cerrado",
    );
    await db.delete(concert).where(eq(concert.id, probe!.id));

    console.log("Requisitos, plausibilidad y límite");
    check((await codeOf(() => create(newbie.id, { eventDate: "2009-05-15" }))) === "CONCERT_CREATE_NOT_ALLOWED", "cuenta de 2 días");
    check((await codeOf(() => create(unverified.id, { eventDate: "2009-05-15" }))) === "CONCERT_CREATE_NOT_ALLOWED", "email sin verificar");
    check((await codeOf(() => create(suspended.id, { eventDate: "2009-05-15" }))) === "SOCIAL_SUSPENSION_ACTIVE", "suspensión social");
    check((await codeOf(() => create(creator.id, { eventDate: "1999-05-15" }))) === "CONCERT_IMPLAUSIBLE", "antes de formarse (2003)");
    check((await codeOf(() => create(creator.id, { eventDate: "2018-05-15" }))) === "CONCERT_IMPLAUSIBLE", "después de separarse (2014)");
    check((await codeOf(() => create(creator.id, { eventDate: "2009-05" }))) === "VALIDATION_ERROR", "fecha parcial");

    console.log("Crear y duplicados");
    const c1 = await create(creator.id, { eventDate: "2009-05-15", performers: [{ artistId: opener.id, role: "support" }] });
    check(c1.concert.status === "pending" && c1.concert.name === `${bandName} en Teatro Smoke`, "nace por confirmar con el nombre por defecto");
    const [c1Row] = await db.select().from(concert).where(eq(concert.id, c1.concert.id));
    check(c1Row?.createdBy === creator.id && c1Row.source === "community" && c1Row.cityKey === "santiago", "creadora, origen y ciudad normalizada");
    const [c1Entry] = await db.select().from(concertEntry).where(eq(concertEntry.id, c1.entryId));
    check(c1Entry?.concertId === c1.concert.id && c1Entry.fromConcert && c1Entry.artistId === band.id, "la creadora queda como asistente (recuerdo de «Estuve ahí»)");
    const lineup = await db.select().from(concertPerformer).where(eq(concertPerformer.concertId, c1.concert.id));
    check(lineup.length === 2 && lineup.find((p) => p.role === "support")?.artistId === opener.id, "cartel con el telonero del catálogo");
    let duplicateId: string | null = null;
    try {
      await create(fan1.id, { eventDate: "2009-05-15", city: "SANTIAGO" });
    } catch (error) {
      duplicateId = (error as { concertId?: string }).concertId ?? null;
    }
    check(duplicateId === c1.concert.id, "duplicado exacto con otra escritura de la ciudad: 409 con el id existente");
    const race = await Promise.allSettled([
      create(fan1.id, { eventDate: "2010-02-02", city: "Valparaíso" }),
      create(fan2.id, { eventDate: "2010-02-02", city: "Valparaiso" }),
    ]);
    const won = race.filter((r) => r.status === "fulfilled");
    const lost = race.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
    check(won.length === 1 && lost.length === 1 && (lost[0]!.reason as { code?: string }).code === "CONCERT_DUPLICATE", "dos pedidos simultáneos: uno crea y el otro es duplicado");

    console.log("Visibilidad de lo por confirmar");
    check((await shared.getSharedConcert(c1.concert.id, null)) === null, "anónimo: la página no existe");
    check((await shared.listArtistConcerts(bandRef, null)).pending.length === 0, "anónimo: la pestaña no tiene «Por confirmar»");
    const asFan = await shared.getSharedConcert(c1.concert.id, fan3.id);
    check(asFan?.status === "pending" && asFan.missing === 2 && asFan.attendees === null && asFan.registeredBy === null, "con sesión: faltan 2, sin cifra ni creador");
    const tab = await shared.listArtistConcerts(bandRef, fan3.id);
    check(tab.pending.some((c) => c.id === c1.concert.id && c.missing === 2) && !tab.past.some((c) => c.id === c1.concert.id), "pestaña: en «Por confirmar», no en los públicos");

    console.log("Confirmación");
    await shared.attendConcert(newbie.id, c1.concert.id, band.id);
    await shared.attendConcert(unverified.id, c1.concert.id, band.id);
    check((await shared.getSharedConcert(c1.concert.id, fan3.id))?.missing === 2, "cuentas nueva y sin verificar no cuentan");
    await shared.attendConcert(fan1.id, c1.concert.id, band.id);
    check((await shared.getSharedConcert(c1.concert.id, fan3.id))?.missing === 1, "una persona que cuenta: falta 1");
    await shared.attendConcert(fan2.id, c1.concert.id, band.id);
    const [confirmed] = await db.select().from(concert).where(eq(concert.id, c1.concert.id));
    check(confirmed?.status === "confirmed" && confirmed.confirmedAt !== null, "la tercera persona que cuenta lo confirma");
    const publicView = await shared.getSharedConcert(c1.concert.id, null);
    check(publicView?.registeredBy?.username === creator.username, "confirmado: «Registrado por» para un anónimo");
    check((await shared.listArtistConcerts(bandRef, null)).past.some((c) => c.id === c1.concert.id), "aparece en la lista pública");
    await shared.unattendConcert(fan2.id, c1.concert.id);
    await shared.unattendConcert(fan1.id, c1.concert.id);
    check((await db.select({ s: concert.status }).from(concert).where(eq(concert.id, c1.concert.id)))[0]?.s === "confirmed", "pegajosa: quitar asistencias no la deshace");

    const proven = await create(creator.id, {
      eventDate: "2011-03-03",
      setlistfmUrl: `https://www.setlist.fm/setlist/smoke-cc-band-${suffix}/2011/teatro-smoke-santiago-chile-1.html`,
    });
    check(proven.concert.status === "confirmed", "setlist del mismo artista y año: nace confirmado");
    const unproven = await create(creator.id, { eventDate: "2011-03-04", setlistfmUrl: "https://www.setlist.fm/setlist/otro-artista/2011/x-2.html" });
    check(unproven.concert.status === "pending", "setlist de otro artista: sigue por confirmar");

    console.log("Límite de 24 horas");
    const dupSource = await create(creator.id, { eventDate: "2012-01-01" });
    const mergeTarget = await create(creator.id, { eventDate: "2012-01-02" });
    check((await codeOf(() => create(creator.id, { eventDate: "2012-01-03" }))) === "CONCERT_CREATE_LIMIT", "el sexto en 24 horas: 429");

    console.log("Compartir este concierto y el enlace en el perfil");
    const memory = await concerts.addConcert(fan3.id, { artistId: band.id, eventDate: "2013-07-07", city: "Concepción", country: "CL", note: "inolvidable" });
    check((await codeOf(() => create(fan3.id, { eventDate: "2013-07-08", city: "Concepción", fromEntryId: memory.id }))) === "VALIDATION_ERROR", "fecha distinta a la del recuerdo");
    const sharedMemory = await create(fan3.id, { eventDate: "2013-07-07", city: "Concepción", fromEntryId: memory.id });
    check(sharedMemory.entryId === memory.id, "enlaza el mismo recuerdo");
    const fan3Entries = await db.select().from(concertEntry).where(eq(concertEntry.userId, fan3.id));
    check(fan3Entries.length === 1 && fan3Entries[0]!.note === "inolvidable", "sin crear otro y con lo escrito intacto");
    check((await concerts.listOwnConcerts(fan3.id)).entries[0]?.concertId === sharedMemory.concert.id, "Mis conciertos: muestra el enlace a uno por confirmar");
    check((await concerts.listProfileConcerts(fan3.username, fan3.id)).entries[0]?.concertId === null, "perfil: sin enlace mientras está por confirmar");

    console.log("Candidatos");
    const candidates = await community.listConcertCandidates(fan3.id, bandRef, "2009-05-16", "santiago ");
    check(candidates[0]?.id === c1.concert.id && candidates[0].sameCity, "±1 día, misma ciudad primero");
    check(!candidates.some((c) => c.eventDate === "2011-03-03"), "fuera de la ventana no aparece");

    console.log("Reportes y moderación");
    const report = await community.reportConcert(fan3.id, c1.concert.id, "did_not_happen", "nunca tocaron");
    check(report !== null && (await community.reportConcert(fan3.id, c1.concert.id, "duplicate", null)) === null, "un reporte abierto por persona");
    check((await codeOf(() => community.hideConcert(fan1.id, c1.concert.id, "x"))) === "ROLE_REQUIRED", "ocultar sin permiso: 403");
    await community.hideConcert(moderator.id, c1.concert.id, "No ocurrió");
    check((await shared.getSharedConcert(c1.concert.id, fan3.id)) === null, "oculto: no se ve ni con sesión");
    const [resolved] = await db.select().from(contentReport).where(eq(contentReport.id, report!.id));
    check(resolved?.status === "resolved" && resolved.reasonCode === "did_not_happen", "la acción resuelve el reporte abierto");
    await community.restoreConcert(moderator.id, c1.concert.id, "Sí ocurrió");
    check((await db.select({ s: concert.status }).from(concert).where(eq(concert.id, c1.concert.id)))[0]?.s === "confirmed", "restaurar uno que se confirmó: confirmado");
    await community.hideConcert(moderator.id, unproven.concert.id, "x");
    await community.restoreConcert(moderator.id, unproven.concert.id, "y");
    check((await db.select({ s: concert.status }).from(concert).where(eq(concert.id, unproven.concert.id)))[0]?.s === "pending", "restaurar uno nunca confirmado: por confirmar");

    console.log("Fusión manual");
    await shared.attendConcert(fan1.id, dupSource.concert.id, band.id);
    const fan1Before = (await db.select().from(concertEntry).where(and(eq(concertEntry.userId, fan1.id), eq(concertEntry.concertId, dupSource.concert.id))))[0]!;
    check((await codeOf(() => community.mergeConcert(moderator.id, dupSource.concert.id, dupSource.concert.id, "x"))) === "CONCERT_MERGE_INVALID", "consigo mismo: inválido");
    const merged = await community.mergeConcert(moderator.id, dupSource.concert.id, mergeTarget.concert.id, "Duplicado");
    check(merged.moved === 1 && merged.unlinked === 1, "mueve a quien no estaba y desenlaza a quien ya estaba");
    const creatorDup = (await db.select().from(concertEntry).where(eq(concertEntry.id, dupSource.entryId)))[0];
    check(creatorDup !== undefined && creatorDup.concertId === null, "el recuerdo repetido queda sin enlace, sin borrarse");
    const fan1After = (await db.select().from(concertEntry).where(eq(concertEntry.id, fan1Before.id)))[0]!;
    check(fan1After.concertId === mergeTarget.concert.id && fan1After.updatedAt.getTime() === fan1Before.updatedAt.getTime(), "el recuerdo movido conserva updated_at");
    check((await shared.unattendConcert(fan1.id, mergeTarget.concert.id)).removed === "deleted", "y «Quitar» todavía lo borra");
    const [source] = await db.select().from(concert).where(eq(concert.id, dupSource.concert.id));
    check(source?.status === "hidden" && source.mergedIntoId === mergeTarget.concert.id, "el origen queda oculto con el destino");
    check((await shared.mergedConcertTarget(dupSource.concert.id))?.id === mergeTarget.concert.id, "su página redirige al destino");
    check((await codeOf(() => community.restoreConcert(moderator.id, dupSource.concert.id, "x"))) === "CONCERT_MERGE_INVALID", "un fusionado no se restaura");
    const actions = await db.select().from(moderationAction).where(eq(moderationAction.actorId, moderator.id));
    check(actions.some((a) => a.action === "merge" && a.concertId === dupSource.concert.id), "fusión auditada");

    console.log("Fusión automática con MusicBrainz");
    const mbDuplicate = await create(fan2.id, { eventDate: "2013-09-09" });
    const placeRel = {
      "target-type": "place",
      type: "held at",
      place: { id: `${PREFIX}f1`, name: "Teatro Smoke", area: { id: `${PREFIX}f2`, name: "Santiago", type: "City" } },
    };
    const event = {
      id: MB_EVENT,
      name: "Smoke CC en vivo",
      type: "Concert",
      "life-span": { begin: "2013-09-09" },
      relations: [placeRel, { "target-type": "artist", type: "main performer", artist: { id: BAND_MBID, name: bandName } }],
    };
    global.fetch = (async (input: RequestInfo | URL) => {
      const url = new URL(input.toString());
      if (url.hostname !== "musicbrainz.org") throw new Error(`salida inesperada a ${url.hostname}`);
      return new Response(JSON.stringify({ "event-count": 1, "event-offset": 0, events: [event] }), { status: 200 });
    }) as typeof fetch;
    await sync.syncArtistConcerts({ id: band.id, mbid: band.mbid, concertsSyncedAt: null });
    const [mbConcert] = await db.select().from(concert).where(eq(concert.mbid, MB_EVENT));
    const [absorbed] = await db.select().from(concert).where(eq(concert.id, mbDuplicate.concert.id));
    check(absorbed?.status === "hidden" && absorbed.mergedIntoId === mbConcert?.id, "el de la comunidad se fusiona en el importado");
    const [fan2Entry] = await db.select().from(concertEntry).where(eq(concertEntry.id, mbDuplicate.entryId));
    check(fan2Entry?.concertId === mbConcert?.id, "su asistente pasa al de MusicBrainz");

    console.log("\nSmoke test de conciertos de la comunidad: OK");
  } finally {
    global.fetch = realFetch;
    const smokeUsers = db.select({ id: appUser.id }).from(appUser).where(like(appUser.username, "smoke_cc_%"));
    await db.delete(moderationAction).where(inArray(moderationAction.actorId, smokeUsers));
    await db.delete(appUser).where(like(appUser.username, "smoke_cc_%"));
    const smokeConcerts = db
      .select({ id: concertPerformer.concertId })
      .from(concertPerformer)
      .where(like(sql`${concertPerformer.artistMbid}::text`, `${PREFIX}%`));
    await db.delete(concert).where(or(like(sql`${concert.mbid}::text`, `${PREFIX}%`), inArray(concert.id, smokeConcerts)));
    await db.delete(artist).where(like(sql`${artist.mbid}::text`, `${PREFIX}%`));
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
