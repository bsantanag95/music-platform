export {};

// Smoke test del cambio add-artist-comment-topics contra Postgres REAL (el SQL que las
// pruebas unitarias mockean): la migración 0065 (columna `topic`, los tres CHECK con
// nombre y el índice parcial), el tema por defecto, los rechazos con `INVALID_TOPIC`, el
// filtro por tema con paginación, que el tema no cambia al editar, y las superficies que
// muestran un comentario de artista (feed del seguidor, actividad de la comunidad,
// "Comentarios populares" y la exportación de datos).
// Escribe un artista y un álbum sintéticos (MBID `5e0ce000-0000-4000-8000-0000000009a0` /
// `...09a1`) y usuarios `smoke_topic_*`, y los borra al terminar (también si falla). Si se
// interrumpió, limpiar con
//   DELETE FROM app_user WHERE username LIKE 'smoke_topic_%';
//   DELETE FROM release_group WHERE mbid::text LIKE '5e0ce000%';
//   DELETE FROM artist WHERE mbid::text LIKE '5e0ce000%';
// (el `ON DELETE CASCADE` limpia los comentarios). Necesita la migración 0065 aplicada.
// Correr contra una BD de scratch:
//   ALLOW_SMOKE_ON_REAL_DB=1 npx tsx --env-file=.env scripts/smoke-test-artist-comment-topics.ts

import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { and, eq, like, sql } from "drizzle-orm";
import { assertSmokeAllowed } from "./assert-smoke-allowed";
import { db } from "../src/db";
import { appUser, artist, comment, releaseGroup, userFollow } from "../src/db/schema";

assertSmokeAllowed();

const suffix = randomUUID().slice(0, 8);
const ARTIST_MBID = "5e0ce000-0000-4000-8000-0000000009a0";
const ALBUM_MBID = "5e0ce000-0000-4000-8000-0000000009a1";

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
  const [social, home, feed, activity, exporter] = await Promise.all([
    import("../src/services/social"),
    import("../src/services/home/home"),
    import("../src/services/feed/feed"),
    import("../src/services/activity/community-activity"),
    import("../src/services/profiles/data-export"),
  ]);
  return { social, home, feed, activity, exporter };
}

const newUser = (label: string) => ({
  id: randomUUID(),
  username: `smoke_topic_${label}_${suffix}`,
  email: `smoke_topic_${label}_${suffix}@example.test`,
});

async function main() {
  const { social, home, feed, activity, exporter } = await loadServices();
  const author = newUser("author");
  const follower = newUser("follower");

  try {
    await db.insert(appUser).values([author, follower]);
    const [art] = await db
      .insert(artist)
      .values({ mbid: ARTIST_MBID, type: "group", name: `Smoke Temas ${suffix}` })
      .returning();
    const [album] = await db
      .insert(releaseGroup)
      .values({ mbid: ALBUM_MBID, title: `Smoke Disco ${suffix}`, category: "studio" })
      .returning();
    if (!art || !album) throw new Error("no se crearon el artista y el álbum sintéticos");
    const artistTarget = await social.resolveSocialTarget("artist", art.id);
    const albumTarget = await social.resolveSocialTarget("release-group", album.id);

    console.log("Migración 0065: estructura");
    const constraints = await db.execute<{ conname: string }>(
      sql`SELECT conname FROM pg_constraint WHERE conrelid = 'comment'::regclass AND conname LIKE 'chk_comment_%topic%'`,
    );
    const names = constraints.map((row) => row.conname).sort();
    check(
      // `add-comment-replies` (0066) suma chk_comment_reply_no_topic: se exige que estén los tres de 0065.
      ["chk_comment_artist_topic_required", "chk_comment_topic_artist_only", "chk_comment_topic_values"].every((name) => names.includes(name)),
      "los tres CHECK de tema existen con su nombre",
    );
    const indexes = await db.execute<{ indexname: string }>(
      sql`SELECT indexname FROM pg_indexes WHERE tablename = 'comment' AND indexname = 'idx_comment_artist_topic'`,
    );
    check(indexes.length === 1, "el índice parcial idx_comment_artist_topic existe");
    const leftover = await db.execute<{ n: number }>(
      sql`SELECT count(*)::int AS n FROM comment WHERE artist_id IS NOT NULL AND topic IS NULL`,
    );
    check(Number(leftover[0]!.n) === 0, "ningún comentario de artista quedó sin tema tras el relleno");

    console.log("CHECK directos en la base");
    const insertRaw = (values: Record<string, unknown>) => db.insert(comment).values(values as never);
    const failed = async (fn: () => Promise<unknown>) => (await codeOf(fn)) !== null;
    check(await failed(() => insertRaw({ userId: author.id, artistId: art.id, body: "x", topic: null })), "un comentario de artista sin tema se rechaza");
    check(await failed(() => insertRaw({ userId: author.id, artistId: art.id, body: "x", topic: "foro" })), "un tema fuera del catálogo se rechaza");
    check(await failed(() => insertRaw({ userId: author.id, releaseGroupId: album.id, body: "x", topic: "start" })), "un tema en un comentario de álbum se rechaza");

    console.log("Crear con tema (servicio)");
    const byDefault = await social.createComment(artistTarget, author.id, "sin tema pedido");
    check(byDefault.topic === "general", "sin tema pedido se guarda como general");
    const start = await social.createComment(artistTarget, author.id, "empezá por el primero", "start");
    check(start.topic === "start", "se guarda el tema pedido");
    check((await codeOf(() => social.createComment(artistTarget, author.id, "x", "foro"))) === "INVALID_TOPIC", "un tema fuera del catálogo responde INVALID_TOPIC");
    check((await codeOf(() => social.createComment(albumTarget, author.id, "x", "start"))) === "INVALID_TOPIC", "un tema en un álbum responde INVALID_TOPIC");
    const onAlbum = await social.createComment(albumTarget, author.id, "buen disco");
    check(onAlbum.topic === null, "un comentario de álbum se guarda sin tema");

    console.log("Filtro y paginación");
    for (let n = 1; n <= 5; n += 1) await social.createComment(artistTarget, author.id, `álbumes ${n}`, "albums");
    const all = await social.listComments(artistTarget, 1, 50, null);
    check(all.comments.length === 7, "sin filtro se listan los comentarios de todos los temas");
    const albums = await social.listComments(artistTarget, 1, 3, null, "albums");
    check(albums.comments.length === 3 && albums.hasNext && albums.comments.every((c) => c.topic === "albums"), "el filtro devuelve solo ese tema y pagina");
    const albumsPage2 = await social.listComments(artistTarget, 2, 3, null, "albums");
    check(albumsPage2.comments.length === 2 && !albumsPage2.hasNext, "la segunda página del filtro cierra la lista");
    const songs = await social.listComments(artistTarget, 1, 20, null, "songs");
    check(songs.comments.length === 0, "un tema sin comentarios devuelve lista vacía");
    check((await codeOf(() => social.listComments(albumTarget, 1, 20, null, "start"))) === "INVALID_TOPIC", "el filtro sobre un álbum responde INVALID_TOPIC");

    console.log("Editar no cambia el tema");
    const edited = await social.updateComment(start.id, author.id, "mejor empezá por el segundo");
    check(edited.topic === "start" && edited.body === "mejor empezá por el segundo", "el texto cambia y el tema se conserva");

    console.log("Superficies");
    await db.insert(userFollow).values({ followerId: follower.id, followedId: author.id, status: "accepted" } as never);
    const feedResult = await feed.listFeed(follower.id, 1, 50);
    const feedComment = feedResult.entries.find((entry) => entry.kind === "comment" && entry.id === start.id);
    check(feedComment?.kind === "comment" && feedComment.topic === "start", "el feed de quien sigue trae el tema del comentario de artista");

    const community = await activity.listCommunityActivity(follower.id, 1, 50);
    const communityComment = community.entries.find((entry) => entry.kind === "comment" && entry.id === start.id);
    check(communityComment?.kind === "comment" && communityComment.topic === "start", "la actividad de la comunidad trae el tema del comentario de artista");

    const popular = await home.listPopularComments(50, null);
    const popularComment = popular.artist.find((entry) => entry.id === start.id);
    check(popularComment === undefined || popularComment.topic === "start", "Comentarios populares trae el tema del comentario de artista");
    check(popular["release-group"].every((entry) => entry.topic === null || entry.topic === undefined), "los populares de álbum no traen tema");

    const exported = await exporter.buildDataExport(author.id);
    const exportedComments = exported.activity.comments as { id: string; topic?: string | null }[];
    check(exportedComments.find((c) => c.id === start.id)?.topic === "start", "la exportación de datos incluye el tema");

    console.log("Cascada");
    await db.delete(appUser).where(eq(appUser.id, author.id));
    const [remaining] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(comment)
      .where(and(eq(comment.artistId, art.id)));
    check(remaining?.n === 0, "borrar la cuenta borra sus comentarios con tema");

    console.log("\nSmoke test de temas de comentarios de artista: OK");
  } finally {
    await db.delete(appUser).where(like(appUser.username, "smoke_topic_%"));
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
