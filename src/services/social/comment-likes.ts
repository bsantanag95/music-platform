import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { comment, commentLike } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
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

async function findComment(commentId: string) {
  const [row] = await db
    .select({ id: comment.id, userId: comment.userId, moderationStatus: comment.moderationStatus })
    .from(comment)
    .where(eq(comment.id, commentId))
    .limit(1);
  // Un comentario oculto por moderación no existe para quien lo likea.
  if (!row || row.moderationStatus !== "visible") {
    throw new ApiError("COMMENT_NOT_FOUND", 404, "Comentario no encontrado");
  }
  return row;
}

/**
 * Da like (idempotente). El llamador ya verificó sesión y suspensión social.
 * Rechaza el comentario propio y los bloqueos en cualquier dirección.
 */
export async function likeComment(commentId: string, userId: string): Promise<CommentLikeState> {
  const target = await findComment(commentId);
  if (target.userId === userId) {
    throw new ApiError("PERMISSION_DENIED", 403, "No puedes dar like a tu propio comentario");
  }
  if (await isBlockedBetween(userId, target.userId)) {
    throw new ApiError("BLOCKED", 403, "No puedes realizar esta acción con esta cuenta");
  }
  await db.insert(commentLike).values({ commentId, userId }).onConflictDoNothing();
  return { liked: true, likeCount: thresholdedLikeCount(await countLikes(commentId)) };
}

/** Quita el like (idempotente). Sigue permitido bajo suspensión social y bloqueo. */
export async function unlikeComment(commentId: string, userId: string): Promise<CommentLikeState> {
  await findComment(commentId);
  await db
    .delete(commentLike)
    .where(and(eq(commentLike.commentId, commentId), eq(commentLike.userId, userId)));
  return { liked: false, likeCount: thresholdedLikeCount(await countLikes(commentId)) };
}
