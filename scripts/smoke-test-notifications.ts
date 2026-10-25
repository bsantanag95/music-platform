export {};

// Smoke test de los cambios add-notifications-core,
// add-notification-milestones-and-releases y add-notification-digest-and-awards
// contra Postgres REAL (el SQL que las pruebas unitarias mockean): cada fuente de
// emisión (respuestas, seguimientos, moderación, hitos, lanzamientos y premios),
// los CHECK de las migraciones 0075 a 0077, las cascadas de retracción, los
// filtros de privacidad, la agrupación por día en la zona del lector, visto vs.
// leído, preferencias con defecto por tipo, las dos pestañas, el contador sin
// novedades, el contador bajo 10 ms, el resumen semanal con un transporte
// simulado y la baja firmada.
// Crea un artista sintético (MBID `5e0ce000-0000-4000-8000-00000000a9a0`),
// cuatro discos (`…a9b0`, `…a9b1`, `…a9b2`, `…a9c0` y `…a9d0`, el de los premios),
// dos premios sintéticos (`smoke-notif-premio` y `smoke-notif-salon`) y usuarios
// `smoke_notif_*`, y los borra al terminar (también si falla). Si se interrumpió,
// limpiar con
//   DELETE FROM moderation_action WHERE actor_id IN (SELECT id FROM app_user WHERE username LIKE 'smoke_notif_%');
//   DELETE FROM app_user WHERE username LIKE 'smoke_notif_%';
//   DELETE FROM award WHERE slug LIKE 'smoke-notif-%';
//   DELETE FROM release_group WHERE mbid::text LIKE '5e0ce000-0000-4000-8000-00000000a9%';
//   DELETE FROM artist WHERE mbid = '5e0ce000-0000-4000-8000-00000000a9a0';
// (el `ON DELETE CASCADE` limpia notificaciones, seguimientos, comentarios,
// listas, preferencias y restricciones, y el del premio sus ceremonias y avisos;
// la primera sentencia suelta el `RESTRICT` de `moderation_action.actor_id`).
// Necesita las migraciones 0075, 0076 y 0077 aplicadas. Correr contra una BD de scratch:
//   ALLOW_SMOKE_ON_REAL_DB=1 npx tsx --env-file=.env scripts/smoke-test-notifications.ts

import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { and, eq, isNotNull, like, sql, type SQL } from "drizzle-orm";
import { assertSmokeAllowed } from "./assert-smoke-allowed";
import { db } from "../src/db";
import {
  appUser,
  artist,
  artistFollow,
  award,
  awardCeremony,
  comment,
  commentLike,
  credit,
  moderationAction,
  notification,
  notificationPreference,
  releaseGroup,
  userBlock,
  userFollow,
  userList,
  userRole,
} from "../src/db/schema";
import type { NotificationKind, OptionalNotificationKind } from "../src/db/schema";
import type { AwardFiles, CeremonyEntry } from "../src/services/awards/curation-files";
import type { CeremonyFile } from "../src/services/awards/curation-schema";
import { EmailDeliveryError, type EmailMessage, type EmailTransport } from "../src/services/email";

assertSmokeAllowed();

const suffix = randomUUID().slice(0, 8);
const ARTIST_MBID = "5e0ce000-0000-4000-8000-00000000a9a0";
const ALBUM_MBID = "5e0ce000-0000-4000-8000-00000000a9b0";
/** Disco del comentario con hito de likes (lo cubre la limpieza `…a9%`). */
const COMMENT_ALBUM_MBID = "5e0ce000-0000-4000-8000-00000000a9c0";
const ANNOUNCED_MBID = "5e0ce000-0000-4000-8000-00000000a9b1";
const SINGLE_MBID = "5e0ce000-0000-4000-8000-00000000a9b2";
/** Disco nominado en los premios sintéticos (lo cubre la limpieza `…a9%`). */
const AWARD_ALBUM_MBID = "5e0ce000-0000-4000-8000-00000000a9d0";
/** Premio de competencia y salón de la fama del smoke (limpieza `smoke-notif-%`). */
const AWARD_SLUG = "smoke-notif-premio";
const HALL_SLUG = "smoke-notif-salon";
const TODAY = new Date().toISOString().slice(0, 10);
const AWARD_YEAR = Number(TODAY.slice(0, 4));

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
  const [
    social,
    following,
    moderation,
    read,
    preferences,
    commentLikes,
    savedLists,
    emit,
    awards,
    digest,
    sendDigests,
    unsubscribe,
  ] = await Promise.all([
    import("../src/services/social"),
    import("../src/services/social/following"),
    import("../src/services/moderation"),
    import("../src/services/notifications/read"),
    import("../src/services/notifications/preferences"),
    import("../src/services/social/comment-likes"),
    import("../src/services/lists/saved-lists"),
    import("../src/services/notifications/emit"),
    import("../src/services/awards/load"),
    import("../src/services/notifications/digest"),
    import("../src/services/notifications/send-digests"),
    import("../src/services/notifications/unsubscribe"),
  ]);
  return {
    social,
    following,
    moderation,
    read,
    preferences,
    commentLikes,
    savedLists,
    emit,
    awards,
    digest,
    sendDigests,
    unsubscribe,
  };
}

const newUser = (label: string, extra: Record<string, unknown> = {}) => ({
  id: randomUUID(),
  username: `smoke_notif_${label}_${suffix}`,
  email: `smoke_notif_${label}_${suffix}@example.test`,
  ...extra,
});

async function main() {
  const {
    social,
    following,
    moderation,
    read,
    preferences,
    commentLikes,
    savedLists,
    emit,
    awards,
    digest,
    sendDigests,
    unsubscribe,
  } = await loadServices();

  const ana = newUser("ana");
  const bruno = newUser("bruno");
  const carla = newUser("carla");
  const diego = newUser("diego");
  const priv = newUser("priv", { profileVisibility: "private" });
  const seg1 = newUser("seg1");
  const seg2 = newUser("seg2");
  const mod = newUser("mod");

  const countOf = async (where: SQL | undefined) => {
    const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(notification).where(where);
    return row?.n ?? 0;
  };
  const countFor = (recipientId: string, kind: NotificationKind, commentId?: string) =>
    countOf(
      and(
        eq(notification.recipientId, recipientId),
        eq(notification.kind, kind),
        commentId ? eq(notification.commentId, commentId) : undefined,
      ),
    );
  const milestoneCount = (recipientId: string, kind: NotificationKind, milestone: number, where?: SQL) =>
    countOf(
      and(
        eq(notification.recipientId, recipientId),
        eq(notification.kind, kind),
        eq(notification.milestone, milestone),
        where,
      ),
    );

  try {
    await db.insert(appUser).values([ana, bruno, carla, diego, priv, seg1, seg2, mod]);
    await db.insert(userRole).values({ userId: mod.id, role: "moderator" });
    const [art] = await db
      .insert(artist)
      .values({ mbid: ARTIST_MBID, type: "group", name: `Smoke Notificaciones ${suffix}` })
      .returning();
    if (!art) throw new Error("no se creó el artista sintético");

    const [root] = await db
      .insert(comment)
      .values({ userId: ana.id, artistId: art.id, topic: "general", body: "tema de Ana" })
      .returning();
    if (!root) throw new Error("no se creó el tema");

    console.log("Respuestas: raíz y participantes del hilo");
    const brunoReply = await social.createReply(root.id, bruno.id, "responde Bruno");
    check((await countFor(ana.id, "comment_reply", brunoReply.id)) === 1, "respuesta de Bruno: comment_reply para Ana");
    check((await countFor(bruno.id, "thread_reply")) === 0, "quien responde no se autoavisa");
    const carlaReply = await social.createReply(root.id, carla.id, "responde Carla");
    check((await countFor(ana.id, "comment_reply", carlaReply.id)) === 1, "respuesta de Carla: otro comment_reply para Ana");
    check((await countFor(bruno.id, "thread_reply", carlaReply.id)) === 1, "Bruno, participante previo, recibe thread_reply");
    const diegoReply = await social.createReply(brunoReply.id, diego.id, "responde Diego a una respuesta");
    check((await countFor(ana.id, "comment_reply", diegoReply.id)) === 1, "responder a una respuesta avisa al autor de la raíz");
    check((await countFor(carla.id, "thread_reply", diegoReply.id)) === 1, "Carla también recibe thread_reply");
    const anaReply = await social.createReply(root.id, ana.id, "responde Ana en su tema");
    check((await countFor(ana.id, "comment_reply", anaReply.id)) === 0, "la autora no recibe aviso de su propia respuesta");
    check(
      (await countOf(and(eq(notification.recipientId, ana.id), eq(notification.commentId, anaReply.id)))) === 0,
      "la autora de la raíz no recibe ningún aviso por responder en su hilo",
    );
    check((await countFor(bruno.id, "thread_reply", anaReply.id)) === 1, "su respuesta avisa a los participantes previos");

    console.log("Agrupación por hilo");
    let page = await read.listNotificationGroups(ana.id, { timeZone: "America/Santiago", pageSize: 50 });
    const thread = page.groups.find((group) => group.id === `thread:${root.id}`);
    check(thread !== undefined, "las respuestas del hilo forman una sola entrada");
    check(thread?.kind === "comment_reply", "el tipo del grupo prioriza comment_reply");
    check(thread?.eventCount === 3, "el grupo reúne las tres respuestas ajenas");
    check(thread?.actorCount === 3, "tres personas distintas en el grupo");
    check(
      thread?.target?.type === "artist" && thread.target.artistName === art.name && thread.target.rootId === root.id,
      "la entrada enlaza al artista y a la raíz del hilo",
    );
    check(thread?.unread === true, "la entrada nace sin leer");
    check((await social.getRootComment(root.id, ana.id)).id === root.id, "el enlace al hilo puede leer la raíz aparte");
    let replyAsRoot = false;
    try {
      await social.getRootComment(brunoReply.id);
      replyAsRoot = true;
    } catch {
      // Esperado: una respuesta no es una raíz.
    }
    check(!replyAsRoot, "una respuesta no se lee como raíz");

    console.log("Paginación por cursor sin saltos ni repeticiones");
    {
      const all = await read.listNotificationGroups(bruno.id, { timeZone: "America/Santiago", pageSize: 50 });
      const seen: string[] = [];
      let cursor: string | null = null;
      do {
        const step: Awaited<ReturnType<typeof read.listNotificationGroups>> = await read.listNotificationGroups(bruno.id, { timeZone: "America/Santiago", pageSize: 1, cursor });
        seen.push(...step.groups.map((group) => group.id));
        cursor = step.nextCursor;
      } while (cursor);
      check(
        seen.length === all.groups.length && seen.every((id, index) => id === all.groups[index]?.id),
        "recorrer de a una entrada da las mismas entradas que una sola página",
      );
    }

    console.log("Seguimientos: nuevo seguidor, solicitud y aceptación");
    check((await following.followUser(bruno.id, ana.username)).relation === "following", "seguir un perfil público queda aceptado");
    check((await countFor(ana.id, "new_follower")) === 1, "Ana recibe new_follower");
    await following.unfollowUser(bruno.id, ana.username);
    check((await countFor(ana.id, "new_follower")) === 0, "dejar de seguir retira el aviso por cascada");
    await following.followUser(bruno.id, ana.username);

    check((await following.followUser(bruno.id, priv.username)).relation === "requested", "seguir un perfil privado queda pendiente");
    check((await countFor(priv.id, "follow_request")) === 1, "el dueño recibe follow_request");
    await following.approveRequest(priv.id, bruno.id);
    check((await countFor(priv.id, "follow_request")) === 0, "aprobar retira la solicitud del dueño");
    check((await countFor(bruno.id, "follow_accepted")) === 1, "quien pidió recibe follow_accepted");

    await following.followUser(carla.id, priv.username);
    check((await countFor(priv.id, "follow_request")) === 1, "otra solicitud pendiente");
    await following.rejectRequest(priv.id, carla.id);
    check((await countFor(priv.id, "follow_request")) === 0, "rechazar la solicitud la retira por cascada");

    await following.followUser(diego.id, priv.username);
    await following.cancelRequest(diego.id, priv.username);
    check((await countFor(priv.id, "follow_request")) === 0, "cancelar la solicitud la retira por cascada");

    // Una solicitud pendiente a un perfil que luego se hace público: volver a seguir la acepta y su
    // `follow_request` (con botones que ya fallarían) sale de la bandeja.
    await following.followUser(diego.id, priv.username);
    check((await countFor(priv.id, "follow_request")) === 1, "solicitud pendiente antes de abrir el perfil");
    await db.update(appUser).set({ profileVisibility: "public" }).where(eq(appUser.id, priv.id));
    check((await following.followUser(diego.id, priv.username)).relation === "following", "volver a seguir el perfil ya público lo acepta");
    check((await countFor(priv.id, "follow_request")) === 0, "la solicitud aceptada sale de la bandeja");
    check((await countFor(priv.id, "new_follower")) === 1, "y queda como nuevo seguidor");
    await following.unfollowUser(diego.id, priv.username);
    await db.update(appUser).set({ profileVisibility: "private" }).where(eq(appUser.id, priv.id));

    console.log("Bloqueos: no se emite el aviso");
    const [carlaRoot] = await db
      .insert(comment)
      .values({ userId: carla.id, artistId: art.id, topic: "general", body: "tema de Carla" })
      .returning();
    if (!carlaRoot) throw new Error("no se creó el segundo tema");
    await social.createReply(carlaRoot.id, ana.id, "participa Ana");
    await db.insert(userBlock).values({ blockerId: ana.id, blockedId: bruno.id });
    const blockedReply = await social.createReply(carlaRoot.id, bruno.id, "Bruno responde bloqueado");
    check((await countFor(ana.id, "thread_reply", blockedReply.id)) === 0, "Ana no recibe el thread_reply de quien bloqueó");
    check((await countFor(carla.id, "comment_reply", blockedReply.id)) === 1, "Carla sí recibe el comment_reply (sin bloqueo con Bruno)");
    await db.delete(userBlock).where(and(eq(userBlock.blockerId, ana.id), eq(userBlock.blockedId, bruno.id)));

    console.log("Actores desactivados: se filtran al leer");
    const [filterRoot] = await db
      .insert(comment)
      .values({ userId: ana.id, artistId: art.id, topic: "general", body: "tema para filtros" })
      .returning();
    if (!filterRoot) throw new Error("no se creó el tema de filtros");
    const filterReply = await social.createReply(filterRoot.id, bruno.id, "respuesta visible");
    await db.update(appUser).set({ deactivatedAt: new Date() }).where(eq(appUser.id, bruno.id));
    page = await read.listNotificationGroups(ana.id, { pageSize: 50 });
    check(
      !page.groups.some((group) => group.id === `thread:${filterRoot.id}`),
      "la entrada de un actor desactivado desaparece de la bandeja",
    );
    await db.update(appUser).set({ deactivatedAt: null }).where(eq(appUser.id, bruno.id));
    page = await read.listNotificationGroups(ana.id, { pageSize: 50 });
    check(
      page.groups.some((group) => group.id === `thread:${filterRoot.id}`),
      "al reactivar la cuenta, la entrada vuelve",
    );
    check((await countFor(ana.id, "comment_reply", filterReply.id)) === 1, "la fila nunca se borró: solo se filtró");

    console.log("Contenido oculto y moderación");
    await moderation.hideComment(mod.id, filterReply.id, "smoke: oculto");
    page = await read.listNotificationGroups(ana.id, { pageSize: 50 });
    check(
      !page.groups.some((group) => group.id === `thread:${filterRoot.id}`),
      "una respuesta oculta sale de la bandeja",
    );
    const [hiddenAction] = await db
      .select({ id: moderationAction.id })
      .from(moderationAction)
      .where(eq(moderationAction.commentId, filterReply.id));
    // El aviso de moderación va al autor del contenido oculto (Bruno), no al
    // autor del tema donde estaba la respuesta.
    const brunoPage = await read.listNotificationGroups(bruno.id, { timeZone: "America/Santiago", pageSize: 50 });
    const hiddenGroup = brunoPage.groups.find((group) => group.id === `moderation:${hiddenAction?.id}`);
    check(hiddenGroup !== undefined, "el aviso de moderación se muestra aunque el contenido esté oculto");
    check(
      hiddenGroup?.target?.type === "moderation" &&
        hiddenGroup.target.action === "hide" &&
        hiddenGroup.target.contentType === "comment" &&
        hiddenGroup.target.reason === "smoke: oculto",
      "el aviso describe acción, objeto y motivo",
    );
    check(hiddenGroup?.actors.length === 0 && hiddenGroup.actorCount === 0, "la moderación no nombra al moderador");
    check((await countFor(ana.id, "moderation")) === 0, "el autor del tema no recibe el aviso de moderación ajeno");
    const [hiddenRow] = await db
      .select({ actorId: notification.actorId })
      .from(notification)
      .where(and(eq(notification.kind, "moderation"), eq(notification.recipientId, bruno.id)))
      .limit(1);
    check(hiddenRow?.actorId === null, "la fila de moderación no guarda actor");

    await moderation.restoreComment(mod.id, filterReply.id, "smoke: restaurado");
    page = await read.listNotificationGroups(ana.id, { pageSize: 50 });
    check(
      page.groups.some((group) => group.id === `thread:${filterRoot.id}`),
      "restaurar la respuesta la devuelve a la bandeja",
    );
    check((await countFor(bruno.id, "moderation")) === 2, "ocultar y restaurar dejan dos avisos de moderación");

    const restriction = await moderation.suspendSocialActivity(
      mod.id,
      seg1.id,
      "smoke: suspensión",
      new Date(Date.now() + 24 * 60 * 60 * 1000),
    );
    check((await countFor(seg1.id, "moderation")) === 1, "la suspensión social avisa a la persona");
    await moderation.revokeSocialSuspension(mod.id, restriction.id);
    check((await countFor(seg1.id, "moderation")) === 2, "revocar la suspensión deja su aviso");

    console.log("Preferencias");
    check(
      (await preferences.updateNotificationPreferences(ana.id, { new_follower: false })).new_follower === false,
      "se guarda el tipo desactivado",
    );
    await following.followUser(seg1.id, ana.username);
    check((await countFor(ana.id, "new_follower")) === 1, "un tipo desactivado no escribe avisos nuevos");
    await preferences.updateNotificationPreferences(ana.id, { new_follower: true });
    const [prefRow] = await db
      .select({ kind: notificationPreference.kind })
      .from(notificationPreference)
      .where(and(eq(notificationPreference.userId, ana.id), eq(notificationPreference.kind, "new_follower")));
    check(prefRow === undefined, "volver al defecto borra la fila de la preferencia");
    await following.unfollowUser(seg1.id, ana.username);
    await following.followUser(seg1.id, ana.username);
    await following.followUser(seg2.id, ana.username);
    check((await countFor(ana.id, "new_follower")) === 3, "rehabilitado, vuelve a escribir (Bruno + seg1 + seg2)");
    check(
      (await codeOf(() => preferences.updateNotificationPreferences(ana.id, { moderation: false }))) ===
        "VALIDATION_ERROR",
      "un tipo fijo no se puede desactivar",
    );

    console.log("Defectos por tipo (0076)");
    const defaults = await preferences.getNotificationPreferences(ana.id);
    check(defaults.comment_like_milestone === true, "el hito de likes nace activado");
    check(defaults.list_save_milestone === false, "el hito de guardados nace desactivado");
    check(defaults.artist_release === true, "el disco publicado nace activado");
    check(defaults.artist_release_announced === false, "el disco anunciado nace desactivado");
    check(defaults.artist_single === false, "el sencillo nace desactivado");

    console.log("Hitos de likes");
    const hitoUsers = Array.from({ length: 30 }, (_, index) => newUser(`hito${index}`));
    await db.insert(appUser).values(hitoUsers);
    const [hitoComment] = await db
      .insert(comment)
      .values({ userId: ana.id, artistId: art.id, topic: "general", body: "hito de likes" })
      .returning();
    if (!hitoComment) throw new Error("no se creó el comentario del hito");
    const hitoFilter = eq(notification.commentId, hitoComment.id);

    for (let index = 0; index < 9; index += 1) {
      await commentLikes.likeComment(hitoComment.id, hitoUsers[index]!.id);
    }
    check(
      (await milestoneCount(ana.id, "comment_like_milestone", 10, hitoFilter)) === 0,
      "nueve likes todavía no avisan",
    );
    await commentLikes.likeComment(hitoComment.id, hitoUsers[9]!.id);
    check(
      (await milestoneCount(ana.id, "comment_like_milestone", 10, hitoFilter)) === 1,
      "el décimo like avisa el hito 10 al autor",
    );
    await commentLikes.likeComment(hitoComment.id, hitoUsers[10]!.id);
    check(
      (await countFor(ana.id, "comment_like_milestone", hitoComment.id)) === 1,
      "el undécimo like no repite el hito",
    );

    // 13 likes entran por fuera del servicio (24) y el siguiente like cruza el 25.
    await db.insert(commentLike).values(
      hitoUsers.slice(11, 24).map((user) => ({ commentId: hitoComment.id, userId: user.id })),
    );
    await commentLikes.likeComment(hitoComment.id, hitoUsers[24]!.id);
    check(
      (await milestoneCount(ana.id, "comment_like_milestone", 25, hitoFilter)) === 1,
      "el like que cruza el 25 avisa ese hito",
    );

    // Un comentario que pasó el 10 antes de que hubiera hitos no lo avisa con retraso.
    const [lateComment] = await db
      .insert(comment)
      .values({ userId: ana.id, artistId: art.id, topic: "general", body: "hito atrasado" })
      .returning();
    if (!lateComment) throw new Error("no se creó el comentario del hito atrasado");
    await db.insert(commentLike).values(
      hitoUsers.slice(0, 12).map((user) => ({ commentId: lateComment.id, userId: user.id })),
    );
    await commentLikes.likeComment(lateComment.id, hitoUsers[12]!.id);
    check(
      (await countFor(ana.id, "comment_like_milestone", lateComment.id)) === 0,
      "un hito ya pasado no se avisa con el siguiente like",
    );

    // Un comentario de álbum: la entrada nombra el disco y no lleva hilo.
    const [commentAlbum] = await db
      .insert(releaseGroup)
      .values({ mbid: COMMENT_ALBUM_MBID, title: `Smoke disco comentado ${suffix}`, category: "studio" })
      .returning();
    if (!commentAlbum) throw new Error("no se creó el álbum sintético");
    const [albumComment] = await db
      .insert(comment)
      .values({ userId: ana.id, releaseGroupId: commentAlbum.id, body: "hito en un álbum" })
      .returning();
    if (!albumComment) throw new Error("no se creó el comentario del álbum");
    await db.insert(commentLike).values(
      hitoUsers.slice(0, 9).map((user) => ({ commentId: albumComment.id, userId: user.id })),
    );
    await commentLikes.likeComment(albumComment.id, hitoUsers[9]!.id);
    const albumPage = await read.listNotificationGroups(ana.id, { tab: "for_you", pageSize: 100 });
    const albumEntry = albumPage.groups.find((group) => group.id === `likes:${albumComment.id}`);
    check(
      albumEntry?.target?.type === "comment" &&
        albumEntry.target.subject === "album" &&
        albumEntry.target.subjectName === commentAlbum.title &&
        albumEntry.target.rootId === null &&
        albumEntry.target.milestone === 10,
      "el hito de un comentario de álbum nombra el disco, sin hilo",
    );
    check(
      (await countFor(ana.id, "comment_like_milestone", hitoComment.id)) === 2,
      "hay un aviso por cada hito alcanzado, no por cada like",
    );

    await commentLikes.unlikeComment(hitoComment.id, hitoUsers[0]!.id);
    check(
      (await countFor(ana.id, "comment_like_milestone", hitoComment.id)) === 2,
      "un unlike no retira el hito",
    );
    await commentLikes.likeComment(hitoComment.id, hitoUsers[0]!.id);
    check(
      (await countFor(ana.id, "comment_like_milestone", hitoComment.id)) === 2,
      "volver a dar like no repite el hito",
    );

    await moderation.hideComment(mod.id, hitoComment.id, "smoke: hito oculto");
    const hiddenHitoPage = await read.listNotificationGroups(ana.id, { tab: "for_you", pageSize: 100 });
    check(
      !hiddenHitoPage.groups.some((group) => group.id === `likes:${hitoComment.id}`),
      "un hito de comentario oculto sale de la bandeja",
    );
    await moderation.restoreComment(mod.id, hitoComment.id, "smoke: hito restaurado");
    const restoredHitoPage = await read.listNotificationGroups(ana.id, { tab: "for_you", pageSize: 100 });
    const hitoGroup = restoredHitoPage.groups.find((group) => group.id === `likes:${hitoComment.id}`);
    check(hitoGroup?.target?.type === "comment" && hitoGroup.target.milestone === 25, "el grupo muestra el hito más alto");
    check(hitoGroup?.actors.length === 0 && hitoGroup.actorCount === 0, "el hito no expone a nadie");

    await db.delete(comment).where(eq(comment.id, hitoComment.id));
    check(
      (await countFor(ana.id, "comment_like_milestone", hitoComment.id)) === 0,
      "borrar el comentario borra sus hitos por cascada",
    );

    console.log("Hitos de guardados");
    const [savedList] = await db
      .insert(userList)
      .values({
        ownerId: ana.id,
        entityType: "release-group",
        title: `Smoke lista ${suffix}`,
        audience: "public",
      })
      .returning();
    if (!savedList) throw new Error("no se creó la lista del hito");
    const listFilter = eq(notification.listId, savedList.id);

    await preferences.updateNotificationPreferences(ana.id, { list_save_milestone: true });
    await savedLists.saveList(hitoUsers[0]!.id, savedList.id);
    check(
      (await milestoneCount(ana.id, "list_save_milestone", 1, listFilter)) === 1,
      "el primer guardado avisa el hito 1",
    );
    for (let index = 1; index < 5; index += 1) {
      await savedLists.saveList(hitoUsers[index]!.id, savedList.id);
    }
    check(
      (await milestoneCount(ana.id, "list_save_milestone", 5, listFilter)) === 1,
      "la quinta persona avisa el hito 5",
    );
    check(
      (await countFor(ana.id, "list_save_milestone")) === 2,
      "solo hay un aviso por hito, no por guardado",
    );

    await savedLists.setListTracking(hitoUsers[0]!.id, savedList.id, true);
    check(
      (await countFor(ana.id, "list_save_milestone")) === 2,
      "cambiar el seguimiento de una lista ya guardada no cuenta ni avisa",
    );

    await db.update(userList).set({ moderationStatus: "hidden" }).where(eq(userList.id, savedList.id));
    const hiddenListPage = await read.listNotificationGroups(ana.id, { tab: "for_you", pageSize: 100 });
    check(
      !hiddenListPage.groups.some((group) => group.id === `saves:${savedList.id}`),
      "un hito de lista oculta sale de la bandeja",
    );
    await db.update(userList).set({ moderationStatus: "visible" }).where(eq(userList.id, savedList.id));

    await db.delete(userList).where(eq(userList.id, savedList.id));
    check(
      (await countFor(ana.id, "list_save_milestone")) === 0,
      "borrar la lista borra sus hitos por cascada",
    );

    console.log("Lanzamientos: defectos, pestañas y contador aparte");
    const novedades = newUser("novedades");
    await db.insert(appUser).values(novedades);
    await db.insert(artistFollow).values({ userId: novedades.id, artistId: art.id });

    const [album] = await db
      .insert(releaseGroup)
      .values({
        mbid: ALBUM_MBID,
        title: `Smoke disco ${suffix}`,
        category: "studio",
        primaryType: "Album",
        firstReleaseDate: TODAY,
      })
      .returning();
    const [announced] = await db
      .insert(releaseGroup)
      .values({
        mbid: ANNOUNCED_MBID,
        title: `Smoke anunciado ${suffix}`,
        category: "studio",
        primaryType: "Album",
        firstReleaseDate: "2099-01-01",
      })
      .returning();
    const [single] = await db
      .insert(releaseGroup)
      .values({
        mbid: SINGLE_MBID,
        title: `Smoke sencillo ${suffix}`,
        category: "single_ep",
        primaryType: "Single",
        firstReleaseDate: TODAY,
      })
      .returning();
    if (!album || !announced || !single) throw new Error("no se crearon los discos sintéticos");
    await db.insert(credit).values([
      { artistId: art.id, releaseGroupId: album.id, position: 1, role: "primary" },
      { artistId: art.id, releaseGroupId: announced.id, position: 1, role: "primary" },
      { artistId: art.id, releaseGroupId: single.id, position: 1, role: "primary" },
    ]);

    const emitReleases = () =>
      db.transaction((tx) =>
        emit.emitArtistReleaseNotifications(
          tx,
          [
            { releaseGroupId: album.id, releaseDate: TODAY, category: "album" as const },
            { releaseGroupId: announced.id, releaseDate: "2099-01-01", category: "album" as const },
            { releaseGroupId: single.id, releaseDate: TODAY, category: "single" as const },
          ],
          TODAY,
        ),
      );

    await emitReleases();
    check((await countFor(novedades.id, "artist_release")) === 1, "el disco publicado avisa con su defecto activado");
    check(
      (await countFor(novedades.id, "artist_release_announced")) === 0,
      "el anunciado no avisa mientras su defecto es desactivado",
    );
    check(
      (await countFor(novedades.id, "artist_single")) === 0,
      "el sencillo no avisa mientras su defecto es desactivado",
    );

    check((await read.countUnseen(novedades.id, "UTC")) === 0, "el contador de la campana no suma novedades");
    check((await read.hasNewReleases(novedades.id)) === true, "el punto de Novedades sí se enciende");
    const releasesPage = await read.listNotificationGroups(novedades.id, { tab: "releases", pageSize: 20 });
    check(releasesPage.groups.length === 1, "la pestaña Novedades trae el disco publicado");
    check(
      releasesPage.groups[0]?.target?.type === "release" &&
        releasesPage.groups[0].target.releaseGroupId === album.id &&
        releasesPage.groups[0].target.category === "album",
      "la fila enlaza al disco con su categoría",
    );
    const forYouPage = await read.listNotificationGroups(novedades.id, { tab: "for_you", pageSize: 20 });
    check(forYouPage.groups.length === 0, "la pestaña Para ti no mezcla lanzamientos");

    await read.markSeen(novedades.id, "releases");
    check((await read.hasNewReleases(novedades.id)) === false, "abrir Novedades apaga su punto");
    check((await read.countUnseen(novedades.id, "UTC")) === 0, "y no toca el contador de Para ti");

    await preferences.updateNotificationPreferences(novedades.id, {
      artist_release_announced: true,
      artist_single: true,
    });
    await emitReleases();
    check(
      (await countFor(novedades.id, "artist_release_announced")) === 1,
      "activado, el anunciado avisa",
    );
    check((await countFor(novedades.id, "artist_single")) === 1, "activado, el sencillo avisa");
    check((await read.hasNewReleases(novedades.id)) === true, "los avisos nuevos vuelven a encender el punto");
    await emitReleases();
    check(
      (await countFor(novedades.id, "artist_release")) === 1 &&
        (await countFor(novedades.id, "artist_release_announced")) === 1 &&
        (await countFor(novedades.id, "artist_single")) === 1,
      "repetir la sincronización no duplica avisos",
    );

    await db.update(releaseGroup).set({ discographyUnlistedAt: new Date() }).where(eq(releaseGroup.id, album.id));
    const afterUnlisted = await read.listNotificationGroups(novedades.id, { tab: "releases", pageSize: 20 });
    check(
      !afterUnlisted.groups.some((group) => group.target?.type === "release" && group.target.releaseGroupId === album.id),
      "un disco retirado de la discografía sale de la bandeja",
    );
    await db.update(releaseGroup).set({ discographyUnlistedAt: null }).where(eq(releaseGroup.id, album.id));

    await db.delete(releaseGroup).where(eq(releaseGroup.id, album.id));
    check(
      (await countFor(novedades.id, "artist_release")) === 0,
      "borrar el disco borra su aviso por cascada",
    );

    console.log("Premios: la carga avisa a quien sigue a un artista nominado o ganador");
    const awardAlbumTitle = `Smoke premio disco ${suffix}`;
    const awardCredits = [{ name: art.name, artist: { id: ARTIST_MBID, name: art.name } }];
    const awardAlbumSeed = {
      kind: "release_group" as const,
      title: awardAlbumTitle,
      category: "studio" as const,
      credits: awardCredits,
    };
    const awardAlbumLink = {
      status: "manual" as const,
      mbid: AWARD_ALBUM_MBID,
      seed: awardAlbumSeed,
    };
    const awardArtistLink = {
      status: "manual" as const,
      mbid: ARTIST_MBID,
      seed: { kind: "artist" as const, name: art.name, mbType: "Group" },
    };

    const [awardAlbum] = await db
      .insert(releaseGroup)
      .values({
        mbid: AWARD_ALBUM_MBID,
        title: awardAlbumTitle,
        category: "studio",
        primaryType: "Album",
        firstReleaseDate: `${AWARD_YEAR - 1}-05-01`,
      })
      .returning();
    if (!awardAlbum) throw new Error("no se creó el disco de los premios");
    await db
      .insert(credit)
      .values({ artistId: art.id, releaseGroupId: awardAlbum.id, position: 0, role: "primary" });

    const awardCategories = {
      award: AWARD_SLUG,
      kind: "competition" as const,
      voting: "academy" as const,
      categories: [
        {
          key: "album-of-the-year",
          tier: "general" as const,
          subject: "release_group" as const,
          honors: "performer" as const,
          name: { es: "Álbum del año", en: "Album of the Year" },
          order: 1,
        },
        {
          key: "artist-of-the-year",
          tier: "general" as const,
          subject: "artist" as const,
          honors: "performer" as const,
          name: { es: "Artista del año", en: "Artist of the Year" },
          order: 2,
        },
      ],
    };
    const hallCategories = {
      award: HALL_SLUG,
      kind: "hall_of_fame" as const,
      voting: "jury" as const,
      categories: [
        {
          key: "recordings",
          tier: "general" as const,
          subject: "release_group" as const,
          honors: "performer" as const,
          name: { es: "Grabaciones", en: "Recordings" },
          order: 1,
        },
      ],
    };

    const ceremonyEntry = (
      slug: string,
      year: number,
      edition: number | undefined,
      heldOn: string,
      categories: CeremonyFile["categories"],
    ): CeremonyEntry => ({
      path: `${slug}/ceremonies/${year}.json`,
      fileName: `${slug}/ceremonies/${year}.json`,
      data: { award: slug, year, edition, heldOn, sourceUrl: "https://example.org/smoke-notif", categories },
    });

    // A (año en curso, hoy): el disco de `art` gana → victoria. La nominación de
    // la misma ceremonia comparte grupo y la agregación prefiere la victoria.
    const ceremonyA = ceremonyEntry(AWARD_SLUG, AWARD_YEAR, 1, TODAY, [
      {
        key: "album-of-the-year",
        coverage: "winner_only",
        nominees: [
          { title: awardAlbumTitle, artist: art.name, won: true, resolved: awardAlbumLink },
        ],
      },
      {
        key: "artist-of-the-year",
        coverage: "winner_only",
        nominees: [{ title: "Otro Artista", won: true }],
      },
    ]);
    // B (año siguiente, anunciada): `art` gana un premio y suma dos nominaciones.
    // Como la ceremonia aún no se celebró, solo emite nominaciones.
    const ceremonyB = ceremonyEntry(AWARD_SLUG, AWARD_YEAR + 1, 2, `${AWARD_YEAR + 1}-01-15`, [
      {
        key: "album-of-the-year",
        coverage: "complete",
        nominees: [
          { title: awardAlbumTitle, artist: art.name, won: true, resolved: awardAlbumLink },
          { title: "Otro Álbum", artist: "Otro", won: false },
          { title: "Tercer Álbum", artist: "Tercero", won: false },
        ],
      },
      {
        key: "artist-of-the-year",
        coverage: "complete",
        nominees: [
          { title: art.name, won: false, resolved: awardArtistLink },
          { title: "Otro Artista", won: true },
          { title: "Tercer Artista", won: false },
        ],
      },
    ]);
    // C (hace dos años): la historia no avisa.
    const ceremonyC = ceremonyEntry(AWARD_SLUG, AWARD_YEAR - 2, 3, `${AWARD_YEAR - 2}-06-01`, [
      {
        key: "album-of-the-year",
        coverage: "complete",
        nominees: [
          { title: awardAlbumTitle, artist: art.name, won: true, resolved: awardAlbumLink },
          { title: "Otro Álbum", artist: "Otro", won: false },
          { title: "Tercer Álbum", artist: "Tercero", won: false },
        ],
      },
    ]);
    const awardFiles: AwardFiles = {
      slug: AWARD_SLUG,
      categories: awardCategories,
      ceremonies: [ceremonyA, ceremonyB, ceremonyC],
    };
    const hallFiles: AwardFiles = {
      slug: HALL_SLUG,
      categories: hallCategories,
      ceremonies: [
        ceremonyEntry(HALL_SLUG, AWARD_YEAR, undefined, TODAY, [
          {
            key: "recordings",
            coverage: "complete",
            nominees: [
              { title: awardAlbumTitle, artist: art.name, won: true, resolved: awardAlbumLink },
            ],
          },
        ]),
      ],
    };

    const premios = newUser("premios");
    const sinpremios = newUser("sinpremios");
    await db.insert(appUser).values([premios, sinpremios]);
    await db.insert(artistFollow).values([
      { userId: premios.id, artistId: art.id },
      { userId: sinpremios.id, artistId: art.id },
    ]);
    check(
      (await preferences.getNotificationPreferences(premios.id)).artist_award === true,
      "el aviso de premios nace activado",
    );
    await preferences.updateNotificationPreferences(sinpremios.id, { artist_award: false });

    const firstLoad = await awards.loadAward(awardFiles);
    check(firstLoad.ceremonyIds.length === 3, "la carga devuelve las ceremonias que tocó");
    const hallLoad = await awards.loadAward(hallFiles);
    check(hallLoad.ceremonyIds.length === 1, "la carga del salón devuelve su clase");

    const [competitionAward] = await db
      .select({ id: award.id })
      .from(award)
      .where(eq(award.slug, AWARD_SLUG));
    const ceremonyRows = await db
      .select({ id: awardCeremony.id, year: awardCeremony.year })
      .from(awardCeremony)
      .where(eq(awardCeremony.awardId, competitionAward!.id));
    const ceremonyByYear = new Map(ceremonyRows.map((row) => [row.year, row.id]));
    const ceremonyAId = ceremonyByYear.get(AWARD_YEAR);
    const ceremonyBId = ceremonyByYear.get(AWARD_YEAR + 1);
    const ceremonyCId = ceremonyByYear.get(AWARD_YEAR - 2);
    const [hallAward] = await db.select({ id: award.id }).from(award).where(eq(award.slug, HALL_SLUG));
    const [hallCeremony] = await db
      .select({ id: awardCeremony.id })
      .from(awardCeremony)
      .where(eq(awardCeremony.awardId, hallAward!.id));
    if (!ceremonyAId || !ceremonyBId || !ceremonyCId || !hallCeremony) {
      throw new Error("no se encontraron las ceremonias sintéticas");
    }

    const emitAwards = async (ceremonyIds: readonly string[]) => {
      await db.transaction((tx) => emit.emitArtistAwardNotifications(tx, ceremonyIds, TODAY));
    };
    await emitAwards(firstLoad.ceremonyIds);
    await emitAwards(hallLoad.ceremonyIds);

    const awardRows = (recipientId: string) =>
      countOf(and(eq(notification.recipientId, recipientId), isNotNull(notification.awardCeremonyId)));

    check(
      (await awardRows(premios.id)) === 4,
      "la carga escribe cuatro avisos: dos por la ceremonia con victoria, uno por la anunciada y uno del salón",
    );
    check((await awardRows(sinpremios.id)) === 0, "con la preferencia apagada no se escribe ningún aviso");
    check(
      (await countOf(eq(notification.awardCeremonyId, ceremonyCId))) === 0,
      "la historia fuera de la ventana de 30 días no avisa",
    );
    check(
      (await countFor(premios.id, "artist_award_nomination")) === 2,
      "la ceremonia anunciada emite nominaciones",
    );
    check(
      (await countFor(premios.id, "artist_award_win")) === 2,
      "una victoria en la competencia reciente y otra en el salón del año en curso",
    );

    const premiosPage = await read.listNotificationGroups(premios.id, { tab: "releases", pageSize: 50 });
    const awardGroups = premiosPage.groups.filter((group) => group.target?.type === "award");
    check(awardGroups.length === 3, "tres ceremonias con avisos dan tres entradas");
    check(awardGroups.every((group) => group.unread), "las entradas de premios nacen sin leer");

    const entryA = awardGroups.find(
      (group) => group.target?.type === "award" && group.target.ceremonyId === ceremonyAId,
    );
    check(entryA !== undefined, "la ceremonia con victoria tiene su entrada");
    check(entryA?.kind === "artist_award_win", "la victoria manda sobre la nominación de la misma ceremonia");
    check(entryA?.eventCount === 2, "las dos filas de la ceremonia se leen como una sola entrada");
    check(
      entryA?.target?.type === "award" &&
        entryA.target.awardSlug === AWARD_SLUG &&
        entryA.target.awardName === AWARD_SLUG &&
        entryA.target.year === AWARD_YEAR &&
        entryA.target.isHallOfFame === false &&
        entryA.target.artistName === art.name &&
        entryA.target.artistCount === 1 &&
        entryA.target.count === 1,
      "el destino enlaza a la ceremonia y cuenta un premio de un artista seguido",
    );

    const entryB = awardGroups.find(
      (group) => group.target?.type === "award" && group.target.ceremonyId === ceremonyBId,
    );
    check(entryB?.kind === "artist_award_nomination", "la ceremonia anunciada se lee como nominación");
    check(
      entryB?.target?.type === "award" &&
        entryB.target.count === 2 &&
        entryB.target.artistCount === 1 &&
        entryB.target.year === AWARD_YEAR + 1,
      "la cifra suma las dos nominaciones del artista seguido",
    );

    const entryHall = awardGroups.find(
      (group) => group.target?.type === "award" && group.target.ceremonyId === hallCeremony.id,
    );
    check(
      entryHall?.kind === "artist_award_win" &&
        entryHall.target?.type === "award" &&
        entryHall.target.isHallOfFame === true &&
        entryHall.target.year === AWARD_YEAR &&
        entryHall.target.count === 1,
      "la clase del Salón de la Fama se lee como ingreso",
    );

    await preferences.updateNotificationPreferences(sinpremios.id, { artist_award: true });
    await emitAwards(firstLoad.ceremonyIds);
    await emitAwards(hallLoad.ceremonyIds);
    check(
      (await awardRows(sinpremios.id)) === 4,
      "al reactivar la preferencia, la siguiente emisión escribe lo pendiente",
    );
    check((await awardRows(premios.id)) === 4, "volver a emitir no duplica los avisos");

    const reload = await awards.loadAward(awardFiles);
    check(
      reload.ceremonyIds.join(",") === firstLoad.ceremonyIds.join(","),
      "recargar el premio conserva las mismas ceremonias",
    );
    await emitAwards(reload.ceremonyIds);
    check((await awardRows(premios.id)) === 4, "recargar y reemitir no duplica los avisos");

    // Una corrección de las nominaciones (aquí, quitar el crédito del disco)
    // deja la ceremonia sin artistas seguidos: la entrada se oculta al leer, sin
    // reescribir la fila.
    await db
      .delete(credit)
      .where(and(eq(credit.releaseGroupId, awardAlbum.id), eq(credit.artistId, art.id)));
    const afterCorrection = await read.listNotificationGroups(premios.id, {
      tab: "releases",
      pageSize: 50,
    });
    const correctedGroups = afterCorrection.groups.filter((group) => group.target?.type === "award");
    check(
      !correctedGroups.some(
        (group) => group.target?.type === "award" && group.target.ceremonyId === ceremonyAId,
      ),
      "sin artista seguido, la victoria desaparece de la bandeja",
    );
    check(
      !correctedGroups.some(
        (group) => group.target?.type === "award" && group.target.ceremonyId === hallCeremony.id,
      ),
      "el salón también se oculta sin crédito",
    );
    const entryBAfter = correctedGroups.find(
      (group) => group.target?.type === "award" && group.target.ceremonyId === ceremonyBId,
    );
    check(
      entryBAfter?.target?.type === "award" && entryBAfter.target.count === 1,
      "la nominación directa sigue visible y su cifra baja a una",
    );
    check((await awardRows(premios.id)) === 4, "la fila no se borra: solo se filtra al leer");
    await db
      .insert(credit)
      .values({ artistId: art.id, releaseGroupId: awardAlbum.id, position: 0, role: "primary" });
    const restoredAwards = await read.listNotificationGroups(premios.id, {
      tab: "releases",
      pageSize: 50,
    });
    check(
      restoredAwards.groups.some(
        (group) => group.target?.type === "award" && group.target.ceremonyId === ceremonyAId,
      ),
      "al restaurar el crédito, la entrada vuelve",
    );

    console.log("Resumen semanal: opt-in, verificado y una corrida por semana");
    process.env.EMAIL_UNSUBSCRIBE_SECRET ??= "smoke-unsubscribe-secret";
    process.env.NEXT_PUBLIC_APP_URL ??= "https://smoke.example";

    const verified = { emailVerifiedAt: new Date() };
    const digestA = newUser("digest_a", { ...verified, notificationDigestEnabled: true });
    const digestRead = newUser("digest_read", { ...verified, notificationDigestEnabled: true });
    const digestOld = newUser("digest_old", { ...verified, notificationDigestEnabled: true });
    const digestFail = newUser("digest_fail", { ...verified, notificationDigestEnabled: true });
    const digestUnverified = newUser("digest_unverified", { notificationDigestEnabled: true });
    const digestNeedsVerify = newUser("digest_needs_verify");
    const digestOff = newUser("digest_off", verified);
    const digestDeactivated = newUser("digest_deactivated", {
      ...verified,
      notificationDigestEnabled: true,
      deactivatedAt: new Date(),
    });
    const digestSent = newUser("digest_sent", {
      ...verified,
      notificationDigestEnabled: true,
      notificationDigestSentAt: new Date(),
    });
    const digestUsers = [
      digestA,
      digestRead,
      digestOld,
      digestFail,
      digestUnverified,
      digestNeedsVerify,
      digestOff,
      digestDeactivated,
      digestSent,
    ];
    await db.insert(appUser).values(digestUsers);

    const [digestCommentA] = await db
      .insert(comment)
      .values({ userId: ana.id, artistId: art.id, topic: "general", body: "resumen uno" })
      .returning();
    const [digestCommentB] = await db
      .insert(comment)
      .values({ userId: ana.id, artistId: art.id, topic: "general", body: "resumen dos" })
      .returning();
    if (!digestCommentA || !digestCommentB) throw new Error("no se crearon los temas del resumen");

    // Todas las personas con contenido sin leer, también las que no deberían
    // recibirlo: así el filtro es de elegibilidad y no de bandeja vacía.
    await db.insert(notification).values(
      digestUsers.map((user) => ({
        recipientId: user.id,
        kind: "comment_reply" as const,
        actorId: ana.id,
        commentId: digestCommentA.id,
        groupKey: `thread:${digestCommentA.id}`,
      })),
    );
    await db
      .update(notification)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notification.recipientId, digestRead.id),
          eq(notification.commentId, digestCommentA.id),
        ),
      );
    await db
      .update(notification)
      .set({ createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) })
      .where(eq(notification.recipientId, digestOld.id));
    await db.insert(notification).values([
      {
        recipientId: digestA.id,
        kind: "comment_reply" as const,
        actorId: ana.id,
        commentId: digestCommentB.id,
        groupKey: `thread:${digestCommentB.id}`,
      },
      {
        recipientId: digestA.id,
        kind: "artist_release" as const,
        releaseGroupId: single.id,
        groupKey: `release:${single.id}`,
      },
    ]);

    check(
      (await codeOf(() => preferences.setNotificationDigestEnabled(digestNeedsVerify.id, true))) ===
        "EMAIL_NOT_VERIFIED",
      "activar el resumen sin email verificado responde EMAIL_NOT_VERIFIED",
    );

    const sentMessages: EmailMessage[] = [];
    const transport: EmailTransport = {
      async send(message) {
        sentMessages.push(message);
        if (message.to === digestFail.email) throw new EmailDeliveryError(500);
      },
    };
    const digestNow = new Date();
    const digestWindowStart = new Date(digestNow.getTime() - 7 * 24 * 60 * 60 * 1000);
    const digestPreview = await digest.buildDigest(digestA.id, digestWindowStart, digestNow);
    check(
      digestPreview.forYou.total === 2 &&
        digestPreview.releases.total === 1 &&
        digestPreview.total === 3,
      "el resumen separa lo no leído en las dos secciones",
    );
    const oldPreview = await digest.buildDigest(digestOld.id, digestWindowStart, digestNow);
    check(oldPreview.total === 0, "la ventana deja fuera lo anterior a siete días");
    const firstRun = await sendDigests.sendNotificationDigests(digestNow, {
      transport,
      sendIntervalMs: 0,
    });
    if (firstRun.status !== "done") throw new Error("FALLÓ: la corrida del resumen quedó bloqueada");
    check(firstRun.recipients >= 4, "la corrida toma las personas opt-in con email verificado");
    check(firstRun.sent >= 1, "entrega el resumen de quien tiene novedades");
    check(firstRun.failed >= 1, "un fallo de entrega se cuenta y no corta el lote");
    check(firstRun.empty >= 2, "una semana sin entradas sin leer no envía nada");

    const messagesFor = (email: string) => sentMessages.filter((message) => message.to === email);
    check(messagesFor(digestA.email).length === 1, "el resumen sale una vez");
    check(messagesFor(digestRead.email).length === 0, "lo ya leído no entra en el resumen");
    check(messagesFor(digestOld.email).length === 0, "lo anterior a la ventana de 7 días no entra");
    check(messagesFor(digestUnverified.email).length === 0, "sin email verificado no se envía");
    check(messagesFor(digestOff.email).length === 0, "sin opt-in no se envía");
    check(messagesFor(digestDeactivated.email).length === 0, "una cuenta desactivada no recibe el resumen");
    check(messagesFor(digestSent.email).length === 0, "quien ya recibió el de esta semana no lo repite");

    const digestMessage = messagesFor(digestA.email)[0];
    if (!digestMessage) throw new Error("FALLÓ: no se capturó el resumen de la persona opt-in");
    check(digestMessage.subject.includes("3"), "el asunto lleva la cifra de entradas");
    check(
      digestMessage.text.includes("Para ti") && digestMessage.text.includes("Novedades"),
      "el correo trae las dos secciones",
    );
    check(
      digestMessage.headers?.["List-Unsubscribe"]?.includes("/api/notifications/unsubscribe?token=") === true &&
        digestMessage.headers["List-Unsubscribe-Post"] === "List-Unsubscribe=One-Click",
      "el correo lleva las cabeceras de baja en un clic",
    );

    const [digestAMark] = await db
      .select({ sentAt: appUser.notificationDigestSentAt })
      .from(appUser)
      .where(eq(appUser.id, digestA.id));
    check(digestAMark?.sentAt !== null, "la marca del último envío se escribe después de entregar");
    const [digestFailMark] = await db
      .select({ sentAt: appUser.notificationDigestSentAt })
      .from(appUser)
      .where(eq(appUser.id, digestFail.id));
    check(digestFailMark?.sentAt === null, "un fallo de entrega no mueve la marca");
    const [digestReadMark] = await db
      .select({ sentAt: appUser.notificationDigestSentAt })
      .from(appUser)
      .where(eq(appUser.id, digestRead.id));
    check(digestReadMark?.sentAt === null, "una semana vacía tampoco mueve la marca");

    const secondRun = await sendDigests.sendNotificationDigests(new Date(digestNow.getTime() + 60_000), {
      transport,
      sendIntervalMs: 0,
    });
    if (secondRun.status !== "done") throw new Error("FALLÓ: la segunda corrida quedó bloqueada");
    check(
      messagesFor(digestA.email).length === 1,
      "la segunda corrida de la misma semana no repite el resumen",
    );
    check(
      messagesFor(digestFail.email).length === 2,
      "la persona cuyo envío falló se reintenta en la corrida siguiente",
    );

    const beforeDryRun = sentMessages.length;
    const dryRun = await sendDigests.sendNotificationDigests(new Date(digestNow.getTime() + 120_000), {
      dryRun: true,
      transport,
      sendIntervalMs: 0,
    });
    if (dryRun.status !== "done") throw new Error("FALLÓ: el dry-run quedó bloqueado");
    check(dryRun.dryRun === true && dryRun.sent === 0, "el dry-run no entrega nada");
    check(dryRun.wouldSend >= 1, "el dry-run cuenta lo que se habría enviado");
    check(sentMessages.length === beforeDryRun, "el dry-run no toca el transporte");

    console.log("Baja del resumen: token firmado y sin sesión");
    const issuedWeek = sendDigests.weekStartUtc(digestNow).toISOString().slice(0, 10);
    const token = unsubscribe.unsubscribeToken(digestA.id, issuedWeek);
    check(unsubscribe.isValidUnsubscribeToken(token), "el token de la baja es válido");
    check(!unsubscribe.isValidUnsubscribeToken(`${token}x`), "un token alterado no vale");
    check(
      (await codeOf(() => unsubscribe.unsubscribeFromDigest(`${token}x`))) ===
        "INVALID_UNSUBSCRIBE_TOKEN",
      "un token alterado responde INVALID_UNSUBSCRIBE_TOKEN",
    );
    const apiUrl = digestMessage.headers?.["List-Unsubscribe"] ?? "";
    const emailedToken = decodeURIComponent(apiUrl.replace(/^</, "").replace(/>$/, "").split("token=")[1] ?? "");
    check(emailedToken === token, "el enlace del correo usa el token de la persona");
    check(
      unsubscribe.unsubscribePageUrl("es", token).includes("/es/notifications/unsubscribe?token=") &&
        unsubscribe.unsubscribeApiUrl(token).includes("/api/notifications/unsubscribe?token="),
      "la página y el endpoint de baja llevan el token",
    );

    const previousSecret = process.env.EMAIL_UNSUBSCRIBE_SECRET;
    process.env.EMAIL_UNSUBSCRIBE_SECRET = "otro-secreto";
    check(!unsubscribe.isValidUnsubscribeToken(token), "un token firmado con otro secreto no vale");
    process.env.EMAIL_UNSUBSCRIBE_SECRET = previousSecret;

    const ghostToken = unsubscribe.unsubscribeToken(randomUUID(), issuedWeek);
    check(
      (await codeOf(() => unsubscribe.unsubscribeFromDigest(ghostToken))) === null,
      "un token válido de una cuenta inexistente no falla",
    );
    await unsubscribe.unsubscribeFromDigest(token);
    const [unsubscribed] = await db
      .select({ enabled: appUser.notificationDigestEnabled })
      .from(appUser)
      .where(eq(appUser.id, digestA.id));
    check(unsubscribed?.enabled === false, "el token válido apaga el resumen");

    console.log("Agrupación por día en la zona del lector");
    const firstFollower = await db
      .select({ id: userFollow.id })
      .from(userFollow)
      .where(and(eq(userFollow.followerId, seg1.id), eq(userFollow.followedId, ana.id)));
    const secondFollower = await db
      .select({ id: userFollow.id })
      .from(userFollow)
      .where(and(eq(userFollow.followerId, seg2.id), eq(userFollow.followedId, ana.id)));
    await db
      .update(notification)
      .set({ createdAt: new Date("2026-01-02T02:00:00.000Z") })
      .where(and(eq(notification.recipientId, ana.id), eq(notification.followId, firstFollower[0]!.id)));
    await db
      .update(notification)
      .set({ createdAt: new Date("2026-01-02T03:00:00.000Z") })
      .where(and(eq(notification.recipientId, ana.id), eq(notification.followId, secondFollower[0]!.id)));

    const santiago = await read.listNotificationGroups(ana.id, { timeZone: "America/Santiago", pageSize: 50 });
    check(
      santiago.groups.some((group) => group.id === "followers:2026-01-01") &&
        santiago.groups.some((group) => group.id === "followers:2026-01-02"),
      "en America/Santiago los dos seguidores caen en días distintos",
    );
    const utc = await read.listNotificationGroups(ana.id, { timeZone: "UTC", pageSize: 50 });
    const utcGroup = utc.groups.find((group) => group.id === "followers:2026-01-02");
    check(utcGroup?.eventCount === 2 && utcGroup.actorCount === 2, "en UTC caen en el mismo día y se agrupan");

    console.log("Visto, leído y contador");
    const beforeSeen = await read.countUnseen(ana.id, "America/Santiago");
    check(beforeSeen > 0, "el contador cuenta entradas sin leer");
    await read.markSeen(ana.id);
    check((await read.countUnseen(ana.id, "America/Santiago")) === 0, "abrir la bandeja pone el contador a 0");
    check(
      (await read.listNotificationGroups(ana.id, { pageSize: 50 })).groups.some((group) => group.unread),
      "pero las entradas siguen sin leer",
    );
    await read.markRead(ana.id, { groupKeys: ["followers:2026-01-01"] }, "America/Santiago");
    const afterDayRead = await read.listNotificationGroups(ana.id, { timeZone: "America/Santiago", pageSize: 50 });
    check(afterDayRead.groups.find((group) => group.id === "followers:2026-01-01")?.unread === false, "marcar un día lo deja leído");
    check(afterDayRead.groups.find((group) => group.id === "followers:2026-01-02")?.unread === true, "el otro día sigue sin leer");
    // Una clave de otra persona no toca las filas de Ana: el destinatario va
    // siempre en el WHERE del UPDATE.
    await read.markRead(bruno.id, { groupKeys: ["thread:" + root.id] }, "America/Santiago");
    const afterForeignRead = await read.listNotificationGroups(ana.id, {
      timeZone: "America/Santiago",
      pageSize: 50,
    });
    check(
      afterForeignRead.groups.find((group) => group.id === `thread:${root.id}`)?.unread === true,
      "una clave ajena no toca las filas de otra persona",
    );
    await read.markRead(ana.id, { all: true });
    check(
      (await read.listNotificationGroups(ana.id, { pageSize: 50 })).groups.every((group) => !group.unread),
      "marcar todas deja la bandeja sin entradas pendientes",
    );

    console.log("CHECK de la migración 0075");
    check(
      (await codeOf(() =>
        db.insert(notification).values({
          recipientId: ana.id,
          kind: "comment_reply",
          actorId: bruno.id,
          groupKey: "thread:invalido",
        }),
      )) === "23514",
      "comment_reply sin comment_id viola el CHECK",
    );
    check(
      (await codeOf(() =>
        db.insert(notification).values({
          recipientId: ana.id,
          kind: "moderation",
          actorId: bruno.id,
          moderationActionId: hiddenAction!.id,
          groupKey: "moderation:invalido",
        }),
      )) === "23514",
      "moderation con actor viola el CHECK",
    );
    check(
      (await codeOf(() =>
        db.insert(notification).values({
          recipientId: ana.id,
          kind: "new_follower",
          actorId: ana.id,
          followId: firstFollower[0]!.id,
          groupKey: "followers",
        }),
      )) === "23514",
      "un aviso al propio actor viola el CHECK",
    );
    check(
      (await codeOf(() =>
        // El tipo del esquema no admite `moderation`: el CHECK debe rechazarlo igual.
        db.insert(notificationPreference).values({
          userId: ana.id,
          kind: "moderation" as OptionalNotificationKind,
          enabled: false,
        }),
      )) === "23514",
      "la preferencia de un tipo fijo viola el CHECK",
    );
    check(
      (await codeOf(() =>
        db.insert(notification).values({
          recipientId: ana.id,
          kind: "new_follower",
          actorId: seg2.id,
          followId: secondFollower[0]!.id,
          groupKey: "followers",
        }),
      )) === "23505",
      "el único parcial impide duplicar el mismo aviso",
    );

    console.log("Cascadas");
    await db.delete(comment).where(eq(comment.id, brunoReply.id));
    check((await countFor(ana.id, "comment_reply", brunoReply.id)) === 0, "borrar la respuesta borra sus avisos");
    await following.unfollowUser(seg2.id, ana.username);
    check((await countFor(ana.id, "new_follower")) === 2, "dejar de seguir borra el aviso de ese seguimiento");
    await db.delete(appUser).where(eq(appUser.id, seg2.id));
    check(
      (await countOf(and(eq(notification.recipientId, seg2.id), eq(notification.kind, "follow_accepted")))) === 0,
      "borrar la cuenta borra sus notificaciones como destinataria",
    );
    await db.delete(appUser).where(eq(appUser.id, bruno.id));
    check((await countFor(ana.id, "new_follower")) === 1, "borrar al actor borra sus avisos pendientes");
    await db.delete(comment).where(eq(comment.id, carlaRoot.id));
    check(
      (await countOf(and(eq(notification.recipientId, carla.id), eq(notification.commentId, blockedReply.id)))) === 0,
      "borrar la raíz arrastra las respuestas y sus avisos",
    );

    console.log("Contador bajo 10 ms con volumen");
    const bulkUsers = Array.from({ length: 100 }, (_, index) => newUser(`bulk${index}`));
    await db.insert(appUser).values(bulkUsers);
    const bulkFollows = await db
      .insert(userFollow)
      .values(bulkUsers.map((user) => ({ followerId: user.id, followedId: ana.id, status: "accepted" })))
      .returning({ id: userFollow.id });
    await db.insert(notification).values(
      bulkFollows.map((follow, index) => ({
        recipientId: ana.id,
        kind: "new_follower" as const,
        actorId: bulkUsers[index]!.id,
        followId: follow.id,
        groupKey: "followers",
      })),
    );
    const samples: number[] = [];
    for (let index = 0; index < 5; index += 1) {
      const started = performance.now();
      await read.countUnseen(ana.id, "America/Santiago");
      samples.push(performance.now() - started);
    }
    const best = Math.min(...samples);
    check(best < 10, `el contador responde en ${best.toFixed(2)} ms (tope 10 ms)`);

    console.log("\nSmoke test de notificaciones: OK");
  } finally {
    // `moderation_action.actor_id` es RESTRICT: soltar la auditoría antes de borrar cuentas.
    await db.delete(moderationAction).where(
      sql`${moderationAction.actorId} IN (SELECT id FROM app_user WHERE username LIKE 'smoke_notif_%')`,
    );
    await db.delete(appUser).where(like(appUser.username, "smoke_notif_%"));
    // El premio arrastra ceremonias, nominaciones y avisos por cascada.
    await db.delete(award).where(like(award.slug, "smoke-notif-%"));
    await db.delete(releaseGroup).where(sql`${releaseGroup.mbid}::text LIKE '5e0ce000-0000-4000-8000-00000000a9%'`);
    await db.delete(artist).where(eq(artist.mbid, ARTIST_MBID));
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

