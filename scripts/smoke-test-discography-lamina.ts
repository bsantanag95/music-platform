export {};

// Smoke test de add-discography-lamina-phase1 contra Postgres REAL: visibilidad por visitante, marca por artista, progreso con y
// sin Recorrido, objetivo de imagen, cascadas, eventos y el tiempo de lectura.
// Crea artistas y discos sintéticos (MBID `5e0ce000-0000-4000-8000-00000000d*`) y usuarios `smoke_disc_*`, y los borra al terminar
// (también si falla). Si se interrumpió, limpiar con
//   DELETE FROM app_user WHERE username LIKE 'smoke_disc_%';
//   DELETE FROM release_group WHERE mbid::text LIKE '5e0ce000-0000-4000-8000-00000000d%';
//   DELETE FROM artist WHERE mbid::text LIKE '5e0ce000-0000-4000-8000-00000000d%';
// (el `ON DELETE CASCADE` limpia lo demás). Necesita la migración 0084. Correr contra una BD de scratch:
//   ALLOW_SMOKE_ON_REAL_DB=1 npx tsx --env-file=.env scripts/smoke-test-discography-lamina.ts

import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { and, eq, like, sql } from "drizzle-orm";
import { assertSmokeAllowed } from "./assert-smoke-allowed";
import { db } from "../src/db";
import {
  appUser,
  artist,
  credit,
  discographyShare,
  listenEntry,
  rating,
  recording,
  release,
  releaseGroup,
  shareEvent,
  track,
  userBlock,
  userFollow,
  userList,
  userListItem,
} from "../src/db/schema";

assertSmokeAllowed();

const suffix = randomUUID().slice(0, 8);
const mbid = (n: number) => `5e0ce000-0000-4000-8000-00000000d${n.toString(16).padStart(3, "0")}`;
const PREFIX = "5e0ce000-0000-4000-8000-00000000d%";
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
    return (error as { code?: string }).code ?? "SIN_CODIGO";
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
      return { cookies: async () => ({ get: () => undefined }), headers: async () => new Headers(), draftMode: async () => ({ isEnabled: false }) };
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  const [discography, target, own, lifecycle, social, relation] = await Promise.all([
    import("../src/services/laminas/discography"),
    import("../src/services/share/targets/discography"),
    import("../src/services/share/own"),
    import("../src/services/auth/account-lifecycle"),
    import("../src/services/social"),
    import("../src/services/profiles/relation"),
  ]);
  return { discography, target, own, lifecycle, social, relation };
}

const newUser = (label: string, extra: object = {}) => ({
  id: randomUUID(),
  username: `smoke_disc_${label}_${suffix}`,
  email: `smoke_disc_${label}_${suffix}@example.test`,
  ...extra,
});

async function main() {
  const s = await loadServices();
  const owner = newUser("owner");
  const follower = newUser("follower");
  const stranger = newUser("stranger");
  const blocked = newUser("blocked");
  const hidden = newUser("private", { profileVisibility: "private" });
  const perf = newUser("perf");

  try {
    await db.insert(appUser).values([owner, follower, stranger, blocked, hidden, perf]);
    await db.insert(userFollow).values({ followerId: follower.id, followedId: owner.id, status: "accepted" });
    await db.insert(userBlock).values({ blockerId: owner.id, blockedId: blocked.id });
    const [band, other] = await db
      .insert(artist)
      .values([
        { mbid: mbid(0xf00), type: "group", name: `Smoke Banda ${suffix}` },
        { mbid: mbid(0xf01), type: "group", name: `Smoke Otra ${suffix}` },
      ])
      .returning();
    const years = [1985, 1979, 1990, 1995, 2000];
    const discs = await db
      .insert(releaseGroup)
      .values(years.map((year, n) => ({ mbid: mbid(0xe00 + n), title: `Smoke Disco ${n + 1} ${suffix}`, category: "studio", firstReleaseYear: year })))
      .returning();
    const [single] = await db.insert(releaseGroup).values({ mbid: mbid(0xe10), title: `Smoke Sencillo ${suffix}`, category: "single_ep", firstReleaseYear: 1991 }).returning();
    await db.insert(credit).values([...discs, single!].map((disc) => ({ artistId: band!.id, releaseGroupId: disc.id, role: "primary", position: 0 })));

    const rate = async (userId: string, id: string, stars: number, detailed?: number) =>
      s.social.upsertRating(await s.social.resolveSocialTarget("release-group", id), userId, stars, detailed);
    const read = (viewerId: string | null, username = owner.username) => s.discography.getDiscographyLamina(username, band!.id, viewerId);
    const ref = s.target.discographyRef(owner.id, band!.id);

    console.log("Umbral");
    await rate(owner.id, discs[0]!.id, 4.5, 86);
    await rate(owner.id, discs[1]!.id, 4);
    check((await read(owner.id))?.missing === 1, "con 2 discos, al dueño le falta 1");
    check((await read(follower.id)) === null, "una seguidora no la ve");
    check((await s.target.loadDiscographyTarget(ref, "es", { owner: owner.id })) === null, "todavía no hay imagen");
    await rate(owner.id, single!.id, 5);
    check((await read(owner.id))?.missing === 1, "un sencillo no cuenta: es de otra sección");

    await rate(owner.id, discs[2]!.id, 3);
    console.log("Discos");
    const lamina = await read(owner.id);
    check(lamina?.missing === 0, "con 3 discos existe");
    check(lamina?.discs.map((disc) => disc.year).join() === "1979,1985,1990", "por año");
    check(lamina?.discs[1]?.detailedScore === 86 && lamina.discs[0]?.detailedScore === null && lamina.discs[0]?.stars === 4, "el dato real de cada disco");
    check(lamina?.progress.kind === "rated" && lamina.progress.count === 3, "sin Recorrido, cuántos valoró");

    console.log("Visibilidad sin marca");
    check((await read(follower.id))?.isOwner === false, "una seguidora la ve");
    check((await read(stranger.id)) === null, "quien no sigue, no");
    check((await read(null)) === null, "un anónimo, tampoco");
    check((await s.target.loadDiscographyTarget(ref, "es")) === null, "sin objetivo anónimo");
    check((await s.target.loadDiscographyTarget(ref, "es", { owner: owner.id })) !== null, "su dueño tiene imagen");
    check((await s.target.loadDiscographyTarget(ref, "es", { owner: follower.id })) === null, "nadie más");

    console.log("Gesto");
    const before = await s.own.ownShareState("discography", ref, "es", owner.id);
    check(before.state === "needs_gesture" && before.payload.images[0]?.format === "post", "la hoja pide el gesto");
    check(before.payload.images[0]?.url.includes("personal=1"), "con la imagen privada");
    check((await codeOf(() => s.own.makeOwnPublic("discography", ref, "es", follower.id))) === "DISCOGRAPHY_NOT_FOUND", "solo su dueño");
    const after = await s.own.makeOwnPublic("discography", ref, "es", owner.id);
    check(after.state === "public" && after.canUnshare, "queda pública y se puede quitar");
    await s.own.makeOwnPublic("discography", ref, "es", owner.id);
    const marks = await db.select().from(discographyShare).where(eq(discographyShare.userId, owner.id));
    check(marks.length === 1, "repetir el gesto no duplica");

    console.log("Visibilidad con marca");
    check((await read(null))?.shared === true, "un anónimo la ve");
    check((await read(stranger.id)) !== null, "quien no sigue, también");
    check((await read(blocked.id)) === null, "un bloqueo la oculta");
    check((await s.target.loadDiscographyTarget(ref, "es")) !== null, "hay objetivo anónimo");
    const mark = await s.discography.getDiscographyLamina(owner.username, other!.id, null);
    check(mark === null, "la marca es de ese artista");
    const view = await s.relation.getRelationView(owner.username, "album", discs[0]!.id, null, "es");
    check(view?.rating == null, "no abre la nota en la página de relación");

    console.log("Se mantiene al día");
    const version = await s.target.loadDiscographyTarget(ref, "es");
    await rate(owner.id, discs[3]!.id, 5);
    check((await read(null))?.discs.length === 4, "una nota nueva se ve sin otro gesto");
    const newer = await s.target.loadDiscographyTarget(ref, "es");
    check(JSON.stringify(version) !== JSON.stringify(newer), "y la imagen cambia de versión");

    console.log("Progreso");
    const [journey] = await db
      .insert(userList)
      .values({ ownerId: owner.id, entityType: "release-group", title: "Recorrido", kind: "artist_journey", journeyArtistId: band!.id })
      .returning();
    await db.insert(userListItem).values(discs.slice(0, 4).map((disc, n) => ({ listId: journey!.id, releaseGroupId: disc.id, position: n + 1 })));
    await db.insert(listenEntry).values(discs.slice(0, 2).map((disc) => ({ userId: owner.id, releaseGroupId: disc.id, listenContext: "first_listen", audience: "private" })));
    const progress = (await read(null))?.progress;
    check(progress?.kind === "journey" && progress.percent === 50, "con Recorrido, el avance");
    check(!JSON.stringify(progress).includes("listened"), "sin conteos de escuchas");
    const image = await s.target.loadDiscographyTarget(ref, "es");
    check(image?.card.discography?.progressPercent === 50, "la imagen lleva solo la proporción");
    await db.update(userList).set({ journeyArchivedAt: new Date() }).where(eq(userList.id, journey!.id));
    check((await read(null))?.progress.kind === "rated", "un Recorrido archivado no cuenta");

    console.log("Perfil privado");
    await db.insert(rating).values(discs.slice(0, 3).map((disc) => ({ userId: hidden.id, releaseGroupId: disc.id, stars: "4.0" })));
    const hiddenRef = s.target.discographyRef(hidden.id, band!.id);
    check((await s.own.ownShareState("discography", hiddenRef, "es", hidden.id)).state === "private_profile", "la hoja lo dice");
    check((await codeOf(() => s.own.makeOwnPublic("discography", hiddenRef, "es", hidden.id))) === "PROFILE_PRIVATE", "y el gesto se rechaza");
    await db.insert(discographyShare).values({ userId: hidden.id, artistId: band!.id });
    check((await s.discography.getDiscographyLamina(hidden.username, band!.id, null)) === null, "una marca anterior no lo abre");

    console.log("Quitar la marca");
    const stopped = await s.own.stopSharing("discography", ref, "es", owner.id);
    check(stopped.state === "needs_gesture", "vuelve a pedir el gesto");
    check((await read(null)) === null, "un anónimo deja de verla");
    check((await db.select().from(rating).where(eq(rating.userId, owner.id))).length === 5, "las valoraciones no cambian");

    console.log("Entradas");
    const entries = await s.discography.listDiscographyEntries(owner.id);
    check(entries.length === 1 && entries[0]?.discCount === 4, "cuenta solo los discos principales");
    check((await s.discography.listDiscographyEntries(stranger.id)).length === 0, "sin discos, nada");
    check((await s.discography.countRatedMainDiscs(owner.id, band!.id)) === 4, "el enlace del artista usa la misma regla");

    console.log("Eventos y cascadas");
    const otherRef = s.target.discographyRef(follower.id, band!.id);
    await db.insert(shareEvent).values([
      { targetKind: "discography", targetRef: ref, channel: "copy", format: "post" },
      { targetKind: "discography", targetRef: otherRef, channel: "copy", format: "post" },
    ]);
    const removed = await db.delete(shareEvent).where(s.lifecycle.ownShareEvents(owner.id)).returning();
    check(removed.length === 1 && removed[0]?.targetRef === ref, "los eventos de la cuenta, no los de otras");
    await db.delete(shareEvent).where(eq(shareEvent.targetRef, otherRef));
    await db.insert(discographyShare).values({ userId: owner.id, artistId: other!.id });
    await db.delete(artist).where(eq(artist.id, other!.id));
    const left = await db.select().from(discographyShare).where(and(eq(discographyShare.userId, owner.id), eq(discographyShare.artistId, other!.id)));
    check(left.length === 0, "borrar el artista borra la marca");

    console.log("Tiempo con 200 discos valorados");
    const many = await db
      .insert(releaseGroup)
      .values(Array.from({ length: 200 }, (_, n) => ({ mbid: mbid(n), title: `Smoke Muchos ${n}`, category: "studio", firstReleaseYear: 1900 + (n % 120) })))
      .returning({ id: releaseGroup.id });
    await db.insert(credit).values(many.map((disc) => ({ artistId: band!.id, releaseGroupId: disc.id, role: "primary", position: 0 })));
    await db.insert(rating).values(many.map((disc, n) => ({ userId: perf.id, releaseGroupId: disc.id, stars: String(1 + (n % 9) / 2) })));
    await s.discography.getDiscographyLamina(perf.username, band!.id, perf.id);
    const times: number[] = [];
    for (let run = 0; run < 5; run += 1) {
      const start = performance.now();
      await s.discography.getDiscographyLamina(perf.username, band!.id, perf.id);
      times.push(performance.now() - start);
    }
    const median = [...times].sort((a, b) => a - b)[2]!;
    check(median < READ_BUDGET_MS, `lectura: ${median.toFixed(1)} ms`);
    const big = await s.target.loadDiscographyTarget(s.target.discographyRef(perf.id, band!.id), "es", { owner: perf.id });
    check(big?.card.discography?.discs.length === 20 && big.card.discography.more === 180, "la imagen corta en 20 y dice cuántos quedan");
    check(big?.card.discography?.discs.filter((disc) => disc.cover.url).length === 0, "sin carátulas, todos tipográficos");

    await checkSongs(s, owner, follower);

    console.log("\nSmoke test de la Lámina de discografía: OK");
  } finally {
    await db.delete(appUser).where(like(appUser.username, "smoke_disc_%"));
    await db.delete(releaseGroup).where(like(sql`${releaseGroup.mbid}::text`, PREFIX));
    await db.delete(recording).where(like(recording.title, `${SONG_PREFIX}%`));
    await db.delete(artist).where(like(sql`${artist.mbid}::text`, PREFIX));
  }
}

const SONG_PREFIX = "Smoke Canción Disc";

/** Desde add-discography-lamina-phase2: vista Por canción, preferencias del dueño y Lámina de álbum. */
async function checkSongs(s: Awaited<ReturnType<typeof loadServices>>, owner: { id: string; username: string }, follower: { id: string }) {
  const [band] = await db.insert(artist).values({ mbid: mbid(0xf05), type: "group", name: `Smoke Canciones ${suffix}` }).returning();
  const [other] = await db.insert(artist).values({ mbid: mbid(0xf06), type: "group", name: `Smoke Ajeno ${suffix}` }).returning();
  const make = async (n: number, title: string, year: number, secondaryTypes: string[], tracks: number, artistId: string) => {
    const [disc] = await db
      .insert(releaseGroup)
      .values({ mbid: mbid(0xa00 + n), title, category: secondaryTypes.includes("Live") ? "live_other" : "studio", primaryType: "Album", secondaryTypes, firstReleaseYear: year })
      .returning();
    await db.insert(credit).values({ artistId, releaseGroupId: disc!.id, role: "primary", position: 0 });
    const [edition] = await db.insert(release).values({ releaseGroupId: disc!.id, isRepresentative: true }).returning();
    const songs = await db
      .insert(recording)
      .values(Array.from({ length: tracks }, (_, i) => ({ title: `${SONG_PREFIX} ${n}-${i + 1} ${suffix}` })))
      .returning({ id: recording.id });
    // Dos medios: las pistas siguen numerándose de corrido.
    await db.insert(track).values(songs.map((song, i) => ({ releaseId: edition!.id, recordingId: song.id, discNumber: i < 4 ? 1 : 2, position: i < 4 ? i + 1 : i - 3 })));
    return { disc: disc!, songs };
  };
  const a = await make(1, "Smoke Uno", 1980, [], 8, band!.id);
  const b = await make(2, "Smoke Dos", 1982, [], 6, band!.id);
  const c = await make(3, "Smoke Tres", 1984, [], 5, band!.id);
  const live = await make(4, "Smoke En vivo", 1986, ["Live"], 4, band!.id);
  const foreign = await make(5, "Smoke Ajeno", 1990, [], 4, other!.id);
  const rateSong = (id: string, stars: number, detailed?: number) =>
    db.insert(rating).values({ userId: owner.id, recordingId: id, stars: stars.toFixed(1), detailedScore: detailed ?? null });
  const read = (viewer: string | null) => s.discography.getDiscographyLamina(owner.username, band!.id, viewer);

  console.log("Vista Por canción");
  for (const song of a.songs.slice(0, 6)) await rateSong(song.id, 4);
  await rateSong(b.songs[0]!.id, 5, 96);
  await rateSong(b.songs[1]!.id, 3);
  check((await read(owner.id))?.available.song === false, "con 8 canciones no se ofrece");
  check(((await read(owner.id))?.missing ?? 0) > 0, "sin ninguna vista, al dueño le falta");
  check((await read(follower.id)) === null, "y una seguidora no la ve");
  await rateSong(b.songs[2]!.id, 3.5);
  await rateSong(b.songs[3]!.id, 2.5);
  const lamina = await read(owner.id);
  check(lamina?.available.song === true && lamina.available.disc === false, "con 10 en 2 discos, sí; sin 3 discos valorados, Por disco no");
  check((await read(follower.id)) !== null, "la página existe por sus canciones y una seguidora la ve");
  check(lamina?.view === "song", "y la vista cae en Por canción");
  check(lamina?.discs.length === 0 && lamina.songDiscs.length === 2, "discos solo con canciones: en la grilla y no en Por disco");
  const first = lamina!.songDiscs[0]!;
  check(first.tracks.map((t) => t.number).join() === "1,2,3,4,5,6,7,8", "las pistas se numeran de corrido entre medios");
  check(first.tracks[6]!.score === null && first.tracks[0]!.score?.stars === 4, "una pista sin valorar queda vacía");
  check(lamina!.songDiscs[1]!.tracks[0]!.score?.detailedScore === 96, "el dato real de cada canción");

  console.log("Preferencias");
  const ownerRef = s.target.discographyRef(owner.id, band!.id);
  for (const disc of [a, b, c]) await s.social.upsertRating(await s.social.resolveSocialTarget("release-group", disc.disc.id), owner.id, 4);
  await db.insert(rating).values({ userId: owner.id, releaseGroupId: live.disc.id, stars: "5.0" });
  check((await read(owner.id))?.view === "disc", "sin preferencia, Por disco");
  check(!(await read(owner.id))?.discs.some((d) => d.id === live.disc.id), "En vivo no entra por defecto");
  await s.discography.saveDiscographyPreference(owner.id, band!.id, { sections: ["live"], view: "song" });
  const preferred = await read(owner.id);
  check(preferred?.discs.some((d) => d.id === live.disc.id) === true, "sumar En vivo lo incluye");
  check(preferred?.view === "song", "la vista del dueño");
  const image = await s.target.loadDiscographyTarget(ownerRef, "es", { owner: owner.id });
  check(image?.card.discography?.songs?.columns.length === preferred!.songDiscs.length, "la imagen muestra la grilla");
  check(image?.card.discography?.songs?.rows.length === 8, "con tantas filas como la pista más larga");
  check((await codeOf(() => db.execute(sql`INSERT INTO discography_preference (user_id, artist_id, sections) VALUES (${follower.id}::uuid, ${band!.id}::uuid, ARRAY['singles'])`))) === "23514", "CHECK de secciones");
  check((await codeOf(() => db.execute(sql`INSERT INTO discography_preference (user_id, artist_id, default_view) VALUES (${follower.id}::uuid, ${band!.id}::uuid, 'grid')`))) === "23514", "CHECK de vista");

  console.log("Lámina de álbum");
  const album = (viewer: string | null, disc = b.disc.id) => s.discography.getDiscographyAlbum(owner.username, band!.id, disc, viewer);
  check((await album(follower.id))?.disc.tracks.length === 6, "una seguidora ve el álbum con 4 canciones valoradas");
  check((await album(follower.id, c.disc.id)) === null, "un disco con menos de 3 canciones, no");
  check((await album(owner.id, c.disc.id))?.missing === 3, "el dueño ve cuántas le faltan");
  check((await album(owner.id, foreign.disc.id)) === null, "un disco de otro artista responde null");
  check((await album(null)) === null, "un anónimo sin marca, no");
  const albumRef = s.target.discographyRef(owner.id, band!.id, b.disc.id);
  check((await s.target.loadDiscographyTarget(albumRef, "es")) === null, "ni su imagen");
  await s.own.makeOwnPublic("discography", albumRef, "es", owner.id);
  check((await album(null)) !== null, "la misma marca del artista lo abre");
  const albumImage = await s.target.loadDiscographyTarget(albumRef, "es");
  check(albumImage?.card.discographyAlbum?.tracks.length === 6 && albumImage.card.discographyAlbum.tracks[0]!.score?.detailedScore === 96, "y su imagen trae las barras");
  check((await s.target.loadDiscographyTarget(s.target.discographyRef(owner.id, band!.id, foreign.disc.id), "es")) === null, "un disco ajeno no tiene imagen");
  await db.insert(shareEvent).values({ targetKind: "discography", targetRef: albumRef, channel: "copy", format: "post" });
  const removed = await db.delete(shareEvent).where(s.lifecycle.ownShareEvents(owner.id)).returning();
  check(removed.some((event) => event.targetRef === albumRef), "los eventos del álbum se borran con la cuenta");
  await s.own.stopSharing("discography", ownerRef, "es", owner.id);
  check((await s.discography.readDiscographyPreference(owner.id, band!.id)).view === "song", "quitar la marca conserva las preferencias");

  console.log("Tiempo con 50 discos de 15 pistas valoradas");
  const perf = newUser("perfsongs");
  await db.insert(appUser).values(perf);
  const [many] = await db.insert(artist).values({ mbid: mbid(0xf07), type: "group", name: `Smoke Muchas ${suffix}` }).returning();
  for (let n = 0; n < 50; n += 1) {
    const [disc] = await db
      .insert(releaseGroup)
      .values({ mbid: mbid(0x600 + n), title: `Smoke Muchas ${n}`, category: "studio", primaryType: "Album", secondaryTypes: [], firstReleaseYear: 1950 + n })
      .returning();
    await db.insert(credit).values({ artistId: many!.id, releaseGroupId: disc!.id, role: "primary", position: 0 });
    const [edition] = await db.insert(release).values({ releaseGroupId: disc!.id, isRepresentative: true }).returning();
    const songs = await db.insert(recording).values(Array.from({ length: 15 }, (_, i) => ({ title: `${SONG_PREFIX} p${n}-${i}` }))).returning({ id: recording.id });
    await db.insert(track).values(songs.map((song, i) => ({ releaseId: edition!.id, recordingId: song.id, position: i + 1 })));
    await db.insert(rating).values(songs.map((song, i) => ({ userId: perf.id, recordingId: song.id, stars: String(1 + (i % 9) / 2) })));
    await db.insert(rating).values({ userId: perf.id, releaseGroupId: disc!.id, stars: "4.0" });
  }
  await s.discography.getDiscographyLamina(perf.username, many!.id, perf.id);
  const times: number[] = [];
  for (let run = 0; run < 5; run += 1) {
    const start = performance.now();
    await s.discography.getDiscographyLamina(perf.username, many!.id, perf.id);
    times.push(performance.now() - start);
  }
  const median = [...times].sort((x, y) => x - y)[2]!;
  check(median < 150, `lectura con 750 pistas: ${median.toFixed(1)} ms`);
  await s.discography.saveDiscographyPreference(perf.id, many!.id, { sections: [], view: "song" });
  const grid = await s.target.loadDiscographyTarget(s.target.discographyRef(perf.id, many!.id), "es", { owner: perf.id });
  check(grid?.card.discography?.songs?.columns.length === 20 && grid.card.discography.songs.moreDiscs === 30, "la grilla corta en 20 discos y dice cuántos quedan");
  check(grid?.card.discography?.songs?.rows.length === 15, "y en las pistas que hay");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
