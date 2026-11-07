export {};

// Smoke test de add-share-user-actions-phase2 contra Postgres REAL (el SQL que las pruebas unitarias mockean): la marca
// de valoración compartida (sin tocar `updated_at`, idempotente, cascada), los objetivos de valoración y escucha como
// anónimo y como dueño, la página de relación por visitante, el estado para la hoja, hacer público y dejar de compartir,
// y los eventos que se borran con la cuenta.
// Crea un artista y un álbum sintéticos (MBID `5e0ce000-0000-4000-8000-00000000c0b*`) y usuarios `smoke_rel_*`, y los
// borra al terminar (también si falla). Si se interrumpió, limpiar con
//   DELETE FROM app_user WHERE username LIKE 'smoke_rel_%';
//   DELETE FROM release_group WHERE mbid::text LIKE '5e0ce000-0000-4000-8000-00000000c0b%';
//   DELETE FROM artist WHERE mbid::text LIKE '5e0ce000-0000-4000-8000-00000000c0b%';
// (el `ON DELETE CASCADE` limpia lo demás). Necesita las migraciones 0079 a 0081. Correr contra una BD de scratch:
//   ALLOW_SMOKE_ON_REAL_DB=1 npx tsx --env-file=.env scripts/smoke-test-share-relation.ts

import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { and, eq, inArray, like } from "drizzle-orm";
import { assertSmokeAllowed } from "./assert-smoke-allowed";
import { db } from "../src/db";
import { appUser, artist, credit, favorite, listenEntry, rating, ratingShare, releaseGroup, shareEvent, userFollow } from "../src/db/schema";
import type { ShareTargetKind } from "../src/lib/share/kinds";

assertSmokeAllowed();

const suffix = randomUUID().slice(0, 8);
const ARTIST_MBID = "5e0ce000-0000-4000-8000-00000000c0b0";
const ALBUM_MBID = "5e0ce000-0000-4000-8000-00000000c0b1";

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
      return {
        cookies: async () => ({ get: () => undefined }),
        headers: async () => new Headers(),
        draftMode: async () => ({ isEnabled: false }),
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  const [social, own, targets, relation, lifecycle, highlights, stats] = await Promise.all([
    import("../src/services/social"),
    import("../src/services/share/own"),
    import("../src/services/share/targets/relation"),
    import("../src/services/profiles/relation"),
    import("../src/services/auth/account-lifecycle"),
    import("../src/services/rating-highlights/rating-highlights"),
    import("../src/services/profiles/stats"),
  ]);
  return { social, own, targets, relation, lifecycle, highlights, stats };
}

const newUser = (label: string) => ({
  id: randomUUID(),
  username: `smoke_rel_${label}_${suffix}`,
  email: `smoke_rel_${label}_${suffix}@example.test`,
});

async function main() {
  const s = await loadServices();
  const owner = newUser("owner");
  const follower = newUser("follower");
  const stranger = newUser("stranger");
  const hidden = newUser("private");

  try {
    await db.insert(appUser).values([owner, follower, stranger, { ...hidden, profileVisibility: "private" }]);
    const [art] = await db.insert(artist).values({ mbid: ARTIST_MBID, type: "group", name: `Smoke Relación ${suffix}` }).returning();
    const [album] = await db.insert(releaseGroup).values({ mbid: ALBUM_MBID, title: `Smoke Disco ${suffix}`, category: "studio" }).returning();
    if (!art || !album) throw new Error("no se crearon el artista y el álbum sintéticos");
    await db.insert(credit).values({ artistId: art.id, releaseGroupId: album.id, role: "primary", position: 0 });
    await db.insert(userFollow).values({ followerId: follower.id, followedId: owner.id, status: "accepted" });
    const albumTarget = await s.social.resolveSocialTarget("release-group", album.id);
    const artistTarget = await s.social.resolveSocialTarget("artist", art.id);

    await s.social.upsertRating(albumTarget, owner.id, 4.5, 86);
    const [own] = await db.select().from(rating).where(and(eq(rating.userId, owner.id), eq(rating.releaseGroupId, album.id)));
    if (!own) throw new Error("sin valoración");
    const view = (viewer: string | null, focus?: string) => s.relation.getRelationView(owner.username, "album", album.id, viewer, "es", focus);

    console.log("Sin marca");
    check((await view(null)) === null, "un anónimo recibe 404: no hay nada visible");
    check((await view(follower.id))?.rating?.detailedScore === 86, "un seguidor ve la valoración");
    check((await view(owner.id))?.rating !== null, "el dueño ve la valoración");
    check((await s.targets.loadRatingTarget(own.id, "es")) === null, "sin marca no hay objetivo anónimo");
    check((await s.targets.loadRatingTarget(own.id, "es", { owner: owner.id }))?.card.detailedScore === 86, "el dueño sí tiene su imagen");
    check((await s.targets.loadRatingTarget(own.id, "es", { owner: stranger.id })) === null, "otra persona no");
    const before = await s.own.ownShareState("rating", own.id, "es", owner.id);
    check(before.state === "needs_gesture" && before.payload.images[0]!.url.includes("personal=1"), "el estado pide el gesto, con la imagen personal");
    check((await codeOf(() => s.own.ownShareState("rating", own.id, "es", stranger.id))) === "RATING_NOT_FOUND", "lo ajeno responde 404");

    console.log("Con marca");
    const updatedBefore = own.updatedAt.toISOString();
    const after = await s.own.makeOwnPublic("rating", own.id, "es", owner.id);
    await s.own.makeOwnPublic("rating", own.id, "es", owner.id);
    check(after.state === "public" && after.canUnshare, "queda pública y se puede dejar de compartir");
    check(!after.payload.images[0]!.url.includes("personal"), "la imagen pasa a ser la pública");
    check((await db.select().from(ratingShare).where(eq(ratingShare.ratingId, own.id))).length === 1, "marcar dos veces no duplica");
    const [touched] = await db.select().from(rating).where(eq(rating.id, own.id));
    check(touched?.updatedAt.toISOString() === updatedBefore, "`rating.updated_at` no cambia");
    check((await view(null))?.rating?.detailedScore === 86, "un anónimo la ve, con su puntaje");
    const ratingTarget = await s.targets.loadRatingTarget(own.id, "es");
    check(ratingTarget?.card.detailedScore === 86 && ratingTarget.canonicalPath.includes(`/users/${owner.username}/album/`), "el objetivo apunta a la relación");
    check((await s.targets.loadRelationTarget(owner.username, "album", album.id, "es"))?.kind === "rating", "la página anuncia la valoración");
    const fingerprint = await s.stats.getTasteFingerprint(owner.username, null);
    check(fingerprint?.ratingCurve === null, "la huella de un anónimo sigue sin valoraciones");

    console.log("Editar y borrar");
    const version = (await import("../src/services/share/targets")).shareTargetVersion;
    const v1 = version(ratingTarget!);
    await s.social.upsertRating(albumTarget, owner.id, 5, 95);
    const edited = await s.targets.loadRatingTarget(own.id, "es");
    check(edited?.card.detailedScore === 95 && version(edited) !== v1, "editar conserva la marca, muestra la nota nueva y cambia la versión");
    await s.own.stopSharing("rating", own.id, "es", owner.id);
    check((await view(null)) === null, "dejar de compartir la vuelve a su regla general");
    await s.highlights.highlightRating(owner.id, own.id);
    check((await s.targets.loadRatingTarget(own.id, "es")) !== null, "una destacada cuenta como pública");
    await s.highlights.unhighlightRating(owner.id, own.id);
    await s.own.makeOwnPublic("rating", own.id, "es", owner.id);
    await s.social.deleteRating(albumTarget, owner.id);
    check((await db.select().from(ratingShare).where(eq(ratingShare.ratingId, own.id))).length === 0, "borrar la valoración borra la marca");

    console.log("Valoración de un artista");
    await s.social.upsertRating(artistTarget, owner.id, 4);
    const [ofArtist] = await db.select().from(rating).where(and(eq(rating.userId, owner.id), eq(rating.artistId, art.id)));
    check((await codeOf(() => s.own.makeOwnPublic("rating", ofArtist!.id, "es", owner.id))) === "RATING_NOT_FOUND", "no se puede marcar");

    console.log("Escuchas");
    const [privateListen] = await db.insert(listenEntry).values({ userId: owner.id, releaseGroupId: album.id, listenContext: "first_listen", audience: "private", body: "Mi impresión" }).returning();
    const [publicListen] = await db.insert(listenEntry).values({ userId: owner.id, releaseGroupId: album.id, listenContext: "relisten", audience: "public", reaction: "loved" }).returning();
    check((await view(null))?.listens.length === 1, "un anónimo ve solo la pública");
    check((await view(null, privateListen!.id))?.listens.every((l) => l.id !== privateListen!.id), "`?escucha=` no revela la privada");
    check((await view(owner.id, privateListen!.id))?.listens[0]?.focused === true, "al dueño se la pone primera");
    check((await s.targets.loadRelationTarget(owner.username, "album", album.id, "es", privateListen!.id))?.ref === publicListen!.id, "los metadatos caen en la pública");
    const listenState = await s.own.ownShareState("listen", privateListen!.id, "es", owner.id);
    check(listenState.state === "needs_gesture" && listenState.hasNote, "avisa que tiene impresión");
    await s.own.makeOwnPublic("listen", privateListen!.id, "es", owner.id);
    const [opened] = await db.select().from(listenEntry).where(eq(listenEntry.id, privateListen!.id));
    check(opened?.audience === "public", "hacerla pública cambia solo esa audiencia");
    const listenTarget = await s.targets.loadListenTarget(privateListen!.id, "en");
    check(listenTarget?.card.quote === "Mi impresión" && listenTarget.canonicalPath.endsWith(`?escucha=${privateListen!.id}`), "el objetivo lleva la cita y su dirección");
    check((await s.targets.loadListenTarget(publicListen!.id, "es"))?.card.meta.includes("Me encantó"), "la reacción sale del diario");
    const [artistListen] = await db.insert(listenEntry).values({ userId: owner.id, artistId: art.id, listenContext: "first_listen", audience: "public" }).returning();
    check((await s.targets.loadListenTarget(artistListen!.id, "es")) === null, "una escucha de artista no tiene objetivo");

    console.log("Favorito y perfil privado");
    await db.insert(favorite).values({ userId: stranger.id, releaseGroupId: album.id, audience: "public" });
    const onlyFavorite = await s.relation.getRelationView(stranger.username, "album", album.id, null, "es");
    check(onlyFavorite?.favorite === true && onlyFavorite.rating === null, "un favorito público alcanza para la página");
    await s.social.upsertRating(albumTarget, hidden.id, 4);
    const [hiddenRating] = await db.select().from(rating).where(and(eq(rating.userId, hidden.id), eq(rating.releaseGroupId, album.id)));
    check((await s.own.ownShareState("rating", hiddenRating!.id, "es", hidden.id)).state === "private_profile", "perfil privado: sin gesto");
    check((await codeOf(() => s.own.makeOwnPublic("rating", hiddenRating!.id, "es", hidden.id))) === "PROFILE_PRIVATE", "hacerla pública responde PROFILE_PRIVATE");
    check((await db.select().from(ratingShare).where(eq(ratingShare.ratingId, hiddenRating!.id))).length === 0, "y no crea la marca");
    await db.insert(ratingShare).values({ userId: hidden.id, ratingId: hiddenRating!.id });
    check((await s.relation.getRelationView(hidden.username, "album", album.id, null, "es")) === null, "una marca anterior no abre un perfil privado");
    check((await s.targets.loadRatingTarget(hiddenRating!.id, "es")) === null, "ni su imagen");
    check((await s.targets.loadRatingTarget(hiddenRating!.id, "es", { owner: hidden.id })) !== null, "el dueño conserva su imagen privada");

    console.log("Eventos al eliminar una cuenta");
    const shared = (kind: ShareTargetKind, ref: string) => ({ targetKind: kind, targetRef: ref, channel: "copy" as const, format: "link" as const });
    await db.insert(shareEvent).values([shared("rating", ofArtist!.id), shared("listen", publicListen!.id), shared("rating", hiddenRating!.id)]);
    const removed = await db.delete(shareEvent).where(s.lifecycle.ownShareEvents(owner.id)).returning();
    check(removed.length === 2, `se borran los de la cuenta (${removed.length})`);
    const kept = await db.delete(shareEvent).where(inArray(shareEvent.targetRef, [hiddenRating!.id])).returning();
    check(kept.length === 1, "se conserva el de otra cuenta");

    console.log("\nSmoke test de las páginas de relación: OK");
  } finally {
    await db.delete(appUser).where(like(appUser.username, "smoke_rel_%"));
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
