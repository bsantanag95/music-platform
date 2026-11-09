export {};

// Smoke test de add-year-in-discs-phase1 contra Postgres REAL (el SQL que las pruebas unitarias mockean): `CHECK` de la migración 0087, meses contados en la
// zona horaria (una escucha de fin de mes), orden por mes, cifras (disco nuevo, artista descubierto y no descubierto), escuchas de canciones y artistas que
// cuentan en las cifras y no en el calendario, visibilidad con y sin la marca (anónimo, seguidora, perfil privado, bloqueo), la zona guardada en la marca,
// objetivo de compartir, gesto y dejar de compartir, exportación, eventos con la cuenta y la lectura bajo 100 ms con 1.000 escuchas en el año.
// Crea artistas, discos y una canción sintéticos (MBID `5e0ce000-0000-4000-8000-00000000f0*`) y usuarios `smoke_year_*`, y los borra al terminar (también si
// falla). Si se interrumpió, limpiar con
//   DELETE FROM app_user WHERE username LIKE 'smoke_year_%';
//   DELETE FROM release_group WHERE mbid::text LIKE '5e0ce000-0000-4000-8000-00000000f0%';
//   DELETE FROM recording WHERE mbid::text LIKE '5e0ce000-0000-4000-8000-00000000f0%';
//   DELETE FROM artist WHERE mbid::text LIKE '5e0ce000-0000-4000-8000-00000000f0%';
// (el `ON DELETE CASCADE` limpia escuchas, marcas y eventos de la cuenta). Necesita las migraciones 0079 a 0087.
// Correr contra una BD de scratch:
//   ALLOW_SMOKE_ON_REAL_DB=1 npx tsx --env-file=.env scripts/smoke-test-year-laminas.ts

import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { and, eq, like, sql } from "drizzle-orm";
import { assertSmokeAllowed } from "./assert-smoke-allowed";
import { db } from "../src/db";
import { appUser, artist, credit, listenEntry, recording, releaseGroup, shareEvent, userBlock, userFollow, yearShare } from "../src/db/schema";

assertSmokeAllowed();

const suffix = randomUUID().slice(0, 8);
const PREFIX = "5e0ce000-0000-4000-8000-00000000f0";
const mbid = (n: number) => `${PREFIX}${n.toString(16).padStart(2, "0")}`;
const SANTIAGO = "America/Santiago";
const READ_BUDGET_MS = 100;

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

async function loadServices() {
  const req = createRequire(import.meta.url);
  const nodeModule = req("node:module") as { _load: (request: string, parent: object | null, isMain: boolean) => unknown };
  const originalLoad = nodeModule._load;
  nodeModule._load = function (request, parent, isMain) {
    if (request === "next/headers") {
      return { cookies: async () => ({ get: () => undefined }), headers: async () => new Headers(), draftMode: async () => ({ isEnabled: false }) };
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  const [year, target, own, lifecycle, dataExport] = await Promise.all([
    import("../src/services/laminas/year"),
    import("../src/services/share/targets/year"),
    import("../src/services/share/own"),
    import("../src/services/auth/account-lifecycle"),
    import("../src/services/profiles/data-export"),
  ]);
  return { year, target, own, lifecycle, dataExport };
}

const newUser = (label: string, profileVisibility: "public" | "private" = "public") => ({
  id: randomUUID(),
  username: `smoke_year_${label}_${suffix}`,
  email: `smoke_year_${label}_${suffix}@example.test`,
  profileVisibility,
});

type Listen = { target: { releaseGroupId?: string; recordingId?: string; artistId?: string }; at: string; context?: "first_listen" | "relisten" | "rediscovery" };

async function listen(userId: string, listens: Listen[]) {
  await db.insert(listenEntry).values(
    listens.map((entry) => ({
      userId,
      ...entry.target,
      listenContext: entry.context ?? "relisten",
      audience: "private",
      createdAt: new Date(entry.at),
    })),
  );
}

async function main() {
  const s = await loadServices();
  const owner = newUser("owner");
  const follower = newUser("follower");
  const stranger = newUser("stranger");

  try {
    await db.insert(appUser).values([owner, follower, stranger]);
    await db.insert(userFollow).values({ followerId: follower.id, followedId: owner.id, status: "accepted" });
    const [known, fresh, solo] = await db
      .insert(artist)
      .values([
        { mbid: mbid(0x00), type: "group", name: `Smoke Year Conocido ${suffix}` },
        { mbid: mbid(0x01), type: "group", name: `Smoke Year Nuevo ${suffix}` },
        { mbid: mbid(0x02), type: "person", name: `Smoke Year Solista ${suffix}` },
      ])
      .returning();
    const discs = await db
      .insert(releaseGroup)
      .values(["A", "B", "C", "D", "E"].map((letter, n) => ({ mbid: mbid(0x10 + n), title: `Smoke Year ${letter}`, category: "studio", primaryType: "Album", secondaryTypes: [] })))
      .returning();
    const [A, B, C, D, E] = discs as [typeof discs[0], typeof discs[0], typeof discs[0], typeof discs[0], typeof discs[0]];
    // A, B y C son del artista nuevo; D y E, del conocido (que ya se escuchó en 2025).
    await db.insert(credit).values([
      ...[A, B, C].map((disc) => ({ artistId: fresh!.id, releaseGroupId: disc.id, role: "primary", position: 0 })),
      ...[D, E].map((disc) => ({ artistId: known!.id, releaseGroupId: disc.id, role: "primary", position: 0 })),
    ]);
    const [song] = await db.insert(recording).values({ mbid: mbid(0x20), title: `Smoke Year Canción ${suffix}` }).returning();

    console.log("Migración 0087");
    check((await codeOf(() => db.insert(yearShare).values({ userId: owner.id, year: 1999, timeZone: "UTC" }))) === "23514", "un año fuera de rango se rechaza");
    check((await codeOf(() => db.insert(yearShare).values({ userId: owner.id, year: 2026, timeZone: "" }))) === "23514", "una zona vacía también");

    await listen(owner.id, [
      { target: { releaseGroupId: D.id }, at: "2025-06-10T15:00:00Z" },
      { target: { releaseGroupId: A.id }, at: "2026-03-05T15:00:00Z", context: "first_listen" },
      { target: { releaseGroupId: A.id }, at: "2026-03-20T15:00:00Z" },
      { target: { releaseGroupId: B.id }, at: "2026-03-02T15:00:00Z" },
      // 22:00 del 31 de marzo en Santiago: 1 de abril en UTC.
      { target: { releaseGroupId: C.id }, at: "2026-04-01T01:00:00Z" },
      { target: { releaseGroupId: E.id }, at: "2026-07-01T15:00:00Z" },
      { target: { recordingId: song!.id }, at: "2026-08-01T15:00:00Z" },
      { target: { artistId: solo!.id }, at: "2026-09-01T15:00:00Z" },
    ]);

    console.log("Meses y cifras");
    const ids = (month: { discs: { id: string }[] }) => month.discs.map((disc) => disc.id);
    const santiago = await s.year.readYearInDiscs(owner.id, 2026, SANTIAGO);
    check(santiago !== null && santiago.months.length === 12, "el año tiene doce meses");
    check(JSON.stringify(ids(santiago!.months[2]!)) === JSON.stringify([A.id, B.id, C.id]), "marzo, por escuchas y después por la primera: A (2), B, C (fin de mes en Santiago)");
    check(santiago!.months[3]!.discs.length === 0, "en Santiago, abril queda vacío");
    const utc = await s.year.readYearInDiscs(owner.id, 2026, "UTC");
    check(ids(utc!.months[3]!).includes(C.id) && !ids(utc!.months[2]!).includes(C.id), "en UTC, ese disco cae en abril");
    check(santiago!.months[7]!.discs.length === 0 && santiago!.months[8]!.discs.length === 0, "una canción o un artista no entran en el calendario");
    check(
      JSON.stringify(santiago!.stats) === JSON.stringify({ listens: 7, discs: 4, newDiscs: 1, artistsDiscovered: 1 }),
      "cifras: 7 escuchas, 4 discos, 1 disco nuevo y 1 artista descubierto (el ya escuchado en 2025 no)",
    );
    check(santiago!.topDiscs[0]!.id === A.id && santiago!.topDiscs.length === 4, "el más escuchado del año va primero");
    check((await s.year.readYearInDiscs(owner.id, 2019, SANTIAGO)) === null, "un año sin escuchas no existe");
    check(JSON.stringify(await s.year.listYearsWithListens(owner.id, SANTIAGO)) === JSON.stringify([2026, 2025]), "tus años, del más reciente");

    console.log("Visibilidad y marca");
    check((await s.year.getYearInDiscs(owner.username, 2026, owner.id, SANTIAGO))?.isOwner === true, "el dueño lo ve sin marca");
    check((await s.year.getYearInDiscs(owner.username, 2026, follower.id, SANTIAGO)) === null, "sin marca, una seguidora no");
    check((await s.target.loadYearTarget(s.target.yearRef(owner.id, 2026), "es")) === null, "sin marca, no hay objetivo anónimo");
    const state = await s.own.ownShareState("year", s.target.yearRef(owner.id, 2026), "es", owner.id);
    check(state.state === "needs_gesture" && !state.canUnshare && state.payload.images[0]!.format === "link", "la hoja pide el gesto, con Enlace");
    await s.year.markYearShared(owner.id, 2026, SANTIAGO);
    const shared = await s.year.getYearInDiscs(owner.username, 2026, null, "UTC");
    check(shared !== null && shared.timeZone === SANTIAGO && ids(shared.months[2]!).includes(C.id), "con marca, un anónimo lo ve en la zona guardada, no en la suya");
    const sharedTarget = await s.target.loadYearTarget(s.target.yearRef(owner.id, 2026), "es");
    check(sharedTarget?.card.meta[0] === "7 escuchas" && sharedTarget.card.media.type === "mosaic", "la imagen lleva las cifras y las carátulas");
    check(!JSON.stringify(sharedTarget).includes("relisten") && !JSON.stringify(shared).includes("reaction"), "sin datos de las escuchas");
    const entries = await db.select({ audience: listenEntry.audience }).from(listenEntry).where(eq(listenEntry.userId, owner.id));
    check(entries.every((entry) => entry.audience === "private"), "la marca no cambia la audiencia de ninguna escucha");
    check((await s.year.getYearInDiscs(owner.username, 2025, null, "UTC")) === null, "la marca es por año: 2025 sigue cerrado");
    await db.insert(userBlock).values({ blockerId: owner.id, blockedId: stranger.id });
    check((await s.year.getYearInDiscs(owner.username, 2026, stranger.id, "UTC")) === null, "con un bloqueo, no");
    await db.update(appUser).set({ profileVisibility: "private" }).where(eq(appUser.id, owner.id));
    check((await s.year.getYearInDiscs(owner.username, 2026, null, "UTC")) === null, "perfil privado: un anónimo no");
    check((await s.year.getYearInDiscs(owner.username, 2026, follower.id, "UTC")) !== null, "su seguidora sí");
    await db.update(appUser).set({ profileVisibility: "public" }).where(eq(appUser.id, owner.id));

    console.log("Gesto y dejar de compartir");
    const ref25 = s.target.yearRef(owner.id, 2025);
    await s.own.makeOwnPublic("year", ref25, "es", owner.id);
    const [mark] = await db.select().from(yearShare).where(and(eq(yearShare.userId, owner.id), eq(yearShare.year, 2025)));
    check(mark?.timeZone === "UTC", "el gesto guarda la zona del pedido (UTC sin cookie)");
    check((await s.own.ownShareState("year", ref25, "es", owner.id)).canUnshare, "y se puede dejar de compartir");
    await s.own.stopSharing("year", ref25, "es", owner.id);
    check((await s.year.getYearInDiscs(owner.username, 2025, null, "UTC")) === null, "dejar de compartir lo cierra");
    check((await codeOf(() => s.own.ownShareState("year", s.target.yearRef(owner.id, 2019), "es", owner.id))) === "YEAR_NOT_FOUND", "un año sin escuchas no se comparte");
    check((await codeOf(() => s.own.ownShareState("year", s.target.yearRef(owner.id, 2026), "es", follower.id))) === "YEAR_NOT_FOUND", "lo ajeno tampoco");

    console.log("Rendimiento");
    const perf = newUser("perf");
    await db.insert(appUser).values(perf);
    await listen(
      perf.id,
      Array.from({ length: 1000 }, (_, n) => ({
        target: { releaseGroupId: discs[n % discs.length]!.id },
        at: new Date(Date.UTC(2026, n % 12, 1 + (n % 27), 12)).toISOString(),
      })),
    );
    await s.year.readYearInDiscs(perf.id, 2026, SANTIAGO);
    const started = performance.now();
    const big = await s.year.readYearInDiscs(perf.id, 2026, SANTIAGO);
    const elapsed = performance.now() - started;
    check(big?.stats.listens === 1000, "las 1.000 escuchas cuentan");
    check(elapsed < READ_BUDGET_MS, `la lectura del año tarda ${elapsed.toFixed(1)} ms (< ${READ_BUDGET_MS})`);

    console.log("Exportación, eventos y borrado");
    const exported = await s.dataExport.buildDataExport(owner.id);
    check((exported.sharedYears as Array<{ year: number }>).some((row) => row.year === 2026), "la exportación trae los años compartidos");
    await db.insert(shareEvent).values({ targetKind: "year", targetRef: s.target.yearRef(owner.id, 2026), channel: "copy", format: "link" });
    const removed = await db.delete(shareEvent).where(s.lifecycle.ownShareEvents(owner.id)).returning();
    check(removed.length === 1, "el evento de un año es de la cuenta");
    await db.delete(appUser).where(eq(appUser.id, owner.id));
    const marks = await db.select({ n: sql<number>`count(*)::int` }).from(yearShare).where(eq(yearShare.userId, owner.id));
    check(marks[0]?.n === 0, "borrar la cuenta borra sus marcas");

    console.log("\nSmoke test de Tu año en discos: OK");
  } finally {
    await db.delete(appUser).where(like(appUser.username, "smoke_year_%"));
    await db.delete(releaseGroup).where(like(sql`${releaseGroup.mbid}::text`, `${PREFIX}%`));
    await db.delete(recording).where(like(sql`${recording.mbid}::text`, `${PREFIX}%`));
    await db.delete(artist).where(like(sql`${artist.mbid}::text`, `${PREFIX}%`));
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
