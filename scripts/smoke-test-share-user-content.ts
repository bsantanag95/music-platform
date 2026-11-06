export {};

// Smoke test de add-share-user-actions-phase1 contra Postgres REAL (el SQL que las pruebas unitarias mockean): los
// objetivos de reseña, comentario, lista, Camino, colección y huella calculados como anónimo, la dirección propia de
// un comentario (respuesta → raíz, oculto, cuenta desactivada, bloqueo) y que una lista o un Camino ocultos por
// moderación no se leen desde la vista ajena, y qué eventos de compartir se borran al eliminar una cuenta.
// Crea un artista, un álbum y una edición sintéticos (MBID `5e0ce000-0000-4000-8000-00000000c0a*`) y usuarios
// `smoke_share_*`, y los borra al terminar (también si falla). Si se interrumpió, limpiar con
//   DELETE FROM app_user WHERE username LIKE 'smoke_share_%';
//   DELETE FROM release_group WHERE mbid::text LIKE '5e0ce000-0000-4000-8000-00000000c0a%';
//   DELETE FROM artist WHERE mbid::text LIKE '5e0ce000-0000-4000-8000-00000000c0a%';
// (el `ON DELETE CASCADE` limpia lo demás). Necesita las migraciones 0079 y 0080. Correr contra una BD de scratch:
//   ALLOW_SMOKE_ON_REAL_DB=1 npx tsx --env-file=.env scripts/smoke-test-share-user-content.ts

import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { eq, inArray, like } from "drizzle-orm";
import { assertSmokeAllowed } from "./assert-smoke-allowed";
import { db } from "../src/db";
import { appUser, artist, comment, credit, favorite, listenEntry, release, releaseGroup, review, shareEvent, userBlock, userList } from "../src/db/schema";
import type { ShareTargetKind } from "../src/lib/share/kinds";

assertSmokeAllowed();

const suffix = randomUUID().slice(0, 8);
const ARTIST_MBID = "5e0ce000-0000-4000-8000-00000000c0a0";
const ALBUM_MBID = "5e0ce000-0000-4000-8000-00000000c0a1";
const RELEASE_MBID = "5e0ce000-0000-4000-8000-00000000c0a2";

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

// authorization → sessions importa next/headers: se stubea como en los demás smoke tests.
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
  const [social, reviews, lists, camino, collection, targets] = await Promise.all([
    import("../src/services/social"),
    import("../src/services/reviews"),
    import("../src/services/lists/lists"),
    import("../src/services/camino/camino"),
    import("../src/services/collection/collection"),
    import("../src/services/share/targets"),
  ]);
  return { social, reviews, lists, camino, collection, targets };
}

const newUser = (label: string) => ({
  id: randomUUID(),
  username: `smoke_share_${label}_${suffix}`,
  email: `smoke_share_${label}_${suffix}@example.test`,
});

async function main() {
  const s = await loadServices();
  const load = s.targets.loadShareTarget;
  const author = newUser("author");
  const reader = newUser("reader");
  const hidden = newUser("private");
  const gone = newUser("gone");

  try {
    await db.insert(appUser).values([author, reader, { ...hidden, profileVisibility: "private" }, gone]);
    const [art] = await db.insert(artist).values({ mbid: ARTIST_MBID, type: "group", name: `Smoke Compartir ${suffix}` }).returning();
    const [album] = await db.insert(releaseGroup).values({ mbid: ALBUM_MBID, title: `Smoke Disco ${suffix}`, category: "studio" }).returning();
    if (!art || !album) throw new Error("no se crearon el artista y el álbum sintéticos");
    await db.insert(credit).values({ artistId: art.id, releaseGroupId: album.id, role: "primary", position: 0 });
    await db.insert(release).values({ mbid: RELEASE_MBID, releaseGroupId: album.id, releaseDate: "1994-05-01" });
    const albumTarget = await s.social.resolveSocialTarget("release-group", album.id);
    const artistTarget = await s.social.resolveSocialTarget("artist", art.id);

    console.log("Reseña");
    await s.social.upsertRating(albumTarget, author.id, 4.5, 86);
    const created = await s.reviews.createOrReplaceReview(albumTarget, author.id, { title: null, body: "Una reseña larga. ".repeat(30) } as never);
    const reviewTarget = await load("review", created.id, "es");
    check(reviewTarget?.card.stars === 4.5, "la imagen lleva las estrellas del autor");
    check(!JSON.stringify(reviewTarget).includes("86"), "nunca el puntaje detallado, que solo ve su autor");
    check((reviewTarget?.card.quote ?? "").length <= 200, "la cita se recorta a 200 caracteres");
    check(reviewTarget?.card.byline === `@${author.username}`, "firma quien escribió");
    await db.update(review).set({ moderationStatus: "hidden" }).where(eq(review.id, created.id));
    check((await load("review", created.id, "es")) === null, "oculta por moderación: sin objetivo");
    await db.update(review).set({ moderationStatus: "visible" }).where(eq(review.id, created.id));

    console.log("Comentario");
    const root = await s.social.createComment(artistTarget, author.id, "Un comentario para compartir", "general");
    const reply = await s.social.createReply(root.id, reader.id, "Una respuesta");
    const onAlbum = await s.social.createComment(albumTarget, author.id, "Sobre el disco");
    const permalink = await s.social.getCommentPermalink(root.id, null);
    check(permalink?.object.type === "artist" && permalink.object.href.includes(art.id.slice(0, 8)) === false, "trae el objeto comentado");
    check((await s.social.getCommentPermalink(reply.id, null))?.comment.id === root.id, "una respuesta da su raíz");
    const albumLink = await s.social.getCommentPermalink(onAlbum.id, null);
    check(albumLink?.object.type === "release-group" && albumLink.object.href.startsWith("/album/"), "funciona en un álbum");
    check((await load("comment", onAlbum.id, "en"))?.canonicalPath === `/en/comment/${onAlbum.id}`, "el objetivo apunta a su dirección propia");
    check((await load("comment", reply.id, "es"))?.ref === root.id, "el objetivo de una respuesta es el de su raíz");

    await db.insert(userBlock).values({ blockerId: author.id, blockedId: reader.id });
    check((await s.social.getCommentPermalink(root.id, reader.id)) === null, "bloqueo: el bloqueado no lo ve");
    check((await s.social.getCommentPermalink(root.id, null)) !== null, "bloqueo: un anónimo sí");
    await db.delete(userBlock).where(eq(userBlock.blockerId, author.id));
    await db.update(comment).set({ moderationStatus: "hidden" }).where(eq(comment.id, root.id));
    check((await s.social.getCommentPermalink(root.id, null)) === null, "oculto por moderación: no se ve");
    check((await s.social.getCommentPermalink(reply.id, null)) === null, "una respuesta con raíz oculta tampoco");
    await db.update(comment).set({ moderationStatus: "visible" }).where(eq(comment.id, root.id));
    check((await s.social.getCommentPermalink(randomUUID(), null)) === null, "un comentario inexistente no da error");

    console.log("Lista");
    const list = await s.lists.createList({ ownerId: author.id, entityType: "release-group", title: "Mis discos", audience: "public" });
    await s.lists.addItemToList(list.id, author.id, { type: "release-group", id: album.id });
    const listTarget = await load("list", list.id, "es");
    check(listTarget?.card.meta[0] === "1 disco" && listTarget.card.subtitle === `@${author.username}`, "título, dueño y cantidad");
    check(listTarget?.canonicalPath.startsWith(`/es/users/${author.username}/lists/`), "apunta a la vista pública");
    const followersList = await s.lists.createList({ ownerId: author.id, entityType: "release-group", title: "Para seguidores", audience: "followers" });
    check((await load("list", followersList.id, "es")) === null, "una lista para seguidores no tiene objetivo");
    const artistList = await s.lists.createList({ ownerId: author.id, entityType: "artist", title: "Bandas", audience: "public" });
    await s.lists.addItemToList(artistList.id, author.id, { type: "artist", id: art.id });
    check((await load("list", artistList.id, "es"))?.card.media.type === "typographic", "una lista de artistas es tipográfica");

    console.log("Moderación de listas");
    await db.update(userList).set({ moderationStatus: "hidden" }).where(eq(userList.id, list.id));
    check((await codeOf(() => s.lists.getUserListDetail(author.username, list.id, null))) === "LIST_NOT_FOUND", "lista oculta: un anónimo no la lee");
    check((await codeOf(() => s.lists.getUserListDetail(author.username, list.id, reader.id))) === "LIST_NOT_FOUND", "lista oculta: otra persona tampoco");
    check((await codeOf(() => s.lists.getUserListDetail(author.username, list.id, author.id))) === null, "lista oculta: su dueño sí");
    check((await load("list", list.id, "es")) === null, "lista oculta: sin objetivo");

    console.log("Camino");
    const path = await s.camino.createCamino(author.id, { title: "Un camino", audience: "public" });
    await s.camino.addAlbumToCamino(path.id, author.id, album.id);
    await db.insert(listenEntry).values({ userId: author.id, releaseGroupId: album.id, listenContext: "first_listen", audience: "private" });
    const caminoTarget = await load("camino", path.id, "es");
    check(caminoTarget?.card.meta.join(" ") === "1 disco", "cantidad de discos, sin el progreso del dueño");
    check((await load("list", path.id, "es")) === null, "un Camino no se comparte como lista");
    await db.update(userList).set({ moderationStatus: "hidden" }).where(eq(userList.id, path.id));
    check((await codeOf(() => s.camino.getUserCaminoDetail(path.id, author.id, ["public"]))) === "CAMINO_NOT_FOUND", "Camino oculto: no se lee desde la vista ajena");
    check((await codeOf(() => s.camino.getOwnedCamino(path.id, author.id))) === null, "Camino oculto: su dueño sí");
    check((await load("camino", path.id, "es")) === null, "Camino oculto: sin objetivo");

    console.log("Colección y huella");
    check((await load("user_collection", author.id, "es")) === null, "sin entradas públicas no hay objetivo");
    await s.collection.addEntry(author.id, { releaseGroupId: album.id, format: "vinyl", audience: "public" });
    await s.collection.addEntry(author.id, { releaseGroupId: album.id, format: "cd", audience: "followers" });
    const collectionTarget = await load("user_collection", author.id, "es");
    check(collectionTarget?.card.meta.join(" ") === "1 vinilo", "solo cuenta las entradas públicas");
    check((await load("fingerprint", author.id, "es")) === null, "la huella de un anónimo no usa valoraciones ni la colección: sin datos públicos no hay objetivo");
    await db.insert(favorite).values({ userId: author.id, releaseGroupId: album.id, audience: "public" });
    const es = await load("fingerprint", author.id, "es");
    const en = await load("fingerprint", author.id, "en");
    check(es?.card.meta.some((fact) => fact.includes("1990s")), `la huella nombra la década (${es?.card.meta.join(" | ")})`);
    check(en?.card.meta.some((fact) => fact.startsWith("Mostly")), "y en inglés");

    await s.collection.addEntry(hidden.id, { releaseGroupId: album.id, format: "vinyl", audience: "public" });
    check((await load("user_collection", hidden.id, "es")) === null, "perfil privado: sin colección");
    check((await load("fingerprint", hidden.id, "es")) === null, "perfil privado: sin huella");

    console.log("Cuenta desactivada");
    const goneComment = await s.social.createComment(albumTarget, gone.id, "Me voy");
    await s.social.upsertRating(albumTarget, gone.id, 3);
    const goneReview = await s.reviews.createOrReplaceReview(albumTarget, gone.id, { title: null, body: "Reseña de quien se va" } as never);
    await db.update(appUser).set({ deactivatedAt: new Date() }).where(eq(appUser.id, gone.id));
    check((await s.social.getCommentPermalink(goneComment.id, null)) === null, "su comentario no tiene dirección");
    check((await load("review", goneReview.id, "es")) === null, "su reseña no tiene objetivo");
    check((await load("user_collection", gone.id, "es")) === null, "su colección tampoco");

    console.log("Eventos al eliminar una cuenta");
    const { ownShareEvents } = await import("../src/services/auth/account-lifecycle");
    const shared = (kind: ShareTargetKind, ref: string) => ({ targetKind: kind, targetRef: ref, channel: "copy" as const, format: "link" as const });
    const foreignReview = randomUUID();
    await db.insert(shareEvent).values([
      shared("profile", author.id),
      shared("user_collection", author.id),
      shared("fingerprint", author.id),
      shared("review", created.id),
      shared("comment", onAlbum.id),
      shared("list", list.id),
      shared("camino", path.id),
      shared("review", foreignReview),
      shared("profile", reader.id),
    ]);
    const removed = await db.delete(shareEvent).where(ownShareEvents(author.id)).returning();
    check(removed.length === 7, `se borran los 7 eventos de lo que era suyo (${removed.length})`);
    const kept = await db.delete(shareEvent).where(inArray(shareEvent.targetRef, [foreignReview, reader.id])).returning();
    check(kept.length === 2, "se conservan los de otras cuentas");

    console.log("\nSmoke test de lo que comparte una persona: OK");
  } finally {
    await db.delete(appUser).where(like(appUser.username, "smoke_share_%"));
    await db.delete(releaseGroup).where(eq(releaseGroup.mbid, ALBUM_MBID));
    await db.delete(artist).where(eq(artist.mbid, ARTIST_MBID));
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
