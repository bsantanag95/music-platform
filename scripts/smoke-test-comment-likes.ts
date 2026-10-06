export {};

// Smoke test del cambio add-comment-likes contra Postgres REAL (el SQL que las
// pruebas unitarias mockean): la migración 0062, el conteo con umbral, `likedByMe`,
// el orden y la cifra de "Comentarios populares", la exclusión de cuentas
// desactivadas del conteo, bloqueos, comentario propio, comentario oculto,
// suspensión social (dar like se rechaza, quitarlo no) y las cascadas.
// Escribe un artista sintético (MBID `5e0ce000-0000-4000-8000-0000000007c0`) y
// usuarios `smoke_like_*`, y los borra al terminar (también si falla). Si se
// interrumpió, limpiar con
//   DELETE FROM app_user WHERE username LIKE 'smoke_like_%';
//   DELETE FROM artist WHERE mbid::text LIKE '5e0ce000%';
// (el `ON DELETE CASCADE` limpia comentarios, likes, bloqueos y restricciones).
// Necesita la migración 0062 aplicada. Correr contra una BD de scratch:
//   ALLOW_SMOKE_ON_REAL_DB=1 npx tsx --env-file=.env scripts/smoke-test-comment-likes.ts

import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { eq, like, sql } from "drizzle-orm";
import { assertSmokeAllowed } from "./assert-smoke-allowed";
import { db } from "../src/db";
import { appUser, artist, comment, commentLike, userBlock, userRestriction } from "../src/db/schema";

assertSmokeAllowed();

const suffix = randomUUID().slice(0, 8);
const ARTIST_MBID = "5e0ce000-0000-4000-8000-0000000007c0";

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
  const [likes, social, home, authz] = await Promise.all([
    import("../src/services/social/comment-likes"),
    import("../src/services/social"),
    import("../src/services/home/home"),
    import("../src/services/auth/authorization"),
  ]);
  return { likes, social, home, authz };
}

const newUser = (label: string) => ({
  id: randomUUID(),
  username: `smoke_like_${label}_${suffix}`,
  email: `smoke_like_${label}_${suffix}@example.test`,
});

async function main() {
  const { likes, social, home, authz } = await loadServices();
  const author = newUser("author");
  const other = newUser("other");
  const viewer = newUser("viewer");
  const likers = [1, 2, 3, 4, 5].map((n) => newUser(`l${n}`));

  try {
    await db.insert(appUser).values([author, other, viewer, ...likers]);
    const [art] = await db
      .insert(artist)
      .values({ mbid: ARTIST_MBID, type: "group", name: `Smoke Likes ${suffix}` })
      .returning();
    if (!art) throw new Error("no se creó el artista sintético");
    const target = await social.resolveSocialTarget("artist", art.id);

    const [popular, quiet] = await db
      .insert(comment)
      .values([
        { userId: author.id, artistId: art.id, body: "comentario popular" },
        { userId: other.id, artistId: art.id, body: "comentario tranquilo pero bastante más largo que el otro" },
      ])
      .returning();
    if (!popular || !quiet) throw new Error("no se crearon los comentarios");

    console.log("Dar y quitar like");
    const first = await likes.likeComment(popular.id, likers[0]!.id);
    check(first.liked && first.likeCount === null, "el primer like no muestra cifra (bajo el umbral)");
    const repeated = await likes.likeComment(popular.id, likers[0]!.id);
    check(repeated.likeCount === null, "repetir el like es idempotente");
    const [rowsRow] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(commentLike)
      .where(eq(commentLike.commentId, popular.id));
    check(rowsRow?.n === 1, "una sola fila por (comentario, persona)");
    check((await codeOf(() => likes.likeComment(popular.id, author.id))) === "PERMISSION_DENIED", "no se puede likear el propio comentario");

    for (const liker of likers.slice(1, 4)) await likes.likeComment(popular.id, liker.id);
    await likes.likeComment(quiet.id, likers[0]!.id);
    await likes.likeComment(quiet.id, likers[1]!.id);

    console.log("Lectura con umbral y likedByMe");
    const listed = await social.listComments(target, 1, 20, likers[0]!.id);
    const popularRow = listed.comments.find((c) => c.id === popular.id);
    const quietRow = listed.comments.find((c) => c.id === quiet.id);
    check(popularRow?.likeCount === 4, "4 likes: se muestra la cifra real");
    check(popularRow?.likedByMe === true, "likedByMe verdadero para quien likeó");
    check(quietRow?.likeCount === null, "2 likes: la cifra no sale");
    const anon = await social.listComments(target, 1, 20, null);
    check(anon.comments.every((c) => c.likedByMe === false), "sin sesión, likedByMe es falso");
    check(!JSON.stringify(anon).includes(likers[0]!.id), "ninguna identidad de quien likeó en la respuesta");

    console.log("Comentarios populares");
    const ranked = (await home.listPopularComments(50, null)).artist;
    const iPopular = ranked.findIndex((c) => c.id === popular.id);
    const iQuiet = ranked.findIndex((c) => c.id === quiet.id);
    check(iPopular >= 0 && iQuiet >= 0 && iPopular < iQuiet, "más likes va primero, aunque el otro sea más largo");
    check(ranked[iPopular]?.likeCount === 4 && ranked[iQuiet]?.likeCount === null, "cifra umbralizada en el ranking");

    console.log("Cuentas desactivadas");
    await db.update(appUser).set({ deactivatedAt: new Date() }).where(eq(appUser.id, likers[3]!.id));
    check((await social.listComments(target, 1, 20, null)).comments.find((c) => c.id === popular.id)?.likeCount === 3, "el like de una cuenta desactivada no cuenta (4 → 3)");
    await db.update(appUser).set({ deactivatedAt: new Date() }).where(eq(appUser.id, likers[2]!.id));
    check((await social.listComments(target, 1, 20, null)).comments.find((c) => c.id === popular.id)?.likeCount === null, "con 2 likes activos la cifra desaparece");
    await db.update(appUser).set({ deactivatedAt: null }).where(eq(appUser.id, likers[3]!.id));
    await db.update(appUser).set({ deactivatedAt: null }).where(eq(appUser.id, likers[2]!.id));
    check((await social.listComments(target, 1, 20, null)).comments.find((c) => c.id === popular.id)?.likeCount === 4, "al reactivar vuelven a contar");

    console.log("Bloqueos");
    await db.insert(userBlock).values({ blockerId: viewer.id, blockedId: author.id });
    check((await codeOf(() => likes.likeComment(popular.id, viewer.id))) === "BLOCKED", "dar like con bloqueo (visitante → autor) se rechaza");
    const forViewer = (await home.listPopularComments(50, viewer.id)).artist;
    check(!forViewer.some((c) => c.id === popular.id), "el comentario del autor bloqueado sale de populares para quien bloqueó");
    check((await home.listPopularComments(50, likers[4]!.id)).artist.some((c) => c.id === popular.id), "para los demás sigue apareciendo");
    await db.delete(userBlock).where(eq(userBlock.blockerId, viewer.id));
    await db.insert(userBlock).values({ blockerId: author.id, blockedId: viewer.id });
    check((await codeOf(() => likes.likeComment(popular.id, viewer.id))) === "BLOCKED", "el bloqueo en sentido contrario también se rechaza");
    await db.delete(userBlock).where(eq(userBlock.blockerId, author.id));

    console.log("Suspensión social");
    await db.insert(userRestriction).values({ userId: likers[4]!.id, scope: "social_activity", reason: "smoke" });
    check((await codeOf(() => authz.requireSocialActivityAllowed(likers[4]!.id))) === "SOCIAL_SUSPENSION_ACTIVE", "la suspensión rechaza dar like (guarda de la ruta)");
    await likes.likeComment(popular.id, likers[4]!.id).catch(() => undefined);
    const unliked = await likes.unlikeComment(popular.id, likers[4]!.id);
    check(unliked.liked === false, "quitar un like sigue permitido bajo suspensión");

    console.log("Comentario oculto");
    await db.update(comment).set({ moderationStatus: "hidden" }).where(eq(comment.id, quiet.id));
    check((await codeOf(() => likes.likeComment(quiet.id, viewer.id))) === "COMMENT_NOT_FOUND", "dar like a un oculto responde COMMENT_NOT_FOUND");
    check(!(await home.listPopularComments(50, null)).artist.some((c) => c.id === quiet.id), "un comentario oculto no aparece en populares");

    console.log("Cascadas");
    await db.delete(comment).where(eq(comment.id, quiet.id));
    const [orphanedRow] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(commentLike)
      .where(eq(commentLike.commentId, quiet.id));
    check(orphanedRow?.n === 0, "borrar el comentario borra sus likes");
    await db.delete(appUser).where(eq(appUser.id, likers[0]!.id));
    const [byUserRow] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(commentLike)
      .where(eq(commentLike.userId, likers[0]!.id));
    check(byUserRow?.n === 0, "borrar la cuenta borra sus likes");

    console.log("\nSmoke test de likes en comentarios: OK");
  } finally {
    await db.delete(appUser).where(like(appUser.username, "smoke_like_%"));
    await db.delete(artist).where(eq(artist.mbid, ARTIST_MBID));
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
