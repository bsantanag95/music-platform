export {};

// Smoke test del cambio add-notifications-core contra Postgres REAL (el SQL que
// las pruebas unitarias mockean): cada fuente de emisión (respuestas, seguimientos
// y moderación), los CHECK de la migración 0075, las cascadas de retracción, los
// filtros de privacidad, la agrupación por día en la zona del lector, visto vs.
// leído, preferencias y el contador bajo 10 ms.
// Crea un artista sintético (MBID `5e0ce000-0000-4000-8000-00000000a9a0`) y
// usuarios `smoke_notif_*`, y los borra al terminar (también si falla). Si se
// interrumpió, limpiar con
//   DELETE FROM moderation_action WHERE actor_id IN (SELECT id FROM app_user WHERE username LIKE 'smoke_notif_%');
//   DELETE FROM app_user WHERE username LIKE 'smoke_notif_%';
//   DELETE FROM artist WHERE mbid = '5e0ce000-0000-4000-8000-00000000a9a0';
// (el `ON DELETE CASCADE` limpia notificaciones, seguimientos, comentarios,
// preferencias y restricciones; la primera sentencia suelta el `RESTRICT` de
// `moderation_action.actor_id`).
// Necesita la migración 0075 aplicada. Correr contra una BD de scratch:
//   ALLOW_SMOKE_ON_REAL_DB=1 npx tsx --env-file=.env scripts/smoke-test-notifications.ts

import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { and, eq, like, sql, type SQL } from "drizzle-orm";
import { assertSmokeAllowed } from "./assert-smoke-allowed";
import { db } from "../src/db";
import {
  appUser,
  artist,
  comment,
  moderationAction,
  notification,
  notificationPreference,
  userBlock,
  userFollow,
  userRole,
} from "../src/db/schema";
import type { NotificationKind, OptionalNotificationKind } from "../src/db/schema";

assertSmokeAllowed();

const suffix = randomUUID().slice(0, 8);
const ARTIST_MBID = "5e0ce000-0000-4000-8000-00000000a9a0";

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
  const [social, following, moderation, read, preferences] = await Promise.all([
    import("../src/services/social"),
    import("../src/services/social/following"),
    import("../src/services/moderation"),
    import("../src/services/notifications/read"),
    import("../src/services/notifications/preferences"),
  ]);
  return { social, following, moderation, read, preferences };
}

const newUser = (label: string, extra: Record<string, unknown> = {}) => ({
  id: randomUUID(),
  username: `smoke_notif_${label}_${suffix}`,
  email: `smoke_notif_${label}_${suffix}@example.test`,
  ...extra,
});

async function main() {
  const { social, following, moderation, read, preferences } = await loadServices();

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
    await db.delete(artist).where(eq(artist.mbid, ARTIST_MBID));
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
