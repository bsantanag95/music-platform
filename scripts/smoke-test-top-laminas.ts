export {};

// Smoke test de add-top-n-lamina-phase1 contra Postgres REAL (el SQL que las pruebas unitarias mockean): `CHECK` de la
// migración 0083, tope con concurrencia, orden, que una Lámina no aparece en las superficies de listas, notas por
// visitante, moderación, feed, objetivo, gesto de hacer pública y eventos con la cuenta.
// Crea un artista y once álbumes sintéticos (MBID `5e0ce000-0000-4000-8000-00000000c0c*`) y usuarios `smoke_lam_*`, y los
// borra al terminar (también si falla). Si se interrumpió, limpiar con
//   DELETE FROM app_user WHERE username LIKE 'smoke_lam_%';
//   DELETE FROM release_group WHERE mbid::text LIKE '5e0ce000-0000-4000-8000-00000000c0c%';
//   DELETE FROM artist WHERE mbid::text LIKE '5e0ce000-0000-4000-8000-00000000c0c%';
// (el `ON DELETE CASCADE` limpia lo demás). Necesita las migraciones 0079 a 0083.
// Desde add-top-n-lamina-phase2 también verifica las fuentes (orden, filtros, zona del año de escucha, lista ajena, lote
// atómico, nace privada) y mide las lecturas con 2.000 valoraciones de discos y 2.000 de canciones. Para eso crea discos,
// ediciones y canciones con MBID `5e0ce000-0000-4000-8000-0000000c1*`; limpiar además con
//   DELETE FROM release_group WHERE mbid::text LIKE '5e0ce000-0000-4000-8000-0000000c1%';
//   DELETE FROM recording WHERE mbid::text LIKE '5e0ce000-0000-4000-8000-0000000c1%';
//   DELETE FROM artist WHERE mbid::text LIKE '5e0ce000-0000-4000-8000-0000000c1%';
// Correr contra una BD de scratch:
//   ALLOW_SMOKE_ON_REAL_DB=1 npx tsx --env-file=.env scripts/smoke-test-top-laminas.ts

import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { eq, like, sql } from "drizzle-orm";
import { assertSmokeAllowed } from "./assert-smoke-allowed";
import { db } from "../src/db";
import {
  appUser,
  artist,
  credit,
  favorite,
  listenEntry,
  rating,
  recording,
  release,
  releaseGroup,
  releaseGroupGenreSeed,
  shareEvent,
  track,
  userBlock,
  userFollow,
  userList,
  userListItem,
} from "../src/db/schema";

assertSmokeAllowed();

const suffix = randomUUID().slice(0, 8);
const ARTIST_MBID = "5e0ce000-0000-4000-8000-00000000c0c0";
const sourceMbid = (n: number) => `5e0ce000-0000-4000-8000-0000000c1${n.toString(16).padStart(3, "0")}`;
const SOURCE_MBID_PREFIX = "5e0ce000-0000-4000-8000-0000000c1%";
const PERF_ROWS = 2000;
const PERF_BUDGET_MS = 150;
const albumMbid = (n: number) => `5e0ce000-0000-4000-8000-00000000c0c${n.toString(16)}`.padEnd(36, "0").slice(0, 36);

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
  const nodeModule = req("node:module") as {
    _load: (request: string, parent: object | null, isMain: boolean) => unknown;
  };
  const originalLoad = nodeModule._load;
  nodeModule._load = function (request, parent, isMain) {
    if (request === "next/headers") {
      return {
        cookies: async () => ({ get: () => undefined }),
        headers: async () => new Headers(),
        draftMode: async () => ({ isEnabled: false }),
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  const [laminas, sources, lists, social, feed, target, own, lifecycle] = await Promise.all([
    import("../src/services/laminas/laminas"),
    import("../src/services/laminas/sources"),
    import("../src/services/lists/lists"),
    import("../src/services/social"),
    import("../src/services/feed/feed"),
    import("../src/services/share/targets/lamina"),
    import("../src/services/share/own"),
    import("../src/services/auth/account-lifecycle"),
  ]);
  return { laminas, sources, lists, social, feed, target, own, lifecycle };
}

type Services = Awaited<ReturnType<typeof loadServices>>;

/** Un género con un subgénero, de la taxonomía cargada. */
async function genrePair(): Promise<{ parentId: string; parentSlug: string; childId: string; childSlug: string }> {
  const rows = await db.execute<{ parent_id: string; parent_slug: string; child_id: string; child_slug: string }>(sql`
    SELECT p.id AS parent_id, p.slug AS parent_slug, c.id AS child_id, c.slug AS child_slug
    FROM genre_relation r
    JOIN genre c ON c.id = r.genre_id AND c.kind = 'style'
    JOIN genre p ON p.id = r.related_genre_id AND p.kind = 'style'
    WHERE r.kind = 'subgenre_of'
    ORDER BY p.slug, c.slug
    LIMIT 1`);
  const row = rows[0];
  if (!row) throw new Error("la taxonomía de géneros no está cargada");
  return { parentId: row.parent_id, parentSlug: row.parent_slug, childId: row.child_id, childSlug: row.child_slug };
}

async function checkSources(s: Services) {
  const person = newUser("src");
  const stranger = newUser("stranger");
  await db.insert(appUser).values([{ ...person, defaultAudience: "public" }, stranger]);
  const genres = await genrePair();
  const [mainArtist, guest] = await db
    .insert(artist)
    .values([
      { mbid: sourceMbid(0xf00), type: "group", name: `Smoke Fuente ${suffix}` },
      { mbid: sourceMbid(0xf01), type: "group", name: `Smoke Invitado ${suffix}` },
    ])
    .returning();
  const years = [1979, 1984, 1985, 2026, 2026, 1990, 1991, 1992];
  const discs = await db
    .insert(releaseGroup)
    .values(years.map((year, n) => ({ mbid: sourceMbid(0xf10 + n), title: `Smoke Fuente ${n + 1} ${suffix}`, category: "studio", firstReleaseYear: year })))
    .returning();
  const [a1, a2, a3, a4, a5, a6, a7, a8] = discs as [typeof discs[0], typeof discs[0], typeof discs[0], typeof discs[0], typeof discs[0], typeof discs[0], typeof discs[0], typeof discs[0]];
  await db.insert(credit).values(discs.map((disc) => ({ artistId: mainArtist!.id, releaseGroupId: disc.id, role: "primary", position: 0 })));
  await db.insert(credit).values({ artistId: guest!.id, releaseGroupId: a5.id, role: "primary", position: 1 });
  await db.insert(releaseGroupGenreSeed).values({ releaseGroupId: a4.id, genreId: genres.childId, position: 0 });
  const [edition] = await db.insert(release).values({ mbid: sourceMbid(0xf20), releaseGroupId: a4.id, isRepresentative: true }).returning();
  const [song] = await db.insert(recording).values({ mbid: sourceMbid(0xf21), title: `Smoke Canción ${suffix}` }).returning();
  await db.insert(track).values({ releaseId: edition!.id, recordingId: song!.id, position: 1 });
  await db.insert(credit).values({ artistId: mainArtist!.id, recordingId: song!.id, role: "primary", position: 0 });

  const rate = async (id: string, stars: number, detailed?: number) =>
    s.social.upsertRating(await s.social.resolveSocialTarget("release-group", id), person.id, stars, detailed);
  await rate(a1.id, 4.5, 86);
  await rate(a2.id, 4.5, 90);
  await rate(a3.id, 3);
  await rate(a4.id, 4);
  await rate(a5.id, 4.5);
  await db.insert(rating).values({ userId: person.id, recordingId: song!.id, stars: "4.0" });

  const ids = (rows: { target: { id: string } }[]) => rows.map((row) => row.target.id);
  const same = (rows: { target: { id: string } }[], expected: { id: string }[]) => JSON.stringify(ids(rows)) === JSON.stringify(expected.map((row) => row.id));
  const albums = (extra: object = {}) => s.sources.listLaminaCandidates(person.id, { source: "ratings", entityType: "release-group", ...extra });

  console.log("Fuente: valoraciones");
  check(same(await albums(), [a2, a1, a5, a4, a3]), "de mejor a peor, con la detallada como desempate");
  const first = (await albums())[0]!;
  check(first.score?.detailedScore === 90 && first.target.artistName === mainArtist!.name, "cada candidato trae su nota y su artista");
  check(same(await albums({ decade: 1980 }), [a2, a3]), "filtra por década");
  check(same(await albums({ year: 2026 }), [a5, a4]), "filtra por año");
  check(same(await albums({ artist: guest!.id }), [a5]), "un artista coincide con un crédito principal, aunque sea el segundo");
  check(same(await albums({ genre: genres.parentSlug }), [a4]), "un género incluye sus subgéneros");
  check((await albums({ genre: "no-existe" })).length === 0, "un género desconocido no trae nada");
  check(same(await albums({ decade: 2020, artist: mainArtist!.id }), [a5, a4]), "los filtros se combinan");
  check((await codeOf(() => albums({ year: 2026, decade: 2020 }))) === "VALIDATION_ERROR", "año y década no van juntos");
  check((await codeOf(() => albums({ list: a1.id }))) === "VALIDATION_ERROR", "una lista no aplica a las valoraciones");

  console.log("Año de escucha");
  const listen = { userId: person.id, listenContext: "first_listen", audience: "private" };
  await db.insert(listenEntry).values([
    { ...listen, releaseGroupId: a1.id, createdAt: new Date("2026-01-01T02:00:00Z") },
    { ...listen, recordingId: song!.id, createdAt: new Date("2026-06-01T12:00:00Z") },
  ]);
  const santiago = { timeZone: "America/Santiago" };
  check(same(await albums({ listenYear: 2025, ...santiago }), [a1]), "las 23:00 del 31/12 en Santiago cuentan para 2025");
  check((await albums({ listenYear: 2026, ...santiago })).length === 0, "y no para 2026");
  check(same(await albums({ listenYear: 2026 }), [a1]), "en UTC son 2026");
  check(!ids(await albums({ listenYear: 2026, ...santiago })).includes(a4.id), "la escucha de una canción no cuenta para su álbum");

  console.log("Canciones");
  const songs = (extra: object = {}) => s.sources.listLaminaCandidates(person.id, { source: "ratings", entityType: "recording", ...extra });
  check(same(await songs(), [song!]), "solo las canciones valoradas");
  check(same(await songs({ year: 2026 }), [song!]) && (await songs({ year: 1999 })).length === 0, "el año es el de su disco");
  check(same(await songs({ genre: genres.parentSlug }), [song!]), "el género es el de su disco");
  check(same(await songs({ artist: mainArtist!.id }), [song!]), "el artista es el de su crédito");
  check(same(await songs({ listenYear: 2026 }), [song!]), "su escucha sí cuenta");

  console.log("Fuente: favoritos");
  await db.insert(favorite).values([
    { userId: person.id, releaseGroupId: a3.id, audience: "private" },
    { userId: person.id, releaseGroupId: a2.id, audience: "private" },
    { userId: person.id, releaseGroupId: a6.id, audience: "private", createdAt: new Date("2026-01-01T00:00:00Z") },
    { userId: person.id, releaseGroupId: a7.id, audience: "private", createdAt: new Date("2026-02-01T00:00:00Z") },
  ]);
  const favorites = (extra: object = {}) => s.sources.listLaminaCandidates(person.id, { source: "favorites", entityType: "release-group", ...extra });
  check(same(await favorites(), [a2, a3, a7, a6]), "primero por la nota, después lo más reciente");
  check(same(await favorites({ decade: 1990 }), [a7, a6]), "también se filtran");

  console.log("Fuente: lista");
  const list = await s.lists.createList({ ownerId: person.id, entityType: "release-group", title: `Smoke lista ${suffix}` });
  await s.lists.addItemToList(list.id, person.id, { type: "release-group", id: a8.id });
  await s.lists.addItemToList(list.id, person.id, { type: "release-group", id: a1.id });
  const fromList = (userId: string, entityType: "release-group" | "recording" = "release-group", extra: object = {}) =>
    s.sources.listLaminaCandidates(userId, { source: "list", entityType, list: list.id, ...extra });
  check(same(await fromList(person.id), [a8, a1]), "respeta su orden");
  check((await codeOf(() => fromList(stranger.id))) === "LIST_NOT_FOUND", "la lista de otra persona responde 404");
  check((await codeOf(() => fromList(person.id, "recording"))) === "VALIDATION_ERROR", "una lista de otro tipo se rechaza");
  check((await codeOf(() => fromList(person.id, "release-group", { year: 2026 }))) === "VALIDATION_ERROR", "una lista no se filtra");

  console.log("Opciones");
  const options = await s.sources.listLaminaSourceOptions(person.id, { source: "ratings", entityType: "release-group", ...santiago });
  check(options.years.join() === "2026,1985,1984,1979" && options.decades.join() === "2020,1980,1970", "años y décadas de la fuente, sin los ajenos");
  check(options.listenYears.join() === "2025", "años de escucha en la zona de la persona, y solo de la fuente");
  const genreSlugs = options.genres.map((genre) => genre.slug);
  check(genreSlugs.includes(genres.parentSlug) && genreSlugs.includes(genres.childSlug), "el género con sus ancestros");
  check(options.artists[0]?.id === mainArtist!.id && options.artists[0]?.itemCount === 5 && options.artists[1]?.id === guest!.id, "artistas por presencia");
  const songOptions = await s.sources.listLaminaSourceOptions(person.id, { source: "ratings", entityType: "recording" });
  check(songOptions.years.join() === "2026" && songOptions.genres.some((genre) => genre.slug === genres.parentSlug), "las de canciones salen de sus discos");
  const listOptions = await s.sources.listLaminaSourceOptions(person.id, { source: "list", entityType: "release-group" });
  check(listOptions.lists.length === 1 && listOptions.lists[0]?.itemCount === 2, "solo listas propias del tipo y con ítems");
  check((await s.sources.listLaminaSourceOptions(person.id, { source: "list", entityType: "recording" })).lists.length === 0, "sin listas de canciones");
  check((await s.sources.listLaminaSourceOptions(stranger.id, { source: "list", entityType: "release-group" })).lists.length === 0, "ni las de otra persona");

  console.log("Alta y lote");
  const params = { title: "Desde una fuente", format: "top5" as const, entityType: "release-group" as const };
  const built = await s.laminas.createLamina(person.id, { ...params, targetIds: [a2.id, a1.id, a2.id] });
  check(built.audience === "private", "nace privada aunque el defecto sea público");
  check(built.showScores === false, "las notas siguen apagadas");
  check(same(built.items, [a2, a1]), "guarda el orden y omite repetidos");
  check((await s.laminas.createLamina(person.id, params)).audience === "public", "a mano sigue el defecto");
  check((await codeOf(() => s.laminas.createLamina(person.id, { ...params, audience: "public", targetIds: [a1.id] }))) === "VALIDATION_ERROR", "una fuente no admite audiencia");
  check((await codeOf(() => s.laminas.createLamina(person.id, { ...params, targetIds: discs.slice(0, 6).map((d) => d.id) }))) === "VALIDATION_ERROR", "no pasa del tope");
  const before = (await s.laminas.listMyLaminas(person.id)).length;
  check((await codeOf(() => s.laminas.createLamina(person.id, { ...params, targetIds: [a1.id, randomUUID()] }))) !== null, "un objetivo inexistente se rechaza");
  check((await s.laminas.listMyLaminas(person.id)).length === before, "y no deja una Lámina a medias");

  await rate(a2.id, 1);
  check(same((await s.laminas.getOwnedLamina(built.id, person.id)).items, [a2, a1]), "una Lámina no cambia si cambia la fuente");

  const completed = await s.laminas.addLaminaItems(built.id, person.id, [a1.id, a3.id, a4.id]);
  check(same(completed.items, [a2, a1, a3, a4]), "completar agrega al final y omite lo que ya está");
  check((await codeOf(() => s.laminas.addLaminaItems(built.id, person.id, [a5.id, a6.id]))) === "VALIDATION_ERROR", "un lote que no entra se rechaza");
  check((await s.laminas.getOwnedLamina(built.id, person.id)).items.length === 4, "y no agrega ninguno");
  const racing = await s.laminas.createLamina(person.id, { ...params, targetIds: [a1.id] });
  const race = await Promise.allSettled([
    s.laminas.addLaminaItems(racing.id, person.id, [a2.id, a3.id, a4.id]),
    s.laminas.addLaminaItems(racing.id, person.id, [a5.id, a6.id, a7.id]),
  ]);
  const raced = await s.laminas.getOwnedLamina(racing.id, person.id);
  check(raced.items.length === 4 && race.filter((r) => r.status === "rejected").length === 1, "dos lotes en paralelo no pasan del tope");
  await s.laminas.updateLamina(built.id, person.id, { audience: "public" });
  check((await s.laminas.addLaminaItems(built.id, person.id, [a5.id])).audience === "public", "completar no cambia la audiencia");
}

async function checkInspiration(s: Services) {
  console.log("Arma la tuya");
  const author = newUser("insp");
  const visitor = newUser("visit");
  const blocked = newUser("blocked");
  await db.insert(appUser).values([author, visitor, blocked]);
  await db.insert(userBlock).values({ blockerId: author.id, blockedId: blocked.id });
  const params = { title: "Mi año", format: "top10" as const, entityType: "recording" as const };
  const lamina = await s.laminas.createLamina(author.id, { ...params, audience: "public" });

  const read = await s.laminas.getLaminaInspiration(lamina.id, visitor.id);
  check(read?.format === "top10" && read.entityType === "recording" && read.title === "Mi año" && read.ownerUsername === author.username, "hereda formato, tipo y título");
  check(!("items" in (read ?? {})), "sin ítems");
  check((await s.laminas.getLaminaInspiration(lamina.id, author.id)) === null, "la propia no inspira");
  check((await s.laminas.getLaminaInspiration(randomUUID(), visitor.id)) === null, "una inexistente no falla");
  check((await s.laminas.getLaminaInspiration(lamina.id, blocked.id)) === null, "un bloqueo la oculta");

  await s.laminas.updateLamina(lamina.id, author.id, { audience: "followers" });
  check((await s.laminas.getLaminaInspiration(lamina.id, visitor.id)) === null, "para seguidores, quien no sigue no hereda");
  await db.insert(userFollow).values({ followerId: visitor.id, followedId: author.id, status: "accepted" });
  check((await s.laminas.getLaminaInspiration(lamina.id, visitor.id)) !== null, "un seguidor sí");
  await s.laminas.updateLamina(lamina.id, author.id, { audience: "private" });
  check((await s.laminas.getLaminaInspiration(lamina.id, visitor.id)) === null, "privada, nadie");
  await s.laminas.updateLamina(lamina.id, author.id, { audience: "public" });
  await db.update(userList).set({ moderationStatus: "hidden" }).where(eq(userList.id, lamina.id));
  check((await s.laminas.getLaminaInspiration(lamina.id, visitor.id)) === null, "oculta por moderación, nadie");
  await db.update(userList).set({ moderationStatus: "visible", kind: "standard", laminaFormat: null }).where(eq(userList.id, lamina.id));
  check((await s.laminas.getLaminaInspiration(lamina.id, visitor.id)) === null, "una lista común no inspira");
}

async function measure(label: string, read: () => Promise<unknown>) {
  await read();
  const times: number[] = [];
  for (let run = 0; run < 5; run += 1) {
    const start = performance.now();
    await read();
    times.push(performance.now() - start);
  }
  const median = [...times].sort((a, b) => a - b)[2]!;
  check(median < PERF_BUDGET_MS, `${label}: ${median.toFixed(1)} ms`);
}

async function checkSourcePerformance(s: Services) {
  console.log(`Tiempos con ${PERF_ROWS} valoraciones de discos y ${PERF_ROWS} de canciones`);
  const person = newUser("perf");
  await db.insert(appUser).values(person);
  const genres = await genrePair();
  const [art] = await db.insert(artist).values({ mbid: sourceMbid(0xf02), type: "group", name: `Smoke Tiempos ${suffix}` }).returning();
  const batches = Array.from({ length: PERF_ROWS / 500 }, (_, batch) => Array.from({ length: 500 }, (__, n) => batch * 500 + n));
  for (const batch of batches) {
    const discs = await db
      .insert(releaseGroup)
      .values(batch.map((n) => ({ title: `Smoke Tiempos ${n}`, category: "studio", firstReleaseYear: 1960 + (n % 60), mbid: sourceMbid(n) })))
      .returning({ id: releaseGroup.id });
    const songs = await db.insert(recording).values(batch.map((n) => ({ title: `Smoke Tiempos ${n}` }))).returning({ id: recording.id });
    const editions = await db.insert(release).values(discs.map((disc) => ({ releaseGroupId: disc.id, isRepresentative: true }))).returning({ id: release.id });
    await db.insert(track).values(songs.map((song, n) => ({ releaseId: editions[n]!.id, recordingId: song.id, position: 1 })));
    await db.insert(credit).values(discs.map((disc) => ({ artistId: art!.id, releaseGroupId: disc.id, role: "primary", position: 0 })));
    await db.insert(releaseGroupGenreSeed).values(discs.map((disc) => ({ releaseGroupId: disc.id, genreId: genres.childId, position: 0 })));
    await db.insert(rating).values(discs.map((disc, n) => ({ userId: person.id, releaseGroupId: disc.id, stars: String(1 + (n % 9) / 2) })));
    await db.insert(rating).values(songs.map((song, n) => ({ userId: person.id, recordingId: song.id, stars: String(1 + (n % 9) / 2) })));
    await db.insert(listenEntry).values(discs.map((disc) => ({ userId: person.id, releaseGroupId: disc.id, listenContext: "first_listen" })));
  }
  const thisYear = new Date().getUTCFullYear();
  const read = (entityType: "release-group" | "recording", extra: object = {}) => () =>
    s.sources.listLaminaCandidates(person.id, { source: "ratings", entityType, ...extra });
  await measure("candidatos de discos", read("release-group"));
  await measure("con década", read("release-group", { decade: 1980 }));
  await measure("con género", read("release-group", { genre: genres.parentSlug }));
  await measure("con año de escucha", read("release-group", { listenYear: thisYear }));
  await measure("con artista", read("release-group", { artist: art!.id }));
  await measure("candidatos de canciones", read("recording"));
  await measure("canciones con año", read("recording", { year: 1990 }));
  await measure("canciones con género", read("recording", { genre: genres.parentSlug }));
  await measure("opciones de discos", () => s.sources.listLaminaSourceOptions(person.id, { source: "ratings", entityType: "release-group" }));
  await measure("opciones de canciones", () => s.sources.listLaminaSourceOptions(person.id, { source: "ratings", entityType: "recording" }));
}

const newUser = (label: string) => ({
  id: randomUUID(),
  username: `smoke_lam_${label}_${suffix}`,
  email: `smoke_lam_${label}_${suffix}@example.test`,
});

async function main() {
  const s = await loadServices();
  const owner = newUser("owner");
  const follower = newUser("follower");

  try {
    await db.insert(appUser).values([owner, follower]);
    await db.insert(userFollow).values({ followerId: follower.id, followedId: owner.id, status: "accepted" });
    const [art] = await db.insert(artist).values({ mbid: ARTIST_MBID, type: "group", name: `Smoke Lámina ${suffix}` }).returning();
    if (!art) throw new Error("no se creó el artista sintético");
    const albums = await db
      .insert(releaseGroup)
      .values(Array.from({ length: 11 }, (_, n) => ({ mbid: albumMbid(n + 1), title: `Smoke Disco ${n + 1} ${suffix}`, category: "studio" })))
      .returning();
    await db.insert(credit).values(albums.map((album) => ({ artistId: art.id, releaseGroupId: album.id, role: "primary", position: 0 })));

    console.log("Migración 0083");
    check((await codeOf(() => db.insert(userList).values({ ownerId: owner.id, entityType: "release-group", title: "x", kind: "top" }))) === "23514", "una Lámina exige formato");
    check((await codeOf(() => db.insert(userList).values({ ownerId: owner.id, entityType: "release-group", title: "x", laminaFormat: "top5" }))) === "23514", "una lista común no lleva formato");
    check((await codeOf(() => db.insert(userList).values({ ownerId: owner.id, entityType: "artist", title: "x", kind: "top", laminaFormat: "top5" }))) === "23514", "una Lámina no es de artistas");

    console.log("Tope y orden");
    const top = await s.laminas.createLamina(owner.id, { title: "Mis discos", format: "top5", entityType: "release-group", audience: "public" });
    check(top.showScores === false, "las notas nacen apagadas");
    const results = await Promise.allSettled(albums.slice(0, 8).map((album) => s.laminas.addLaminaItem(top.id, owner.id, album.id)));
    const after = await s.laminas.getOwnedLamina(top.id, owner.id);
    check(after.items.length === 5 && results.filter((r) => r.status === "rejected").length === 3, "con pedidos en paralelo el tope se respeta");
    const repeated = await s.laminas.addLaminaItem(top.id, owner.id, after.items[0]!.target.id);
    check(repeated.items.length === 5, "un repetido no cambia nada");
    check((await codeOf(() => s.laminas.addLaminaItem(top.id, owner.id, randomUUID()))) !== null, "un disco inexistente se rechaza");
    const reversed = [...after.items].reverse().map((item) => item.id);
    const ordered = await s.laminas.reorderLamina(top.id, owner.id, reversed);
    check(ordered.items[0]!.id === reversed[0], "reordena");
    check((await codeOf(() => s.laminas.reorderLamina(top.id, owner.id, reversed.slice(1)))) === "VALIDATION_ERROR", "el orden debe traer todos los ítems");
    check((await codeOf(() => s.laminas.getOwnedLamina(top.id, follower.id))) === "LAMINA_NOT_FOUND", "lo ajeno responde 404");

    console.log("Fuera de las superficies de listas");
    const mine = await s.lists.listMyLists(owner.id);
    check(!JSON.stringify(mine).includes(top.id), "no aparece en Mis listas");
    check((await codeOf(() => s.lists.getUserListDetail(owner.username, top.id, null))) === "LIST_NOT_FOUND", "no se lee como lista");

    console.log("Notas por visitante");
    const albumTarget = await s.social.resolveSocialTarget("release-group", ordered.items[0]!.target.id);
    await s.social.upsertRating(albumTarget, owner.id, 4.5, 86);
    check((await s.laminas.getUserLamina(owner.username, top.id, null)).items[0]!.score === null, "apagadas, un anónimo no ve la nota");
    check((await s.laminas.getOwnedLamina(top.id, owner.id)).items[0]!.score?.detailedScore === 86, "el dueño la ve para decidir");
    const offTarget = await s.target.loadLaminaTarget(top.id, "es");
    check(offTarget?.card.top?.items[0]?.stars === null && !JSON.stringify(offTarget).includes('"detailedScore":86'), "ni en la imagen");
    await s.laminas.updateLamina(top.id, owner.id, { showScores: true });
    check((await s.laminas.getUserLamina(owner.username, top.id, null)).items[0]!.score?.detailedScore === 86, "encendidas, sí");
    const onTarget = await s.target.loadLaminaTarget(top.id, "es");
    check(onTarget?.card.top?.items[0]?.detailedScore === 86, "y en la imagen");
    check(onTarget?.formats?.[0] === "post", "Top 5 declara Publicación");

    console.log("Formato");
    await s.laminas.updateLamina(top.id, owner.id, { format: "top10" });
    await s.laminas.addLaminaItem(top.id, owner.id, albums[9]!.id);
    await s.laminas.updateLamina(top.id, owner.id, { format: "top5" });
    check((await s.laminas.getOwnedLamina(top.id, owner.id)).items.length === 5, "bajar de formato deja los primeros");

    console.log("Audiencia y moderación");
    await s.laminas.updateLamina(top.id, owner.id, { audience: "followers" });
    check((await codeOf(() => s.laminas.getUserLamina(owner.username, top.id, null))) === "LAMINA_NOT_FOUND", "para seguidores: un anónimo no la ve");
    check((await s.laminas.getUserLamina(owner.username, top.id, follower.id)).id === top.id, "un seguidor sí");
    check((await s.target.loadLaminaTarget(top.id, "es")) === null, "sin objetivo anónimo");
    const state = await s.own.ownShareState("top", top.id, "es", owner.id);
    check(state.state === "needs_gesture" && state.payload.images[0]!.format === "post", "la hoja pide el gesto");
    await s.own.makeOwnPublic("top", top.id, "es", owner.id);
    check((await s.target.loadLaminaTarget(top.id, "es")) !== null, "el gesto la hace pública");
    await db.update(userList).set({ moderationStatus: "hidden" }).where(eq(userList.id, top.id));
    check((await codeOf(() => s.laminas.getUserLamina(owner.username, top.id, null))) === "LAMINA_NOT_FOUND", "oculta: un anónimo no la ve");
    check((await s.laminas.getUserLamina(owner.username, top.id, owner.id)).id === top.id, "su dueño sí");
    await db.update(userList).set({ moderationStatus: "visible" }).where(eq(userList.id, top.id));

    console.log("Feed");
    const feedHas = async (id: string) => JSON.stringify(await s.feed.listFeed(follower.id)).includes(id);
    check(await feedHas(top.id), "una Lámina con ítems entra al feed");
    const empty = await s.laminas.createLamina(owner.id, { title: "Vacía", format: "top5", entityType: "release-group", audience: "public" });
    check(!(await feedHas(empty.id)), "una vacía no");
    const hidden = await s.laminas.createLamina(owner.id, { title: "Privada", format: "top5", entityType: "release-group", audience: "private" });
    await s.laminas.addLaminaItem(hidden.id, owner.id, albums[0]!.id);
    check(!(await feedHas(hidden.id)), "una privada tampoco");

    console.log("Eventos y borrado");
    await db.insert(shareEvent).values({ targetKind: "top", targetRef: top.id, channel: "copy", format: "post" });
    const removed = await db.delete(shareEvent).where(s.lifecycle.ownShareEvents(owner.id)).returning();
    check(removed.length === 1, "el evento de una Lámina es de la cuenta");
    await s.laminas.deleteLamina(top.id, owner.id);
    const orphans = await db.select({ n: sql<number>`count(*)::int` }).from(userListItem).where(eq(userListItem.listId, top.id));
    check(orphans[0]?.n === 0, "borrarla borra sus ítems");

    await checkInspiration(s);
    await checkSources(s);
    await checkSourcePerformance(s);

    console.log("\nSmoke test de las Láminas Top N: OK");
  } finally {
    await db.delete(appUser).where(like(appUser.username, "smoke_lam_%"));
    await db.delete(releaseGroup).where(like(sql`${releaseGroup.mbid}::text`, "5e0ce000-0000-4000-8000-00000000c0c%"));
    await db.delete(releaseGroup).where(like(sql`${releaseGroup.mbid}::text`, SOURCE_MBID_PREFIX));
    await db.delete(recording).where(like(sql`${recording.title}`, "Smoke Tiempos %"));
    await db.delete(recording).where(like(sql`${recording.mbid}::text`, SOURCE_MBID_PREFIX));
    await db.delete(artist).where(eq(artist.mbid, ARTIST_MBID));
    await db.delete(artist).where(like(sql`${artist.mbid}::text`, SOURCE_MBID_PREFIX));
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
