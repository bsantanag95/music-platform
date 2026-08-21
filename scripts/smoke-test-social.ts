export {};

// Smoke test del cambio add-social-profile-follow (perfil, seguimiento y
// bloqueo). Escribe fixtures en la BD apuntada por DATABASE_URL y los limpia
// al final. Mockea nada: usa Postgres real y los servicios sociales reales.
// Correr idealmente contra una BD de scratch:
//   ALLOW_SMOKE_ON_REAL_DB=1 npx tsx --env-file=.env scripts/smoke-test-social.ts

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { assertSmokeAllowed } from "./assert-smoke-allowed";
import { db } from "../src/db";
import { appUser, userBlock, userFollow } from "../src/db/schema";
import { blockUser, listBlocks, unblockUser } from "../src/services/social/blocking";
import {
  approveRequest,
  followUser,
  listFollowers,
  listFollowRequests,
  listFollowing,
  rejectRequest,
  unfollowUser,
} from "../src/services/social/following";
import {
  getOwnProfile,
  getProfileByUsername,
  searchUsers,
  updateProfileVisibility,
} from "../src/services/social/profiles";

assertSmokeAllowed();

const suffix = randomUUID().slice(0, 8);
const publicUser = {
  id: randomUUID(),
  username: `smoke-social-public-${suffix}`,
  email: `smoke-social-public-${suffix}@example.test`,
};
const privateUser = {
  id: randomUUID(),
  username: `smoke-social-private-${suffix}`,
  email: `smoke-social-private-${suffix}@example.test`,
};
const viewer = {
  id: randomUUID(),
  username: `smoke-social-viewer-${suffix}`,
  email: `smoke-social-viewer-${suffix}@example.test`,
};

async function main() {
  try {
    await db.insert(appUser).values([publicUser, privateUser, viewer]);

    const publicProfile = await getProfileByUsername(publicUser.username, viewer.id);
    if (publicProfile.profileVisibility !== "public") throw new Error("perfil público no expuesto");

    // Seguir perfil público → accepted.
    const followedPublic = await followUser(viewer.id, publicUser.username);
    if (followedPublic.relation !== "following") throw new Error("seguir público no quedó accepted");

    // Perfil privado: cambia visibilidad y seguirlo crea una solicitud pending.
    await updateProfileVisibility(privateUser.id, "private");
    const followedPrivate = await followUser(viewer.id, privateUser.username);
    if (followedPrivate.relation !== "requested") throw new Error("seguir privado no creó solicitud");

    const requests = await listFollowRequests(privateUser.id, 1, 20);
    if (!requests.users.some((u) => u.id === viewer.id)) {
      throw new Error("la solicitud no aparece en las solicitudes recibidas");
    }

    // Aprobar y verificar que aparece como seguidor; luego rechazar una nueva.
    await approveRequest(privateUser.id, viewer.id);
    const followers = await listFollowers(privateUser.id, 1, 20);
    if (!followers.users.some((u) => u.id === viewer.id)) {
      throw new Error("el aprobado no aparece en seguidores");
    }

    await unfollowUser(viewer.id, privateUser.username);
    await followUser(viewer.id, privateUser.username);
    await rejectRequest(privateUser.id, viewer.id);
    const afterReject = await listFollowRequests(privateUser.id, 1, 20);
    if (afterReject.users.some((u) => u.id === viewer.id)) {
      throw new Error("la solicitud rechazada siguió visible");
    }

    // Seguir al perfil público y verificar listados propios.
    const following = await listFollowing(viewer.id, 1, 20);
    if (!following.users.some((u) => u.id === publicUser.id)) {
      throw new Error("el seguido no aparece en la lista de seguidos");
    }

    // Búsqueda devuelve perfiles públicos y privados.
    const results = await searchUsers(suffix, viewer.id, 1, 20);
    if (results.users.length < 2) throw new Error("la búsqueda no devolvió ambos perfiles");

    // Bloqueo y desbloqueo.
    await blockUser(viewer.id, privateUser.username);
    const blocks = await listBlocks(viewer.id, 1, 20);
    if (!blocks.users.some((u) => u.id === privateUser.id)) {
      throw new Error("el bloqueado no aparece en la lista de bloqueos");
    }
    await unblockUser(viewer.id, privateUser.username);
    const afterUnblock = await listBlocks(viewer.id, 1, 20);
    if (afterUnblock.users.some((u) => u.id === privateUser.id)) {
      throw new Error("el desbloqueado sigue en la lista");
    }

    const own = await getOwnProfile(viewer.id);
    if (own.profileVisibility !== "public") throw new Error("perfil propio no es público por defecto");

    console.log("✅ smoke-test-social: todos los casos pasaron");
  } finally {
    await db.delete(userFollow).where(eq(userFollow.followerId, viewer.id));
    await db.delete(userFollow).where(eq(userFollow.followedId, viewer.id));
    await db.delete(userBlock).where(eq(userBlock.blockerId, viewer.id));
    await db.delete(userBlock).where(eq(userBlock.blockedId, viewer.id));
    await db.delete(appUser).where(
      and(eq(appUser.id, publicUser.id), eq(appUser.username, publicUser.username)),
    );
    await db.delete(appUser).where(
      and(eq(appUser.id, privateUser.id), eq(appUser.username, privateUser.username)),
    );
    await db.delete(appUser).where(
      and(eq(appUser.id, viewer.id), eq(appUser.username, viewer.username)),
    );
    console.log("🧹 smoke-test-social: fixtures limpiados");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ smoke-test-social falló:", error);
    process.exit(1);
  });