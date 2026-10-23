import { and, eq, inArray } from "drizzle-orm";
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

export type NotificationEvent =
  | CommentNotificationEvent
  | FollowNotificationEvent
  | ModerationNotificationEvent;

const OPTIONAL_KINDS: readonly string[] = OPTIONAL_NOTIFICATION_KINDS;

function isOptionalKind(kind: NotificationKind): kind is OptionalNotificationKind {
  return OPTIONAL_KINDS.includes(kind);
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
  }
}

/**
 * Identidad lógica del aviso: replica los únicos parciales de la migración
 * (`recipient_id` + objeto + tipo). Sirve para deduplicar dentro del mismo lote
 * antes de insertar, sin depender de que Postgres lo haga por nosotros.
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
  }
}

function hasActor(event: NotificationEvent): event is Exclude<NotificationEvent, ModerationNotificationEvent> {
  return event.kind !== "moderation";
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
 * Descarta los tipos desactivables que la persona tiene apagados. Solo se
 * consultan las filas existentes (la ausencia de fila = activado).
 */
async function withEnabledPreferences(
  tx: NotificationTx,
  events: readonly NotificationEvent[],
): Promise<NotificationEvent[]> {
  const optional = events.filter((event) => isOptionalKind(event.kind));
  if (optional.length === 0) return [...events];

  const recipients = [...new Set(optional.map((event) => event.recipientId))];
  const kinds = [...new Set(optional.map((event) => event.kind))] as OptionalNotificationKind[];

  const disabledRows = await tx
    .select({ userId: notificationPreference.userId, kind: notificationPreference.kind })
    .from(notificationPreference)
    .where(
      and(
        inArray(notificationPreference.userId, recipients),
        inArray(notificationPreference.kind, kinds),
        eq(notificationPreference.enabled, false),
      ),
    );

  if (disabledRows.length === 0) return [...events];

  const disabled = new Set(disabledRows.map((row) => `${row.userId}:${row.kind}`));
  return events.filter(
    (event) => !isOptionalKind(event.kind) || !disabled.has(`${event.recipientId}:${event.kind}`),
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
          event.kind === "comment_reply" || event.kind === "thread_reply" ? event.commentId : null,
        followId:
          event.kind === "new_follower" ||
          event.kind === "follow_request" ||
          event.kind === "follow_accepted"
            ? event.followId
            : null,
        moderationActionId: event.kind === "moderation" ? event.moderationActionId : null,
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
