export {};

// Smoke test del cambio add-comment-replies contra Postgres REAL (el SQL que las pruebas
// unitarias mockean): la migración 0066 (`parent_id`, el CHECK de tema requerido recreado y
// `chk_comment_reply_no_topic`), crear respuestas (copian el artista, heredan el tema, suben a
// la raíz), el rechazo en álbum / raíz oculta / bloqueo, `replyCount` (sin ocultas ni cuentas
// desactivadas), que el listado solo trae raíces, el hilo de la más antigua a la más reciente,
// que el feed, la actividad de la comunidad, el rastro propio y "Comentarios populares" NO
// muestran respuestas (aunque tengan más likes que cualquier raíz), los likes sobre respuestas,
// la moderación, la exportación de datos y las cascadas (raíz → respuestas → likes).
// Escribe un artista y un álbum sintéticos (MBID `5e0ce000-0000-4000-8000-0000000009b0` /
// `...09b1`) y usuarios `smoke_reply_*`, y los borra al terminar (también si falla). Si se
// interrumpió, limpiar con
//   DELETE FROM app_user WHERE username LIKE 'smoke_reply_%';
//   DELETE FROM release_group WHERE mbid::text LIKE '5e0ce000%';
//   DELETE FROM artist WHERE mbid::text LIKE '5e0ce000%';
// (el `ON DELETE CASCADE` limpia comentarios, respuestas, likes y bloqueos).
// Necesita las migraciones 0065 y 0066 aplicadas. Correr contra una BD de scratch:
//   ALLOW_SMOKE_ON_REAL_DB=1 npx tsx --env-file=.env scripts/smoke-test-comment-replies.ts

import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { eq, like, sql } from "drizzle-orm";
import { assertSmokeAllowed } from "./assert-smoke-allowed";
import { db } from "../src/db";
import { appUser, artist, comment, commentLike, releaseGroup, userBlock, userFollow } from "../src/db/schema";

assertSmokeAllowed();

const suffix = randomUUID().slice(0, 8);
const ARTIST_MBID = "5e0ce000-0000-4000-8000-0000000009b0";
const ALBUM_MBID = "5e0ce000-0000-4000-8000-0000000009b1";

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
  const [social, likes, home, feed, activity, exporter] = await Promise.all([
    import("../src/services/social"),
    import("../src/services/social/comment-likes"),
    import("../src/services/home/home"),
    import("../src/services/feed/feed"),
    import("../src/services/activity/community-activity"),
    import("../src/services/profiles/data-export"),
  ]);
  return { social, likes, home, feed, activity, exporter };
}

const newUser = (label: string) => ({
  id: randomUUID(),
  username: `smoke_reply_${label}_${suffix}`,
  email: `smoke_reply_${label}_${suffix}@example.test`,
});

async function main() {
  const { social, likes, home, feed, activity, exporter } = await loadServices();
  const author = newUser("author");
  const replier = newUser("replier");
  const other = newUser("other");
  const follower = newUser("follower");
  const fans = [1, 2, 3, 4].map((n) => newUser(`fan${n}`));

  try {
    await db.insert(appUser).values([author, replier, other, follower, ...fans]);
    const [art] = await db
      .insert(artist)
      .values({ mbid: ARTIST_MBID, type: "group", name: `Smoke Respuestas ${suffix}` })
      .returning();
    const [album] = await db
      .insert(releaseGroup)
      .values({ mbid: ALBUM_MBID, title: `Smoke Disco ${suffix}`, category: "studio" })
      .returning();
    if (!art || !album) throw new Error("no se crearon el artista y el álbum sintéticos");
    const artistTarget = await social.resolveSocialTarget("artist", art.id);
    const albumTarget = await social.resolveSocialTarget("release-group", album.id);

    console.log("Migración 0066: estructura");
    const constraints = await db.execute<{ conname: string }>(
      sql`SELECT conname FROM pg_constraint WHERE conrelid = 'comment'::regclass AND conname LIKE 'chk_comment_%topic%'`,
    );
    check(
      constraints.map((row) => row.conname).sort().join(",") ===
        "chk_comment_artist_topic_required,chk_comment_reply_no_topic,chk_comment_topic_artist_only,chk_comment_topic_values",
      "los CHECK de tema siguen y suman chk_comment_reply_no_topic",
    );
    const index = await db.execute<{ indexname: string }>(
      sql`SELECT indexname FROM pg_indexes WHERE tablename = 'comment' AND indexname = 'idx_comment_parent'`,
    );
    check(index.length === 1, "el índice parcial idx_comment_parent existe");

    console.log("CHECK directos en la base");
    const failed = async (fn: () => Promise<unknown>) => (await codeOf(fn)) !== null;
    const root = await social.createComment(artistTarget, author.id, "¿Cuál es su mejor álbum?", "albums");
    check(await failed(() => db.insert(comment).values({ userId: replier.id, artistId: art.id, parentId: root.id, body: "x", topic: "albums" })), "una respuesta con tema propio se rechaza");
    check(await failed(() => db.insert(comment).values({ userId: replier.id, artistId: art.id, body: "x", topic: null })), "una raíz de artista sin tema sigue rechazándose");
    const [rawReply] = await db.insert(comment).values({ userId: replier.id, artistId: art.id, parentId: root.id, body: "directa", topic: null }).returning();
    check(rawReply?.parentId === root.id, "una respuesta con topic NULL se acepta");
    await db.delete(comment).where(eq(comment.id, rawReply!.id));

    console.log("Crear respuestas (servicio)");
    const first = await social.createReply(root.id, replier.id, "  Yo digo que el primero  ");
    check(first.parentId === root.id && first.topic === "albums" && first.body === "Yo digo que el primero", "la respuesta cuelga de la raíz, hereda el tema y recorta el texto");
    const [firstRow] = await db.select().from(comment).where(eq(comment.id, first.id));
    check(firstRow?.artistId === art.id && firstRow.topic === null && firstRow.releaseGroupId === null, "la fila copia el artista de la raíz y no guarda tema");
    const second = await social.createReply(first.id, other.id, "Para mí el tercero");
    check(second.parentId === root.id, "responder a una respuesta cuelga de la misma raíz");
    const third = await social.createReply(root.id, replier.id, "Y el último");
    check((await codeOf(() => social.createReply(root.id, replier.id, "   "))) === "INVALID_COMMENT", "un texto vacío responde INVALID_COMMENT");
    check((await codeOf(() => social.createReply(randomUUID(), replier.id, "x"))) === "COMMENT_NOT_FOUND", "responder a un id inexistente responde COMMENT_NOT_FOUND");
    const albumComment = await social.createComment(albumTarget, author.id, "buen disco");
    check((await codeOf(() => social.createReply(albumComment.id, replier.id, "x"))) === "REPLIES_NOT_ALLOWED", "un comentario de álbum no admite respuestas");

    console.log("Listado: solo raíces, con replyCount");
    const listed = await social.listComments(artistTarget, 1, 50, null);
    check(listed.comments.length === 1 && listed.comments[0]!.id === root.id, "el listado de la página trae solo la raíz");
    check(listed.comments[0]!.replyCount === 3, "replyCount cuenta las 3 respuestas visibles");
    check(!listed.comments.some((c) => [first.id, second.id, third.id].includes(c.id)), "ninguna respuesta aparece como raíz");
    const byTopic = await social.listComments(artistTarget, 1, 50, null, "albums");
    check(byTopic.comments.length === 1 && byTopic.comments[0]!.id === root.id, "el filtro por tema también trae solo raíces");

    console.log("Hilo: de la más antigua a la más reciente");
    const thread = await social.listReplies(root.id, 1, 50, null);
    check(thread.comments.map((c) => c.id).join() === [first.id, second.id, third.id].join(), "el hilo sale en orden cronológico");
    check(thread.comments.every((c) => c.parentId === root.id && c.topic === "albums" && c.replyCount === 0), "cada respuesta trae su raíz y el tema heredado");
    const page1 = await social.listReplies(root.id, 1, 2, null);
    const page2 = await social.listReplies(root.id, 2, 2, null);
    check(page1.comments.length === 2 && page1.hasNext && page2.comments.length === 1 && !page2.hasNext, "el hilo pagina");
    check((await codeOf(() => social.listReplies(first.id))) === "COMMENT_NOT_FOUND", "el hilo de una respuesta responde COMMENT_NOT_FOUND");

    console.log("replyCount: ocultas y cuentas desactivadas");
    await db.update(comment).set({ moderationStatus: "hidden" }).where(eq(comment.id, third.id));
    check((await social.listComments(artistTarget, 1, 50, null)).comments[0]!.replyCount === 2, "una respuesta oculta deja de contar");
    check(!(await social.listReplies(root.id, 1, 50, null)).comments.some((c) => c.id === third.id), "una respuesta oculta no sale en el hilo");
    await db.update(appUser).set({ deactivatedAt: new Date() }).where(eq(appUser.id, other.id));
    check((await social.listComments(artistTarget, 1, 50, null)).comments[0]!.replyCount === 1, "la respuesta de una cuenta desactivada deja de contar");
    await db.update(appUser).set({ deactivatedAt: null }).where(eq(appUser.id, other.id));
    await db.update(comment).set({ moderationStatus: "visible" }).where(eq(comment.id, third.id));
    check((await social.listComments(artistTarget, 1, 50, null)).comments[0]!.replyCount === 3, "al restaurar y reactivar vuelven a contar");

    console.log("Bloqueos y raíz oculta");
    await db.insert(userBlock).values({ blockerId: author.id, blockedId: other.id });
    check((await codeOf(() => social.createReply(root.id, other.id, "x"))) === "BLOCKED", "responder con un bloqueo en cualquier dirección responde BLOCKED");
    await db.delete(userBlock).where(eq(userBlock.blockerId, author.id));
    await db.update(comment).set({ moderationStatus: "hidden" }).where(eq(comment.id, root.id));
    check((await codeOf(() => social.createReply(root.id, replier.id, "x"))) === "COMMENT_NOT_FOUND", "responder a una raíz oculta responde COMMENT_NOT_FOUND");
    check((await codeOf(() => social.createReply(first.id, replier.id, "x"))) === "COMMENT_NOT_FOUND", "responder a una respuesta cuya raíz está oculta responde COMMENT_NOT_FOUND");
    check((await codeOf(() => social.listReplies(root.id))) === "COMMENT_NOT_FOUND", "el hilo de una raíz oculta responde COMMENT_NOT_FOUND");
    check((await codeOf(() => likes.likeComment(first.id, fans[0]!.id))) === "COMMENT_NOT_FOUND", "dar like a una respuesta de una raíz oculta responde COMMENT_NOT_FOUND");
    await db.update(comment).set({ moderationStatus: "visible" }).where(eq(comment.id, root.id));

    console.log("Likes sobre respuestas");
    for (const fan of fans) await likes.likeComment(second.id, fan.id);
    check((await likes.likeComment(second.id, replier.id)).likeCount === 5, "una respuesta se likea y la cifra sale desde el umbral");
    check((await codeOf(() => likes.likeComment(second.id, other.id))) === "PERMISSION_DENIED", "no se puede likear la propia respuesta");
    const threadWithLikes = await social.listReplies(root.id, 1, 50, fans[0]!.id);
    const likedReply = threadWithLikes.comments.find((c) => c.id === second.id);
    check(likedReply?.likeCount === 5 && likedReply.likedByMe === true, "el hilo trae likeCount y likedByMe de la respuesta");

    console.log("Superficies: ninguna muestra respuestas");
    await db.insert(userFollow).values({ followerId: follower.id, followedId: replier.id, status: "accepted" } as never);
    await db.insert(userFollow).values({ followerId: follower.id, followedId: author.id, status: "accepted" } as never);
    const feedResult = await feed.listFeed(follower.id, 1, 50);
    const feedIds = feedResult.entries.filter((e) => e.kind === "comment").map((e) => e.id);
    check(feedIds.includes(root.id), "el feed trae el comentario raíz de quien sigue");
    check(![first.id, second.id, third.id].some((id) => feedIds.includes(id)), "el feed no trae ninguna respuesta");
    const community = await activity.listCommunityActivity(follower.id, 1, 50);
    const communityIds = community.entries.filter((e) => e.kind === "comment").map((e) => e.id);
    check(communityIds.includes(root.id) && ![first.id, second.id, third.id].some((id) => communityIds.includes(id)), "la actividad de la comunidad trae la raíz y no las respuestas");
    const mine = await home.listMyRecentActivity(replier.id, 1, 20);
    const mineIds = mine.entries.filter((e) => e.kind === "comment").map((e) => e.id);
    check(mineIds.length === 0, "el rastro propio de quien solo respondió no muestra sus respuestas");
    const popular = await home.listPopularComments(200, null);
    check(!popular.artist.some((c) => [first.id, second.id, third.id].includes(c.id)), "Comentarios populares no trae respuestas (aunque una tenga 5 likes)");

    console.log("Exportación de datos");
    const exported = await exporter.buildDataExport(replier.id);
    const exportedComments = exported.activity.comments as { id: string; parentId?: string | null }[];
    check(exportedComments.find((c) => c.id === first.id)?.parentId === root.id, "la exportación incluye las respuestas con su parentId");

    console.log("Edición y borrado");
    const edited = await social.updateComment(first.id, replier.id, "Yo digo que el segundo");
    check(edited.body === "Yo digo que el segundo" && edited.parentId === root.id && edited.topic === "albums", "editar una respuesta cambia el texto y conserva raíz y tema");
    await social.deleteComment(third.id, replier.id);
    check((await social.listComments(artistTarget, 1, 50, null)).comments[0]!.replyCount === 2, "borrar una respuesta baja replyCount y no toca la raíz");

    console.log("Cascadas");
    const [likesBefore] = await db.select({ n: sql<number>`count(*)::int` }).from(commentLike).where(eq(commentLike.commentId, second.id));
    check(likesBefore?.n === 5, "la respuesta likeada tiene sus 5 likes antes de borrar la raíz");
    await social.deleteComment(root.id, author.id);
    const [left] = await db.select({ n: sql<number>`count(*)::int` }).from(comment).where(eq(comment.artistId, art.id));
    check(left?.n === 0, "borrar la raíz borra todas sus respuestas");
    const [likesAfter] = await db.select({ n: sql<number>`count(*)::int` }).from(commentLike).where(eq(commentLike.commentId, second.id));
    check(likesAfter?.n === 0, "borrar el hilo borra también los likes de sus respuestas");

    const root2 = await social.createComment(artistTarget, author.id, "otro tema", "general");
    await social.createReply(root2.id, replier.id, "respuesta");
    await db.delete(appUser).where(eq(appUser.id, replier.id));
    check((await social.listComments(artistTarget, 1, 50, null)).comments[0]!.replyCount === 0, "borrar la cuenta de quien respondió borra sus respuestas");

    console.log("\nSmoke test de respuestas a comentarios: OK");
  } finally {
    await db.delete(appUser).where(like(appUser.username, "smoke_reply_%"));
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
