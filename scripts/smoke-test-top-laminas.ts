export {};

// Smoke test de add-top-n-lamina-phase1 contra Postgres REAL (el SQL que las pruebas unitarias mockean): `CHECK` de la
// migración 0083, tope con concurrencia, orden, que una Lámina no aparece en las superficies de listas, notas por
// visitante, moderación, feed, objetivo, gesto de hacer pública y eventos con la cuenta.
// Crea un artista y once álbumes sintéticos (MBID `5e0ce000-0000-4000-8000-00000000c0c*`) y usuarios `smoke_lam_*`, y los
// borra al terminar (también si falla). Si se interrumpió, limpiar con
//   DELETE FROM app_user WHERE username LIKE 'smoke_lam_%';
//   DELETE FROM release_group WHERE mbid::text LIKE '5e0ce000-0000-4000-8000-00000000c0c%';
//   DELETE FROM artist WHERE mbid::text LIKE '5e0ce000-0000-4000-8000-00000000c0c%';
// (el `ON DELETE CASCADE` limpia lo demás). Necesita las migraciones 0079 a 0083. Correr contra una BD de scratch:
//   ALLOW_SMOKE_ON_REAL_DB=1 npx tsx --env-file=.env scripts/smoke-test-top-laminas.ts

import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { eq, like, sql } from "drizzle-orm";
import { assertSmokeAllowed } from "./assert-smoke-allowed";
import { db } from "../src/db";
import { appUser, artist, credit, releaseGroup, shareEvent, userFollow, userList, userListItem } from "../src/db/schema";

assertSmokeAllowed();

const suffix = randomUUID().slice(0, 8);
const ARTIST_MBID = "5e0ce000-0000-4000-8000-00000000c0c0";
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
  const [laminas, lists, social, feed, target, own, lifecycle] = await Promise.all([
    import("../src/services/laminas/laminas"),
    import("../src/services/lists/lists"),
    import("../src/services/social"),
    import("../src/services/feed/feed"),
    import("../src/services/share/targets/lamina"),
    import("../src/services/share/own"),
    import("../src/services/auth/account-lifecycle"),
  ]);
  return { laminas, lists, social, feed, target, own, lifecycle };
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

    console.log("\nSmoke test de las Láminas Top N: OK");
  } finally {
    await db.delete(appUser).where(like(appUser.username, "smoke_lam_%"));
    await db.delete(releaseGroup).where(like(sql`${releaseGroup.mbid}::text`, "5e0ce000-0000-4000-8000-00000000c0c%"));
    await db.delete(artist).where(eq(artist.mbid, ARTIST_MBID));
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
