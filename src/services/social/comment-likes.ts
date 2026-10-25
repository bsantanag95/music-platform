import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { comment, commentLike } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import type { NotificationTx } from "@/services/notifications/emit";
import { emitMilestoneNotification } from "@/services/notifications/emit";
import {
  COMMENT_LIKE_MILESTONES,
  highestMilestone,
} from "@/services/notifications/milestones";
import { isBlockedBetween } from "./relations";

// Likes en comentarios (openspec: add-comment-likes). Registro anónimo: la
// identidad de quien likeó no sale nunca de este módulo; solo el conteo y, para
// el propio visitante, si él mismo likeó.

/** Desde cuántos likes se muestra la cifra (decisión de producto: sin gamificación). */
export const COMMENT_LIKE_DISPLAY_THRESHOLD = 3;

/** Cifra visible: `null` bajo el umbral, el número real desde él. El real nunca sale del servidor. */
export function thresholdedLikeCount(count: number): number | null {
  return count >= COMMENT_LIKE_DISPLAY_THRESHOLD ? count : null;
}

/**
 * Conteo real de likes del comentario, sin likes de cuentas desactivadas
 * (reaparecen al reactivar). Correlacionado con `"comment"."id"` por literal:
 * lo usan consultas que tienen `comment` en el FROM (lista de comentarios,
 * Comentarios populares).
 */
export const COMMENT_LIKE_COUNT_SQL = sql<number>`(
  SELECT count(*)::int
  FROM comment_like cl
  JOIN app_user lu ON lu.id = cl.user_id
  WHERE cl.comment_id = "comment"."id" AND lu.deactivated_at IS NULL
)`;

/** ¿Likeó el visitante este comentario? Mismo requisito de correlación que `COMMENT_LIKE_COUNT_SQL`. */
export const likedByViewerSql = (viewerId: string) =>
  sql<boolean>`EXISTS (
    SELECT 1 FROM comment_like cl
    WHERE cl.comment_id = "comment"."id" AND cl.user_id = ${viewerId}
  )`;

export interface CommentLikeState {
  liked: boolean;
  /** Cifra visible (`null` bajo el umbral). */
  likeCount: number | null;
}

async function countLikes(commentId: string): Promise<number> {
  const [row] = await db
    .select({ count: COMMENT_LIKE_COUNT_SQL })
    .from(comment)
    .where(eq(comment.id, commentId));
  return row?.count ?? 0;
}

/** Mismo conteo dentro de la transacción del like (ve la fila recién insertada). */
async function countLikesInTx(tx: NotificationTx, commentId: string): Promise<number> {
  const [row] = await tx
    .select({ count: COMMENT_LIKE_COUNT_SQL })
    .from(comment)
    .where(eq(comment.id, commentId));
  return row?.count ?? 0;
}

async function findComment(commentId: string) {
  const [row] = await db
    .select({ id: comment.id, userId: comment.userId, moderationStatus: comment.moderationStatus, parentId: comment.parentId })
    .from(comment)
    .where(eq(comment.id, commentId))
    .limit(1);
  // Un comentario oculto por moderación no existe para quien lo likea.
  if (!row || row.moderationStatus !== "visible") {
    throw new ApiError("COMMENT_NOT_FOUND", 404, "Comentario no encontrado");
  }
  // Una respuesta cuya raíz está oculta también está oculta (el hilo cae con su raíz). Ver
  // `comment-roots.ts`: los likes leen `comment` completo, raíces y respuestas.
  if (row.parentId) {
    const [root] = await db
      .select({ moderationStatus: comment.moderationStatus })
      .from(comment)
      .where(eq(comment.id, row.parentId))
      .limit(1);
    if (!root || root.moderationStatus !== "visible") {
      throw new ApiError("COMMENT_NOT_FOUND", 404, "Comentario no encontrado");
    }
  }
  return row;
}

/**
 * Da like (idempotente). El llamador ya verificó sesión y suspensión social.
 * Rechaza el comentario propio y los bloqueos en cualquier dirección.
 *
 * El like y su hito se escriben en la misma transacción (openspec:
 * add-notification-milestones-and-releases, D3): solo un like nuevo cuenta y
 * el conteo usa la misma regla que la cifra pública (sin cuentas desactivadas).
 */
export async function likeComment(commentId: string, userId: string): Promise<CommentLikeState> {
  const target = await findComment(commentId);
  if (target.userId === userId) {
    throw new ApiError("PERMISSION_DENIED", 403, "No puedes dar like a tu propio comentario");
  }
  if (await isBlockedBetween(userId, target.userId)) {
    throw new ApiError("BLOCKED", 403, "No puedes realizar esta acción con esta cuenta");
  }

  return db.transaction(async (tx) => {
    const inserted = await tx
      .insert(commentLike)
      .values({ commentId, userId })
      .onConflictDoNothing()
      .returning({ userId: commentLike.userId });
    const count = await countLikesInTx(tx, commentId);

    // Un re-like no vuelve a contar: el hito ya ocurrió y un unlike no lo retira.
    if (inserted.length > 0) {
      const milestone = highestMilestone(COMMENT_LIKE_MILESTONES, count);
      if (milestone !== null) {
        await emitMilestoneNotification(tx, {
          kind: "comment_like_milestone",
          recipientId: target.userId,
          commentId,
          // La raíz del hilo: el propio comentario cuando es una raíz.
          rootId: target.parentId ?? commentId,
          milestone,
        });
      }
    }

    return { liked: true, likeCount: thresholdedLikeCount(count) };
  });
}

/** Quita el like (idempotente). Sigue permitido bajo suspensión social y bloqueo. */
export async function unlikeComment(commentId: string, userId: string): Promise<CommentLikeState> {
  await findComment(commentId);
  await db
    .delete(commentLike)
    .where(and(eq(commentLike.commentId, commentId), eq(commentLike.userId, userId)));
  return { liked: false, likeCount: thresholdedLikeCount(await countLikes(commentId)) };
}
