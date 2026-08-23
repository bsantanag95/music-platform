export {};

// Smoke test del cambio add-diary-social-surfaces (diario visible en
// perfiles y feed). Escribe fixtures en la BD apuntada por DATABASE_URL y
// los limpia al final. Correr contra BD de scratch:
//   ALLOW_SMOKE_ON_REAL_DB=1 npx tsx --env-file=.env scripts/smoke-test-diary-social.ts

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { assertSmokeAllowed } from "./assert-smoke-allowed";
import { db } from "../src/db";
import { appUser, artist, listenEntry, userBlock, userFollow } from "../src/db/schema";
import { listFeed, listUserDiary } from "../src/services/diary/diary";
import { followUser, approveRequest } from "../src/services/social/following";
import { updateProfileVisibility } from "../src/services/social/profiles";
import { blockUser, unblockUser } from "../src/services/social/blocking";

assertSmokeAllowed();

const suffix = randomUUID().slice(0, 8);
const publicOwner = {
  id: randomUUID(),
  username: `smoke-diary-pub-${suffix}`,
  email: `smoke-diary-pub-${suffix}@example.test`,
};
const privateOwner = {
  id: randomUUID(),
  username: `smoke-diary-priv-${suffix}`,
  email: `smoke-diary-priv-${suffix}@example.test`,
};
const viewer = {
  id: randomUUID(),
  username: `smoke-diary-viewer-${suffix}`,
  email: `smoke-diary-viewer-${suffix}@example.test`,
};

// Artista sintético (mbid falso): listen_entry.artist_id tiene FK hacia
// artist, así que hay que crearlo ANTES de insertar las entradas (un UUID
// random violaría la constraint). Se borra al final para no contaminar el
// catálogo. Mismo patrón que smoke-test-diary.ts.
const syntheticArtist = {
  id: randomUUID(),
  mbid: randomUUID(),
  type: "person" as const,
  name: `Smoke Diary Social Artist ${suffix}`,
};
const artistId = syntheticArtist.id;

async function main() {
  try {
    // Crear usuarios, artista sintético y seguir al público.
    await db.insert(appUser).values([publicOwner, privateOwner, viewer]);
    await db.insert(artist).values(syntheticArtist);
    await followUser(viewer.id, publicOwner.username);
    const requests = await import("../src/services/social/following").then((m) =>
      m.listFollowRequests(publicOwner.id, 1, 20),
    );
    const pending = requests.users.find((u) => u.id === viewer.id);
    if (pending) await approveRequest(publicOwner.id, viewer.id);

    // Crear entradas del diario con distintas audiencias.
    // Pública del owner público → debería verse en el feed.
    await db
      .insert(listenEntry)
      .values({
        userId: publicOwner.id,
        artistId,
        listenContext: "first_listen",
        audience: "public",
      })
      .returning();

    // Privada del owner público → NO debería verse en el feed.
    await db
      .insert(listenEntry)
      .values({
        userId: publicOwner.id,
        artistId,
        listenContext: "relisten",
        body: "Esta es privada",
        audience: "private",
      })
      .returning();

    // Followers del owner público → debería verse (viewer es seguidor aprobado).
    await db
      .insert(listenEntry)
      .values({
        userId: publicOwner.id,
        artistId,
        listenContext: "relisten",
        audience: "followers",
      })
      .returning();

    // Perfil privado: cambiar visibilidad y crear entradas públicas.
    await updateProfileVisibility(privateOwner.id, "private");
    await db
      .insert(listenEntry)
      .values({
        userId: privateOwner.id,
        artistId,
        listenContext: "first_listen",
        audience: "public",
      })
      .returning();

    // === Verificar diario en perfil público ===
    const publicDiary = await listUserDiary(publicOwner.username, viewer.id, 1, 20);
    if (publicDiary.entries.length < 2) {
      throw new Error(`diario público: esperaba ≥2 entradas, obtuvo ${publicDiary.entries.length}`);
    }
    // La entrada privada no debería estar.
    const hasPrivate = publicDiary.entries.some((e) => e.body === "Esta es privada");
    if (hasPrivate) throw new Error("diario público: entrada privada visible");

    // === Verificar diario en perfil privado (viewer no es seguidor) ===
    const privateDiary = await listUserDiary(privateOwner.username, viewer.id, 1, 20);
    if (privateDiary.entries.length !== 0) {
      throw new Error(`diario privado: esperaba 0 entradas, obtuvo ${privateDiary.entries.length}`);
    }

    // === Verificar feed ===
    const feed = await listFeed(viewer.id, 1, 20);
    // Solo las entradas pública y followers del owner público.
    const feedPubOwnerEntries = feed.entries.filter((e) => e.author.username === publicOwner.username);
    if (feedPubOwnerEntries.length !== 2) {
      throw new Error(`feed: esperaba 2 entradas del owner público, obtuvo ${feedPubOwnerEntries.length}`);
    }
    // La entrada privada del owner público no debe estar.
    const feedHasPrivate = feed.entries.some((e) => e.body === "Esta es privada");
    if (feedHasPrivate) throw new Error("feed: entrada privada visible");

    // === Verificar bloqueo: al bloquear, las entradas desaparecen del feed ===
    await blockUser(viewer.id, publicOwner.username);
    const feedAfterBlock = await listFeed(viewer.id, 1, 20);
    const feedAfterBlockPub = feedAfterBlock.entries.filter(
      (e) => e.author.username === publicOwner.username,
    );
    if (feedAfterBlockPub.length !== 0) {
      throw new Error("feed después de bloqueo: entradas del bloqueado siguen visibles");
    }

    // Limpiar bloqueo para la limpieza final.
    await unblockUser(viewer.id, publicOwner.username);

    console.log("✅ smoke-test-diary-social: todos los casos pasaron");
  } finally {
    // Limpiar en orden correcto (foreign keys).
    await db.delete(listenEntry).where(eq(listenEntry.userId, publicOwner.id));
    await db.delete(listenEntry).where(eq(listenEntry.userId, privateOwner.id));
    await db.delete(artist).where(eq(artist.id, syntheticArtist.id));
    await db.delete(userFollow).where(eq(userFollow.followerId, viewer.id));
    await db.delete(userFollow).where(eq(userFollow.followedId, viewer.id));
    await db.delete(userBlock).where(eq(userBlock.blockerId, viewer.id));
    await db.delete(userBlock).where(eq(userBlock.blockedId, viewer.id));
    await db.delete(appUser).where(
      and(eq(appUser.id, publicOwner.id), eq(appUser.username, publicOwner.username)),
    );
    await db.delete(appUser).where(
      and(eq(appUser.id, privateOwner.id), eq(appUser.username, privateOwner.username)),
    );
    await db.delete(appUser).where(
      and(eq(appUser.id, viewer.id), eq(appUser.username, viewer.username)),
    );
    console.log("🧹 smoke-test-diary-social: fixtures limpiados");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ smoke-test-diary-social falló:", error);
    process.exit(1);
  });
