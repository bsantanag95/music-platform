export {};

// Smoke test del cambio add-my-concerts contra Postgres REAL (el SQL que las pruebas unitarias mockean): los CHECK de
// la migración 0091, el alta con la audiencia por defecto, el orden por fecha parcial, los totales, la visibilidad por
// visitante (anónimo, seguidor, perfil privado, bloqueo), la cifra del panel del artista, "Aplicar a lo existente" sin
// tocar `updated_at`, la exportación y las cascadas (cuenta y artista).
// Escribe un artista sintético (MBID `5e0ce000-0000-4000-8000-0000000c0e01`) y usuarios `smoke_concert_*`, y los borra
// al terminar (también si falla). Si se interrumpió, limpiar con
//   DELETE FROM app_user WHERE username LIKE 'smoke_concert_%';
//   DELETE FROM artist WHERE mbid = '5e0ce000-0000-4000-8000-0000000c0e01';
// (el `ON DELETE CASCADE` limpia conciertos, seguimientos y bloqueos). Necesita la migración 0091 aplicada. Correr contra
// una BD de scratch:
//   ALLOW_SMOKE_ON_REAL_DB=1 npx tsx --env-file=.env scripts/smoke-test-concerts.ts

import { randomUUID } from "node:crypto";
import { eq, like, sql } from "drizzle-orm";
import { assertSmokeAllowed } from "./assert-smoke-allowed";
import { db } from "../src/db";
import { appUser, artist, concertEntry, userBlock, userFollow } from "../src/db/schema";

assertSmokeAllowed();

const suffix = randomUUID().slice(0, 8);
const ARTIST_MBID = "5e0ce000-0000-4000-8000-0000000c0e01";

function check(condition: unknown, message: string): void {
  if (!condition) throw new Error(`FALLÓ: ${message}`);
  console.log(`  ✓ ${message}`);
}

async function codeOf(fn: () => Promise<unknown>): Promise<string | null> {
  try {
    await fn();
    return null;
  } catch (error) {
    return (error as { code?: string; cause?: { code?: string } }).code ?? (error as { cause?: { code?: string } }).cause?.code ?? "SIN_CODIGO";
  }
}

const newUser = (label: string, extra: Partial<typeof appUser.$inferInsert> = {}) => ({
  id: randomUUID(),
  username: `smoke_concert_${label}_${suffix}`,
  email: `smoke_concert_${label}_${suffix}@example.test`,
  ...extra,
});

async function main() {
  const concerts = await import("../src/services/concerts/concerts");
  const { applyAudienceToExisting } = await import("../src/services/social/apply-audience");
  const { buildDataExport } = await import("../src/services/profiles/data-export");

  const owner = newUser("owner");
  const follower = newUser("follower");
  const stranger = newUser("stranger");
  const blocked = newUser("blocked");
  const privateOwner = newUser("private", { profileVisibility: "private" });

  try {
    await db.insert(appUser).values([owner, follower, stranger, blocked, privateOwner]);
    const [art] = await db.insert(artist).values({ mbid: ARTIST_MBID, type: "group", name: `Smoke Concerts ${suffix}` }).returning();
    if (!art) throw new Error("no se creó el artista sintético");
    await db.insert(userFollow).values([
      { followerId: follower.id, followedId: owner.id, status: "accepted" },
      { followerId: follower.id, followedId: privateOwner.id, status: "accepted" },
    ]);
    await db.insert(userBlock).values({ blockerId: owner.id, blockedId: blocked.id });

    console.log("CHECK de la migración 0091");
    const base = { userId: owner.id, artistId: art.id };
    for (const [values, label] of [
      [{ eventDate: "2019-13" }, "mes inexistente"],
      [{ eventDate: "19" }, "año corto"],
      [{ eventDate: "2019", country: "chile" }, "país que no es código"],
      [{ eventDate: "2019", city: "x".repeat(101) }, "ciudad de más de 100"],
      [{ eventDate: "2019", city: "" }, "ciudad vacía"],
      [{ eventDate: "2019", note: "x".repeat(141) }, "nota de más de 140"],
      [{ eventDate: "2019", setlistfmUrl: "https://www.setlist.fm/setlists/x.html" }, "enlace a la página de un artista"],
      [{ eventDate: "2019", setlistfmUrl: "http://www.setlist.fm/setlist/x.html" }, "enlace sin https"],
      [{ eventDate: "2019", audience: "everyone" }, "audiencia inválida"],
    ] as const) {
      check((await codeOf(() => db.insert(concertEntry).values({ ...base, ...values }))) === "23514", `la base rechaza: ${label}`);
    }

    console.log("Alta y orden");
    const a = await concerts.addConcert(owner.id, { artistId: art.id, eventDate: "2019", country: "AR", audience: "public" });
    const b = await concerts.addConcert(owner.id, {
      artistId: art.id,
      eventDate: "2019-11-02",
      country: "CL",
      city: "Santiago",
      venue: "Estadio Nacional",
      setlistfmUrl: "https://www.setlist.fm/setlist/smoke/2019/estadio-nacional-1.html",
    });
    const c = await concerts.addConcert(owner.id, { artistId: art.id, eventDate: "2024-05", audience: "private" });
    check(b.audience === "followers", "sin audiencia ni preferencia nace followers");
    await db.update(appUser).set({ defaultAudience: "public" }).where(eq(appUser.id, owner.id));
    const d = await concerts.addConcert(owner.id, { artistId: art.id, eventDate: "2019-11-02" });
    check(d.audience === "public", "con audiencia por defecto public nace public");
    check((await codeOf(() => concerts.addConcert(owner.id, { artistId: art.id, eventDate: "2999" }))) === "VALIDATION_ERROR", "fecha futura rechazada");
    check((await codeOf(() => concerts.addConcert(owner.id, { artistId: randomUUID(), eventDate: "2019" }))) === "ARTIST_NOT_FOUND", "artista inexistente");

    const own = await concerts.listOwnConcerts(owner.id);
    const order = own.entries.map((e) => e.id);
    check(order[0] === c.id, "2024-05 primero");
    check(order.indexOf(b.id) < order.indexOf(a.id) && order.indexOf(d.id) < order.indexOf(a.id), "la fecha completa de 2019 antes que el registro de solo año");
    check(
      own.totals.concerts === 4 && own.totals.artists === 1 && own.totals.cities === 1 && own.totals.countries === 2,
      "totales: 4 conciertos, 1 artista, 1 ciudad, 2 países",
    );
    check((await concerts.listOwnConcerts(owner.id, { artistId: art.id })).entries.length === 4, "filtro por artista");
    check((await concerts.countOwnConcertsForArtist(owner.id, art.id)) === 4, "la cifra del panel cuenta todas las audiencias");

    console.log("Edición y baja");
    const edited = await concerts.updateConcert(a.id, owner.id, { eventDate: "2019-03", venue: "Teatro Caupolicán" });
    check(edited.eventDate === "2019-03" && edited.venue === "Teatro Caupolicán" && edited.country === "AR", "editar conserva lo no indicado");
    const cleared = await concerts.updateConcert(a.id, owner.id, { venue: null });
    check(cleared.venue === null, "null quita el dato");
    check((await codeOf(() => concerts.updateConcert(a.id, stranger.id, { note: "x" }))) === "CONCERT_NOT_FOUND", "no se edita uno ajeno");
    check((await codeOf(() => concerts.removeConcert(a.id, stranger.id))) === "CONCERT_NOT_FOUND", "no se quita uno ajeno");

    console.log("Visibilidad");
    const anon = await concerts.listProfileConcerts(owner.username, null);
    check(anon.entries.length === 2 && anon.entries.every((e) => e.audience === "public"), "anónimo: solo los públicos");
    check((await concerts.listProfileConcerts(owner.username, follower.id)).entries.length === 3, "seguidor: públicos y para seguidores");
    check((await concerts.listProfileConcerts(owner.username, owner.id)).entries.length === 4, "dueño: todos");
    check((await concerts.listProfileConcerts(owner.username, blocked.id)).entries.length === 0, "bloqueado: nada");
    const preview = await concerts.getConcertPreview(owner.username, null);
    check(preview.total === 2 && preview.entries.length === 2, "riel: total visible para el anónimo");
    await concerts.addConcert(privateOwner.id, { artistId: art.id, eventDate: "2020", audience: "public" });
    check((await concerts.listProfileConcerts(privateOwner.username, stranger.id)).entries.length === 0, "perfil privado: nada para quien no sigue");
    check((await concerts.listProfileConcerts(privateOwner.username, follower.id)).entries.length === 1, "perfil privado: lo ve quien sigue");

    console.log("Aplicar a lo existente");
    const [before] = await db.select({ updatedAt: concertEntry.updatedAt }).from(concertEntry).where(eq(concertEntry.id, b.id));
    const applied = await applyAudienceToExisting(owner.id, "private");
    check(applied.concerts === 3, "cambia los 3 que no eran privados");
    const [after] = await db.select({ updatedAt: concertEntry.updatedAt, audience: concertEntry.audience }).from(concertEntry).where(eq(concertEntry.id, b.id));
    check(after?.audience === "private" && after.updatedAt.getTime() === before?.updatedAt.getTime(), "conserva updated_at");
    const touched = await concerts.updateConcert(b.id, owner.id, { note: "una nota" });
    check(new Date(touched.updatedAt).getTime() > (before?.updatedAt.getTime() ?? 0), "una edición normal sí mueve updated_at");

    console.log("Exportación y cascadas");
    const exported = await buildDataExport(owner.id);
    check(exported.library.concerts.length === 4, "la exportación trae los 4 conciertos");
    await concerts.removeConcert(c.id, owner.id);
    check((await concerts.countOwnConcertsForArtist(owner.id, art.id)) === 3, "quitar uno");
    await db.delete(appUser).where(eq(appUser.id, owner.id));
    const [byOwner] = await db.select({ n: sql<number>`count(*)::int` }).from(concertEntry).where(eq(concertEntry.userId, owner.id));
    check(byOwner?.n === 0, "borrar la cuenta borra sus conciertos");
    await db.delete(artist).where(eq(artist.id, art.id));
    const [byArtist] = await db.select({ n: sql<number>`count(*)::int` }).from(concertEntry).where(eq(concertEntry.artistId, art.id));
    check(byArtist?.n === 0, "borrar el artista borra los registros que lo referencian");

    console.log("\nSmoke test de Mis conciertos: OK");
  } finally {
    await db.delete(appUser).where(like(appUser.username, "smoke_concert_%"));
    await db.delete(artist).where(eq(artist.mbid, ARTIST_MBID));
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
