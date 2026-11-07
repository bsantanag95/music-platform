export {};

// Smoke test de add-tier-list-lamina-phase1 contra Postgres REAL (el SQL que las pruebas unitarias mockean): `CHECK` de la migración 0086,
// prellenado desde la discografía por tramos con la bandeja y el tope de 50, disposición atómica y su rechazo, que no toca valoraciones,
// etiquetas, exclusión de las superficies de listas, notas y bandeja por visitante, moderación, objetivo de imagen (10 carátulas y el resto en
// texto), gesto de hacer pública, feed, exportación, eventos y cascadas.
// Crea dos artistas y sus discos sintéticos (MBID `5e0ce000-0000-4000-8000-00000000e0*`) y usuarios `smoke_tier_*`, y los borra al terminar
// (también si falla). Si se interrumpió, limpiar con
//   DELETE FROM app_user WHERE username LIKE 'smoke_tier_%';
//   DELETE FROM release_group WHERE mbid::text LIKE '5e0ce000-0000-4000-8000-00000000e0%';
//   DELETE FROM artist WHERE mbid::text LIKE '5e0ce000-0000-4000-8000-00000000e0%';
// (el `ON DELETE CASCADE` limpia lo demás). Necesita las migraciones 0079 a 0086. No sale a MusicBrainz: los artistas nacen con la
// discografía sincronizada.
// Correr contra una BD de scratch:
//   ALLOW_SMOKE_ON_REAL_DB=1 npx tsx --env-file=.env scripts/smoke-test-tier-laminas.ts

import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { and, eq, inArray, like, sql } from "drizzle-orm";
import { assertSmokeAllowed } from "./assert-smoke-allowed";
import { db } from "../src/db";
import { appUser, artist, credit, rating, releaseGroup, shareEvent, userFollow, userList, userListItem } from "../src/db/schema";

assertSmokeAllowed();

const suffix = randomUUID().slice(0, 8);
const PREFIX = "5e0ce000-0000-4000-8000-00000000e0";
const mbid = (n: number) => `${PREFIX}${n.toString(16).padStart(2, "0")}`;
const READ_BUDGET_MS = 150;

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
  const [tiers, laminas, lists, social, feed, target, own, lifecycle, dataExport] = await Promise.all([
    import("../src/services/laminas/tiers"),
    import("../src/services/laminas/laminas"),
    import("../src/services/lists/lists"),
    import("../src/services/social"),
    import("../src/services/feed/feed"),
    import("../src/services/share/targets/tier"),
    import("../src/services/share/own"),
    import("../src/services/auth/account-lifecycle"),
    import("../src/services/profiles/data-export"),
  ]);
  return { tiers, laminas, lists, social, feed, target, own, lifecycle, dataExport };
}

type Services = Awaited<ReturnType<typeof loadServices>>;

const newUser = (label: string) => ({
  id: randomUUID(),
  username: `smoke_tier_${label}_${suffix}`,
  email: `smoke_tier_${label}_${suffix}@example.test`,
});

const ids = (items: Array<{ target: { id: string } }>) => items.map((item) => item.target.id);

/** Doce discos principales con carátula, un disco en vivo y uno donde el artista es invitado. */
async function seedDiscography(ownerId: string) {
  const [band, other] = await db
    .insert(artist)
    .values([
      { mbid: mbid(0x00), type: "group", name: `Smoke Tier ${suffix}`, discographySyncedAt: new Date() },
      { mbid: mbid(0x01), type: "group", name: `Smoke Tier Otro ${suffix}`, discographySyncedAt: new Date() },
    ])
    .returning();
  const main = await db
    .insert(releaseGroup)
    .values(
      Array.from({ length: 12 }, (_, n) => ({
        mbid: mbid(0x10 + n),
        title: `Smoke Tier Disco ${n + 1}`,
        category: "studio",
        primaryType: "Album",
        secondaryTypes: [],
        firstReleaseYear: 1980 + n,
        // Fuera de Cover Art Archive: no dispara el espejo.
        coverThumbUrl: `https://example.test/smoke-tier-${n + 1}.jpg`,
      })),
    )
    .returning();
  const [live, guest] = await db
    .insert(releaseGroup)
    .values([
      { mbid: mbid(0x30), title: "Smoke Tier En Vivo", category: "live_other", primaryType: "Album", secondaryTypes: ["Live"], firstReleaseYear: 1999 },
      { mbid: mbid(0x31), title: "Smoke Tier Invitado", category: "studio", primaryType: "Album", secondaryTypes: [], firstReleaseYear: 2000 },
    ])
    .returning();
  await db.insert(credit).values([
    ...main.map((disc) => ({ artistId: band!.id, releaseGroupId: disc.id, role: "primary", position: 0 })),
    { artistId: band!.id, releaseGroupId: live!.id, role: "primary", position: 0 },
    { artistId: other!.id, releaseGroupId: guest!.id, role: "primary", position: 0 },
    { artistId: band!.id, releaseGroupId: guest!.id, role: "featured", position: 1 },
  ]);
  // Una nota por tramo, más algunas repetidas; el disco 12 queda sin valorar. El en vivo, con 100, no entra.
  const notes: Array<[number, number, number | null]> = [
    [0, 5, 95], // S
    [1, 4, null], // B por estrellas
    [2, 4.5, 85], // A
    [3, 2, null], // E por estrellas
    [4, 2.5, 50], // D
    [5, 3.5, 65], // C
    [6, 5, 92], // S
    [7, 4.5, null], // A por estrellas
    [8, 4, 78], // B
    [9, 2.5, 45], // D
    [10, 1, 20], // E
  ];
  await db.insert(rating).values([
    ...notes.map(([n, stars, detailedScore]) => ({ userId: ownerId, releaseGroupId: main[n]!.id, stars: String(stars), detailedScore })),
    { userId: ownerId, releaseGroupId: live!.id, stars: "5", detailedScore: 100 },
  ]);
  return { band: band!, main, live: live!, guest: guest! };
}

async function checkMigration(ownerId: string, listItemOf: (listId: string) => Promise<string>) {
  console.log("Migración 0086");
  const base = { ownerId, entityType: "release-group", title: "x" };
  const labels = ["S", "A", "B", "C", "D", "E"];
  check((await codeOf(() => db.insert(userList).values({ ...base, kind: "tier" }))) === "23514", "una tier list exige etiquetas");
  check((await codeOf(() => db.insert(userList).values({ ...base, tierLabels: labels }))) === "23514", "una lista común no las lleva");
  check((await codeOf(() => db.insert(userList).values({ ...base, kind: "tier", tierLabels: labels.slice(0, 5) }))) === "23514", "son seis");
  check((await codeOf(() => db.insert(userList).values({ ...base, kind: "tier", tierLabels: ["Trece letras!", ...labels.slice(1)] }))) === "23514", "hasta 12 caracteres");
  check((await codeOf(() => db.insert(userList).values({ ...base, kind: "tier", tierLabels: [" S", ...labels.slice(1)] }))) === "23514", "sin espacios a los costados");
  check((await codeOf(() => db.insert(userList).values({ ...base, kind: "tier", tierLabels: ["", ...labels.slice(1)] }))) === "23514", "ni vacías");
  check((await codeOf(() => db.insert(userList).values({ ...base, entityType: "artist", kind: "tier", tierLabels: labels }))) === "23514", "una tier list no es de artistas");
  const [ok] = await db.insert(userList).values({ ...base, kind: "tier", tierLabels: ["Dios", ...labels.slice(1)] }).returning();
  check(ok !== undefined, "seis etiquetas válidas entran");
  const itemId = await listItemOf(ok!.id);
  check((await codeOf(() => db.update(userListItem).set({ tier: 6 }).where(eq(userListItem.id, itemId)))) === "23514", "un nivel 6 no existe");
  await db.delete(userList).where(eq(userList.id, ok!.id));
}

async function checkOverCap(s: Services, ownerId: string) {
  console.log("Tope de 50");
  const [many] = await db.insert(artist).values({ mbid: mbid(0x02), type: "group", name: `Smoke Tier Muchos ${suffix}`, discographySyncedAt: new Date() }).returning();
  const discs = await db
    .insert(releaseGroup)
    .values(Array.from({ length: 53 }, (_, n) => ({ mbid: mbid(0x40 + n), title: `Smoke Tier Muchos ${n + 1}`, category: "studio", primaryType: "Album", secondaryTypes: [], firstReleaseYear: 1950 + n })))
    .returning();
  await db.insert(credit).values(discs.map((disc) => ({ artistId: many!.id, releaseGroupId: disc.id, role: "primary", position: 0 })));
  // Los tres últimos, valorados: con más de 50 entran primero.
  await db.insert(rating).values(discs.slice(-3).map((disc) => ({ userId: ownerId, releaseGroupId: disc.id, stars: "4", detailedScore: null })));
  const tierList = await s.tiers.createTierList(ownerId, { title: "Muchos", entityType: "release-group", source: { type: "discography", artistId: many!.id } });
  const all = [...tierList.tiers.flat(), ...tierList.tray];
  check(all.length === 50, "con 53 discos entran 50");
  check(ids(tierList.tiers[2]!).length === 3, "los tres valorados entran, en B");
  check(ids(tierList.tray)[0] === discs[0]!.id && !ids(tierList.tray).includes(discs[49]!.id), "la bandeja se llena por año, sin los últimos sin valorar");

  const started = performance.now();
  await s.tiers.getOwnedTierList(tierList.id, ownerId);
  const elapsed = performance.now() - started;
  check(elapsed < READ_BUDGET_MS, `la lectura de 50 discos tarda ${elapsed.toFixed(1)} ms (< ${READ_BUDGET_MS})`);
}

async function main() {
  const s = await loadServices();
  const owner = newUser("owner");
  const follower = newUser("follower");

  try {
    await db.insert(appUser).values([owner, follower]);
    await db.insert(userFollow).values({ followerId: follower.id, followedId: owner.id, status: "accepted" });
    const { band, main, live, guest } = await seedDiscography(owner.id);
    await checkMigration(owner.id, async (listId) => {
      const [row] = await db.insert(userListItem).values({ listId, position: 1, releaseGroupId: main[0]!.id }).returning();
      return row!.id;
    });

    console.log("Prellenado desde la discografía");
    check(
      (await codeOf(() => s.tiers.createTierList(owner.id, { title: "x", entityType: "release-group", source: { type: "discography", artistId: randomUUID() } }))) ===
        "VALIDATION_ERROR",
      "un artista que no existe se rechaza",
    );
    const created = await s.tiers.createTierList(owner.id, { title: "Mi tier list", entityType: "release-group", source: { type: "discography", artistId: band.id } });
    const expected = [
      [main[0]!.id, main[6]!.id],
      [main[2]!.id, main[7]!.id],
      [main[1]!.id, main[8]!.id],
      [main[5]!.id],
      [main[4]!.id, main[9]!.id],
      [main[3]!.id, main[10]!.id],
    ];
    check(JSON.stringify(created.tiers.map(ids)) === JSON.stringify(expected), "cada disco cae en el nivel del tramo de su nota, por año");
    check(JSON.stringify(ids(created.tray)) === JSON.stringify([main[11]!.id]), "el sin valorar queda en la bandeja");
    const all = JSON.stringify(created);
    check(!all.includes(live.id) && !all.includes(guest.id), "sin el disco en vivo ni donde es invitado");
    check(created.audience === "private" && created.showScores === false, "nace privada y con las notas apagadas");
    check(JSON.stringify(created.labels) === JSON.stringify(["S", "A", "B", "C", "D", "E"]), "con las etiquetas por defecto");
    const otherLists = await db.execute<{ n: number }>(sql`
      SELECT count(*)::int AS n FROM user_list_item i JOIN user_list l ON l.id = i.list_id WHERE l.kind <> 'tier' AND i.tier IS NOT NULL`);
    check(otherLists[0]?.n === 0, "ninguna lista de otro tipo tiene niveles");

    console.log("Disposición");
    const ratingsBefore = await db
      .select({ id: rating.id, stars: rating.stars, detailedScore: rating.detailedScore, updatedAt: rating.updatedAt })
      .from(rating)
      .where(eq(rating.userId, owner.id))
      .orderBy(rating.id);
    const itemOf = (targetId: string) => [...created.tiers.flat(), ...created.tray].find((item) => item.target.id === targetId)!.id;
    const current = { tiers: created.tiers.map((items) => items.map((item) => item.id)), tray: created.tray.map((item) => item.id) };
    // Disco 2 de B a S, adelante; el de la bandeja, al final de C.
    const next = {
      tiers: [[itemOf(main[1]!.id), ...current.tiers[0]!], current.tiers[1]!, current.tiers[2]!.filter((id) => id !== itemOf(main[1]!.id)), [...current.tiers[3]!, itemOf(main[11]!.id)], current.tiers[4]!, current.tiers[5]!],
      tray: [],
    };
    const arranged = await s.tiers.arrangeTierList(created.id, owner.id, next);
    check(ids(arranged.tiers[0]!)[0] === main[1]!.id && ids(arranged.tiers[3]!).at(-1) === main[11]!.id && arranged.tray.length === 0, "mueve entre niveles y desde la bandeja");
    const ratingsAfter = await db
      .select({ id: rating.id, stars: rating.stars, detailedScore: rating.detailedScore, updatedAt: rating.updatedAt })
      .from(rating)
      .where(eq(rating.userId, owner.id))
      .orderBy(rating.id);
    check(JSON.stringify(ratingsAfter) === JSON.stringify(ratingsBefore), "no toca ninguna valoración (ni su updated_at)");
    check((await codeOf(() => s.tiers.arrangeTierList(created.id, owner.id, { tiers: next.tiers.slice(1).concat([[]]), tray: [] }))) === "VALIDATION_ERROR", "una disposición que omite discos se rechaza");
    check((await codeOf(() => s.tiers.arrangeTierList(created.id, owner.id, { ...next, tray: [randomUUID()] }))) === "VALIDATION_ERROR", "una con un ítem ajeno también");
    check(JSON.stringify((await s.tiers.getOwnedTierList(created.id, owner.id)).tiers.map(ids)) === JSON.stringify(arranged.tiers.map(ids)), "y no cambia nada");
    check((await codeOf(() => s.tiers.arrangeTierList(created.id, follower.id, next))) === "LAMINA_NOT_FOUND", "lo ajeno responde 404");
    const variants = [next, { ...next, tiers: [...next.tiers].reverse() }];
    await Promise.all(variants.concat(variants).map((arrangement) => s.tiers.arrangeTierList(created.id, owner.id, arrangement)));
    const raced = await s.tiers.getOwnedTierList(created.id, owner.id);
    const racedTiers = JSON.stringify(raced.tiers.map((items) => items.map((item) => item.id)));
    check(variants.some((v) => JSON.stringify(v.tiers) === racedTiers) && raced.tiers.flat().length === 12, "con pedidos en paralelo queda una disposición entera");
    await s.tiers.arrangeTierList(created.id, owner.id, next);

    await s.social.upsertRating(await s.social.resolveSocialTarget("release-group", main[2]!.id), owner.id, 5, 99);
    check(ids((await s.tiers.getOwnedTierList(created.id, owner.id)).tiers[1]!).includes(main[2]!.id), "cambiar una nota después no mueve el disco");

    console.log("Etiquetas");
    const renamed = await s.tiers.updateTierList(created.id, owner.id, { tierLabels: [" Dios ", "A", "B", "C", "D", "E"] });
    check(renamed.labels[0] === "Dios", "renombra un nivel, sin espacios a los costados");
    check((await codeOf(() => s.tiers.updateTierList(created.id, owner.id, { tierLabels: ["", "A", "B", "C", "D", "E"] }))) === "VALIDATION_ERROR", "una vacía se rechaza");

    console.log("Fuera de las superficies de listas y del Top N");
    check(!JSON.stringify(await s.lists.listMyLists(owner.id)).includes(created.id), "no aparece en Mis listas");
    check((await codeOf(() => s.lists.getUserListDetail(owner.username, created.id, null))) === "LIST_NOT_FOUND", "no se lee como lista");
    check((await codeOf(() => s.laminas.getOwnedLamina(created.id, owner.id))) === "LAMINA_NOT_FOUND", "no se lee como Top N");
    check((await codeOf(() => s.laminas.addLaminaItem(created.id, owner.id, main[0]!.id))) === "LAMINA_NOT_FOUND", "ni se completa como Top N");
    const mine = await s.laminas.listMyLaminas(owner.id);
    check(mine.find((entry) => entry.id === created.id)?.kind === "tier", "se lista entre las Láminas con su tipo");

    console.log("Visibilidad, bandeja y notas");
    check((await codeOf(() => s.tiers.getUserTierList(owner.username, created.id, null))) === "LAMINA_NOT_FOUND", "privada: un anónimo no la ve");
    check((await s.target.loadTierTarget(created.id, "es")) === null, "sin objetivo anónimo");
    const state = await s.own.ownShareState("tier", created.id, "es", owner.id);
    check(state.state === "needs_gesture" && state.payload.images[0]!.format === "post", "la hoja pide el gesto, con Publicación primero");
    // Un disco a la bandeja para ver que no sale.
    const withTray = { tiers: next.tiers.map((group) => group.filter((id) => id !== itemOf(main[10]!.id))), tray: [itemOf(main[10]!.id)] };
    await s.tiers.arrangeTierList(created.id, owner.id, withTray);
    await s.own.makeOwnPublic("tier", created.id, "es", owner.id);
    const publicView = await s.tiers.getUserTierList(owner.username, created.id, null);
    check(publicView.tray.length === 0 && !JSON.stringify(publicView).includes(main[10]!.id), "pública: la bandeja no llega a nadie");
    check(publicView.tiers.flat().every((item) => item.score === null), "con las notas apagadas, ninguna nota");
    check((await s.tiers.getOwnedTierList(created.id, owner.id)).tray.length === 1, "el dueño sí ve su bandeja");
    const offTarget = await s.target.loadTierTarget(created.id, "es");
    const offJson = JSON.stringify(offTarget);
    check(offTarget !== null && !offJson.includes('"detailedScore":95') && !offJson.includes(main[10]!.id) && !offJson.includes("Smoke Tier Disco 11"), "la imagen tampoco lleva notas ni bandeja");
    check(JSON.stringify(offTarget?.formats) === JSON.stringify(["post", "link", "story"]), "formatos Publicación, Enlace e Historia");
    const covers = offTarget!.card.tier!.tiers.flat().filter((item) => item.cover.url !== null).length;
    check(offTarget!.card.tier!.tiers.flat().length === 11 && covers === 10, "11 discos en niveles: 10 con carátula y uno como ficha de texto");
    check(offTarget!.card.tier!.labels[0] === "Dios", "con las etiquetas propias");
    await s.tiers.updateTierList(created.id, owner.id, { showScores: true });
    const scored = await s.tiers.getUserTierList(owner.username, created.id, null);
    check(scored.tiers[0]!.some((item) => item.score?.detailedScore === 95), "encendidas, un anónimo ve la nota");
    check(JSON.stringify(await s.target.loadTierTarget(created.id, "es")).includes('"detailedScore":95'), "y la imagen la lleva");
    await s.tiers.updateTierList(created.id, owner.id, { audience: "followers" });
    check((await codeOf(() => s.tiers.getUserTierList(owner.username, created.id, null))) === "LAMINA_NOT_FOUND", "para seguidores: un anónimo no la ve");
    check((await s.tiers.getUserTierList(owner.username, created.id, follower.id)).id === created.id, "un seguidor sí");
    await db.update(userList).set({ moderationStatus: "hidden" }).where(eq(userList.id, created.id));
    check((await codeOf(() => s.tiers.getUserTierList(owner.username, created.id, follower.id))) === "LAMINA_NOT_FOUND", "oculta: nadie más la ve");
    check((await s.tiers.getOwnedTierList(created.id, owner.id)).id === created.id, "su dueño sí la gestiona");
    await db.update(userList).set({ moderationStatus: "visible" }).where(eq(userList.id, created.id));

    console.log("Feed");
    const feedHas = async (id: string) => JSON.stringify(await s.feed.listFeed(follower.id)).includes(id);
    check(await feedHas(created.id), "una tier list con discos en niveles entra al feed");
    const trayOnly = await s.tiers.createTierList(owner.id, { title: "Solo bandeja", entityType: "release-group", source: { type: "discography", artistId: band.id } });
    const everything = [...trayOnly.tiers.flat(), ...trayOnly.tray].map((item) => item.id);
    await s.tiers.arrangeTierList(trayOnly.id, owner.id, { tiers: [[], [], [], [], [], []], tray: everything });
    await s.tiers.updateTierList(trayOnly.id, owner.id, { audience: "public" });
    check(!(await feedHas(trayOnly.id)), "una con todo en la bandeja no");

    await checkOverCap(s, owner.id);

    console.log("Exportación, quitar, eventos y borrado");
    const exported = await s.dataExport.buildDataExport(owner.id);
    const exportedList = (exported.lists.owned as Array<{ id: string; tierLabels: string[] | null; items: Array<{ tier: number | null }> }>).find((list) => list.id === created.id);
    check(exportedList?.tierLabels?.[0] === "Dios" && exportedList.items.some((item) => item.tier === 0) && exportedList.items.some((item) => item.tier === null), "la exportación trae etiquetas, niveles y bandeja");
    const afterRemove = await s.tiers.removeTierListItem(created.id, owner.id, itemOf(main[0]!.id));
    check(!JSON.stringify(afterRemove).includes(main[0]!.id), "quita un disco");
    check((await db.select({ id: rating.id }).from(rating).where(and(eq(rating.userId, owner.id), eq(rating.releaseGroupId, main[0]!.id)))).length === 1, "sin borrar su valoración");
    await db.insert(shareEvent).values({ targetKind: "tier", targetRef: created.id, channel: "copy", format: "post" });
    const removed = await db.delete(shareEvent).where(s.lifecycle.ownShareEvents(owner.id)).returning();
    check(removed.length === 1, "el evento de una tier list es de la cuenta");
    await s.laminas.deleteLamina(created.id, owner.id);
    const orphans = await db.select({ n: sql<number>`count(*)::int` }).from(userListItem).where(eq(userListItem.listId, created.id));
    check(orphans[0]?.n === 0, "borrarla borra sus ítems");
    check((await db.select({ id: rating.id }).from(rating).where(and(eq(rating.userId, owner.id), inArray(rating.releaseGroupId, main.map((d) => d.id))))).length === 11, "y ninguna valoración");

    console.log("\nSmoke test de la tier list: OK");
  } finally {
    await db.delete(appUser).where(like(appUser.username, "smoke_tier_%"));
    await db.delete(releaseGroup).where(like(sql`${releaseGroup.mbid}::text`, `${PREFIX}%`));
    await db.delete(artist).where(like(sql`${artist.mbid}::text`, `${PREFIX}%`));
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
