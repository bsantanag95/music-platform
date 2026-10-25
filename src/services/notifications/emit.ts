import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  NOTIFICATION_KINDS,
  OPTIONAL_NOTIFICATION_KINDS,
  comment,
  notification,
  notificationPreference,
  userBlock,
} from "@/db/schema";
import type { NotificationKind, OptionalNotificationKind } from "@/db/schema";

// Emisión de notificaciones in-app (openspec: add-notifications-core, D3).
//
// Este es el ÚNICO punto que escribe en `notification`: los servicios fuente
// (`createReply`, `followUser`, `approveRequest`, la moderación) le pasan su
// transacción, así una acción que falla no deja aviso huérfano y un aviso no se
// pierde si la acción tuvo éxito. El emisor aplica las cuatro reglas que no se
// repiten en cada fuente:
//
//   1. nunca al propio actor;
//   2. nunca si hay un bloqueo en cualquier dirección entre actor y destinatario;
//   3. respeta `notification_preference` para los tipos desactivables (la
//      preferencia mira hacia adelante: no reescribe avisos ya emitidos);
//   4. `ON CONFLICT DO NOTHING` sobre los únicos parciales de la migración 0075.
//
// Los filtros de lectura (actor desactivado, contenido oculto) NO viven aquí:
// se aplican al leer (D4), para que restaurar o desbloquear deje la bandeja
// coherente sin reescribir filas.

export type NotificationTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Aviso de una respuesta (a la raíz o a un participante del hilo). */
export type CommentNotificationEvent = {
  kind: "comment_reply" | "thread_reply";
  recipientId: string;
  actorId: string;
  /** Respuesta que se notifica. */
  commentId: string;
  /** Raíz del hilo; da la clave de agrupación `thread:<rootId>`. */
  rootId: string;
};

/** Aviso de un seguimiento: nuevo seguidor, solicitud o aceptación. */
export type FollowNotificationEvent = {
  kind: "new_follower" | "follow_request" | "follow_accepted";
  recipientId: string;
  actorId: string;
  followId: string;
};

/**
 * Aviso de moderación. No lleva actor: la bandeja no nombra al moderador (igual
 * que la cola de moderación no se expone a la persona afectada).
 */
export type ModerationNotificationEvent = {
  kind: "moderation";
  recipientId: string;
  moderationActionId: string;
};

/**
 * Hito de un objeto propio (openspec: add-notification-milestones-and-releases,
 * D1 y D3). No lleva actor: los likes y los guardados son anónimos.
 */
export type MilestoneNotificationEvent =
  | {
      kind: "comment_like_milestone";
      recipientId: string;
      commentId: string;
      /** Raíz del hilo; da la clave de agrupación `likes:<commentId>`. */
      rootId: string;
      milestone: number;
    }
  | {
      kind: "list_save_milestone";
      recipientId: string;
      listId: string;
      milestone: number;
    };

/**
 * Aviso de lanzamiento (openspec: add-notification-milestones-and-releases,
 * D6). No lleva actor: un disco no tiene una persona detrás.
 */
export type ReleaseNotificationEvent = {
  kind: "artist_release" | "artist_release_announced" | "artist_single";
  recipientId: string;
  releaseGroupId: string;
};

export type NotificationEvent =
  | CommentNotificationEvent
  | FollowNotificationEvent
  | ModerationNotificationEvent
  | MilestoneNotificationEvent
  | ReleaseNotificationEvent;

const OPTIONAL_KINDS = OPTIONAL_NOTIFICATION_KINDS;

function isOptionalKind(kind: NotificationKind): kind is OptionalNotificationKind {
  return kind in OPTIONAL_KINDS;
}

/** Clave de agrupación (D5); el emisor es quien la deriva, nunca la fuente. */
function groupKeyFor(event: NotificationEvent): string {
  switch (event.kind) {
    case "comment_reply":
    case "thread_reply":
      return `thread:${event.rootId}`;
    case "new_follower":
      // Se parte por día local al leer; el valor es solo el grupo base.
      return "followers";
    case "follow_request":
    case "follow_accepted":
      // Cada solicitud / aceptación tiene sus propios botones o su propio texto.
      return `follow:${event.followId}`;
    case "moderation":
      return `moderation:${event.moderationActionId}`;
    case "comment_like_milestone":
      // Todos los hitos del mismo comentario son una sola entrada.
      return `likes:${event.commentId}`;
    case "list_save_milestone":
      return `saves:${event.listId}`;
    case "artist_release":
    case "artist_single":
      return `release:${event.releaseGroupId}`;
    case "artist_release_announced":
      return `announced:${event.releaseGroupId}`;
  }
}

/**
 * Identidad lógica del aviso: replica los únicos parciales de la migración
 * (`recipient_id` + objeto + tipo; el hito forma parte de la clave). Sirve para
 * deduplicar dentro del mismo lote antes de insertar, sin depender de que
 * Postgres lo haga por nosotros.
 */
function eventKey(event: NotificationEvent): string {
  const base = `${event.recipientId}:${event.kind}`;
  switch (event.kind) {
    case "comment_reply":
    case "thread_reply":
      return `${base}:${event.commentId}`;
    case "new_follower":
    case "follow_request":
    case "follow_accepted":
      return `${base}:${event.followId}`;
    case "moderation":
      return `${base}:${event.moderationActionId}`;
    case "comment_like_milestone":
      return `${base}:${event.commentId}:${event.milestone}`;
    case "list_save_milestone":
      return `${base}:${event.listId}:${event.milestone}`;
    case "artist_release":
    case "artist_release_announced":
    case "artist_single":
      return `${base}:${event.releaseGroupId}`;
  }
}

/** Avisos que llevan actor (y por tanto pasan por la regla de bloqueos). */
type ActorNotificationEvent = CommentNotificationEvent | FollowNotificationEvent;

function hasActor(event: NotificationEvent): event is ActorNotificationEvent {
  return "actorId" in event;
}

/**
 * Descarta los avisos entre cuentas que se tienen bloqueadas en cualquier
 * dirección, con una sola consulta por lote (no una por evento).
 */
async function withoutBlockedPairs(
  tx: NotificationTx,
  events: readonly NotificationEvent[],
): Promise<NotificationEvent[]> {
  const involved = new Set<string>();
  for (const event of events) {
    if (!hasActor(event)) continue;
    involved.add(event.actorId);
    involved.add(event.recipientId);
  }
  if (involved.size === 0) return [...events];

  const ids = [...involved];
  const blocks = await tx
    .select({ blockerId: userBlock.blockerId, blockedId: userBlock.blockedId })
    .from(userBlock)
    .where(and(inArray(userBlock.blockerId, ids), inArray(userBlock.blockedId, ids)));

  if (blocks.length === 0) return [...events];

  const blocked = new Set(blocks.map((block) => `${block.blockerId}:${block.blockedId}`));
  const isBlocked = (a: string, b: string) => blocked.has(`${a}:${b}`) || blocked.has(`${b}:${a}`);

  return events.filter((event) => !hasActor(event) || !isBlocked(event.actorId, event.recipientId));
}

/**
 * Descarta los tipos desactivables que la persona tiene apagados. La ausencia
 * de fila significa el defecto del tipo (D5): se leen las filas existentes y se
 * compara cada evento contra su valor efectivo.
 */
async function withEnabledPreferences(
  tx: NotificationTx,
  events: readonly NotificationEvent[],
): Promise<NotificationEvent[]> {
  const optional = events.filter((event) => isOptionalKind(event.kind));
  if (optional.length === 0) return [...events];

  const recipients = [...new Set(optional.map((event) => event.recipientId))];
  const kinds = [...new Set(optional.map((event) => event.kind))] as OptionalNotificationKind[];

  const rows = await tx
    .select({
      userId: notificationPreference.userId,
      kind: notificationPreference.kind,
      enabled: notificationPreference.enabled,
    })
    .from(notificationPreference)
    .where(
      and(
        inArray(notificationPreference.userId, recipients),
        inArray(notificationPreference.kind, kinds),
      ),
    );

  const saved = new Map(rows.map((row) => [`${row.userId}:${row.kind}`, row.enabled]));
  const enabledFor = (recipientId: string, kind: OptionalNotificationKind) =>
    saved.get(`${recipientId}:${kind}`) ?? OPTIONAL_NOTIFICATION_KINDS[kind];

  return events.filter(
    (event) => !isOptionalKind(event.kind) || enabledFor(event.recipientId, event.kind),
  );
}

/**
 * Emite un lote de avisos dentro de la transacción de la acción que los
 * produce. No lanza por eventos descartados (autoaviso, bloqueo, preferencia):
 * son resultado normal del filtrado, no un error de la acción.
 */
export async function emitNotifications(
  tx: NotificationTx,
  events: readonly NotificationEvent[],
): Promise<void> {
  // 1. Autoaviso y deduplicación del lote.
  const seen = new Set<string>();
  const candidates: NotificationEvent[] = [];
  for (const event of events) {
    if (hasActor(event) && event.actorId === event.recipientId) continue;
    const key = eventKey(event);
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push(event);
  }
  if (candidates.length === 0) return;

  // 2 y 3. Bloqueos y preferencias, en lote.
  const allowed = await withEnabledPreferences(tx, await withoutBlockedPairs(tx, candidates));
  if (allowed.length === 0) return;

  // 4. Inserción tolerante a duplicados ya existentes (re-seguir, reintentos).
  await tx
    .insert(notification)
    .values(
      allowed.map((event) => ({
        recipientId: event.recipientId,
        kind: event.kind,
        actorId: hasActor(event) ? event.actorId : null,
        commentId:
          event.kind === "comment_reply" ||
          event.kind === "thread_reply" ||
          event.kind === "comment_like_milestone"
            ? event.commentId
            : null,
        followId:
          event.kind === "new_follower" ||
          event.kind === "follow_request" ||
          event.kind === "follow_accepted"
            ? event.followId
            : null,
        moderationActionId: event.kind === "moderation" ? event.moderationActionId : null,
        milestone:
          event.kind === "comment_like_milestone" || event.kind === "list_save_milestone"
            ? event.milestone
            : null,
        listId: event.kind === "list_save_milestone" ? event.listId : null,
        releaseGroupId:
          event.kind === "artist_release" ||
          event.kind === "artist_release_announced" ||
          event.kind === "artist_single"
            ? event.releaseGroupId
            : null,
        groupKey: groupKeyFor(event),
      })),
    )
    .onConflictDoNothing();
}

// La lista de tipos vive en el esquema; se reexporta para que las fuentes no
// importen de `@/db/schema` solo para hablar de notificaciones.
export { NOTIFICATION_KINDS };
export type { NotificationKind, OptionalNotificationKind };

/**
 * Emite el hito de un objeto propio (D3). No avisa si ya hay una notificación
 * de ese hito o de uno mayor para el mismo objeto: saltar de 9 a 30 avisa 25, y
 * volver a dar like tras un unlike no repite el aviso. El único parcial
 * `(recipient_id, objeto, kind, milestone)` absorbe las carreras; aquí se
 * consulta antes para no escribir una fila que la regla de "solo el más alto"
 * descartaría.
 */
export async function emitMilestoneNotification(
  tx: NotificationTx,
  event: MilestoneNotificationEvent,
): Promise<void> {
  const objectCondition =
    event.kind === "comment_like_milestone"
      ? eq(notification.commentId, event.commentId)
      : eq(notification.listId, event.listId);

  const [existing] = await tx
    .select({ id: notification.id })
    .from(notification)
    .where(
      and(
        eq(notification.recipientId, event.recipientId),
        eq(notification.kind, event.kind),
        objectCondition,
        gte(notification.milestone, event.milestone),
      ),
    )
    .limit(1);

  if (existing) return;
  await emitNotifications(tx, [event]);
}

/** Días de historia que cubre un aviso de "ya salió" (D6). */
export const ARTIST_RELEASE_WINDOW_DAYS = 14;

/** Disco del calendario que puede generar un aviso de lanzamiento. */
export interface ReleaseNotificationCandidate {
  releaseGroupId: string;
  /** Fecha de primer lanzamiento verificada (`YYYY-MM-DD`). */
  releaseDate: string;
  category: "album" | "ep" | "single";
}

const DAY_MS = 24 * 60 * 60 * 1000;

function shiftDay(day: string, days: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Lote de discos que comparten aviso, ya deduplicado. */
export interface ReleaseNotificationBatch {
  kind: ReleaseNotificationEvent["kind"];
  releaseGroupIds: string[];
}

/**
 * Clasifica los discos del calendario en los avisos que generan (D6). Separado
 * del `INSERT … SELECT` para poder probar la ventana y la deduplicación sin
 * base de datos.
 *
 * - Álbum / EP de los últimos 14 días → `artist_release`.
 * - Álbum / EP con fecha futura → `artist_release_announced`.
 * - Sencillo de los últimos 14 días → `artist_single`. Un sencillo por salir no avisa: si
 *   generara un anunciado, le llegaría a quien activó los anunciados con los sencillos apagados.
 */
export function releaseNotificationBatches(
  entries: readonly ReleaseNotificationCandidate[],
  today: string,
): ReleaseNotificationBatch[] {
  const from = shiftDay(today, -ARTIST_RELEASE_WINDOW_DAYS);

  const byKind: Record<ReleaseNotificationEvent["kind"], Set<string>> = {
    artist_release: new Set(),
    artist_release_announced: new Set(),
    artist_single: new Set(),
  };

  for (const entry of entries) {
    const single = entry.category === "single";
    if (entry.releaseDate > today) {
      if (!single) byKind.artist_release_announced.add(entry.releaseGroupId);
    } else if (entry.releaseDate >= from) {
      byKind[single ? "artist_single" : "artist_release"].add(entry.releaseGroupId);
    }
  }

  return (Object.keys(byKind) as Array<ReleaseNotificationEvent["kind"]>)
    .map((kind) => ({ kind, releaseGroupIds: [...byKind[kind]] }))
    .filter((batch) => batch.releaseGroupIds.length > 0);
}

/**
 * Avisa a quien sigue a un artista acreditado de que un disco salió o está
 * anunciado (D6). Un `INSERT … SELECT … ON CONFLICT DO NOTHING` por tipo:
 * destinatarios, cuenta activa y preferencia (con su defecto) se resuelven en
 * SQL, sin una fila por seguidor en memoria. El único
 * `(recipient_id, release_group_id, kind)` hace idempotente la sincronización
 * diaria.
 */
export async function emitArtistReleaseNotifications(
  tx: NotificationTx,
  entries: readonly ReleaseNotificationCandidate[],
  today: string,
): Promise<void> {
  for (const { kind, releaseGroupIds: ids } of releaseNotificationBatches(entries, today)) {
    const values = sql.join(
      ids.map((id) => sql`(${id}::uuid)`),
      sql`, `,
    );
    const defaultEnabled = OPTIONAL_NOTIFICATION_KINDS[kind];
    const groupKeyPrefix = kind === "artist_release_announced" ? "announced:" : "release:";

    await tx.execute(sql`
      INSERT INTO notification (recipient_id, kind, release_group_id, group_key)
      SELECT DISTINCT
        af.user_id,
        ${kind},
        t.release_group_id,
        ${groupKeyPrefix} || t.release_group_id::text
      FROM (VALUES ${values}) AS t (release_group_id)
      JOIN credit c ON c.release_group_id = t.release_group_id AND c.role = 'primary'
      JOIN artist_follow af ON af.artist_id = c.artist_id
      JOIN app_user u ON u.id = af.user_id AND u.deactivated_at IS NULL
      LEFT JOIN notification_preference p
        ON p.user_id = af.user_id AND p.kind = ${kind}
      WHERE coalesce(p.enabled, ${defaultEnabled})
      ON CONFLICT DO NOTHING
    `);
  }
}

/**
 * Retira la `follow_request` de un seguimiento que dejó de estar pendiente
 * (se aprobó o se consolidó como seguimiento mutuo). La fila de `user_follow`
 * no se borra en esos casos, así que la cascada de D2 no la retira sola.
 */
export async function retractFollowRequestNotifications(
  tx: NotificationTx,
  followIds: readonly string[],
): Promise<void> {
  if (followIds.length === 0) return;
  await tx
    .delete(notification)
    .where(and(inArray(notification.followId, [...followIds]), eq(notification.kind, "follow_request")));
}

/**
 * Emite los avisos de una respuesta nueva: al autor de la raíz (`comment_reply`)
 * y a las personas distintas que ya respondieron en el hilo (`thread_reply`),
 * sin el autor de la raíz ni quien responde. Si el autor de la raíz también
 * participó, recibe solo `comment_reply` (prioridad de la raíz).
 *
 * Los destinatarios se resuelven aquí y no en `createReply` para que la regla
 * viva en un solo lugar y sea comprobable con una transacción falsa.
 */
export async function emitReplyNotifications(
  tx: NotificationTx,
  reply: { commentId: string; rootId: string; rootAuthorId: string; actorId: string },
): Promise<void> {
  const participants = await tx
    .select({ userId: comment.userId })
    .from(comment)
    .where(and(eq(comment.parentId, reply.rootId), eq(comment.moderationStatus, "visible")));

  const events: NotificationEvent[] = [];
  const already = new Set([reply.actorId, reply.rootAuthorId]);

  if (reply.rootAuthorId !== reply.actorId) {
    events.push({
      kind: "comment_reply",
      recipientId: reply.rootAuthorId,
      actorId: reply.actorId,
      commentId: reply.commentId,
      rootId: reply.rootId,
    });
  }

  for (const participant of participants) {
    if (already.has(participant.userId)) continue;
    already.add(participant.userId);
    events.push({
      kind: "thread_reply",
      recipientId: participant.userId,
      actorId: reply.actorId,
      commentId: reply.commentId,
      rootId: reply.rootId,
    });
  }

  await emitNotifications(tx, events);
}
