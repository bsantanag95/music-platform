import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { appUser, artist, comment, COMMENT_TOPICS, DEFAULT_COMMENT_TOPIC, rating, ratingHighlight, recording, releaseGroup } from "@/db/schema";
import type { CommentTopic } from "@/db/schema";
import { maskAuthor } from "@/services/auth/account-status";
import { ApiError } from "@/lib/api/errors";
import { COMMENT_LIKE_COUNT_SQL, likedByViewerSql, thresholdedLikeCount } from "@/services/social/comment-likes";
import { COMMENT_EFFECTIVE_TOPIC_SQL, COMMENT_REPLY_COUNT_SQL, rootCommentsOnly } from "@/services/social/comment-roots";
import { isBlockedBetween } from "@/services/social/relations";
import { isScoreCoherent, starsFromScore } from "@/lib/rating-range";
import type { SocialTargetType } from "@/lib/api/schemas";

type TargetColumn = "artistId" | "releaseGroupId" | "recordingId";
const targetColumns: Record<SocialTargetType, TargetColumn> = {
  artist: "artistId",
  "release-group": "releaseGroupId",
  recording: "recordingId",
};

export type SocialTarget = { type: SocialTargetType; id: string; column: TargetColumn };

export async function resolveSocialTarget(type: SocialTargetType, id: string): Promise<SocialTarget> {
  const table = type === "artist" ? artist : type === "release-group" ? releaseGroup : recording;
  const [found] = await db.select({ id: table.id }).from(table).where(eq(table.id, id)).limit(1);
  if (!found) throw new ApiError("INVALID_TARGET", 404, "El objetivo no existe");
  return { type, id, column: targetColumns[type] };
}

function targetWhere(target: SocialTarget) {
  return eq({ artistId: rating.artistId, releaseGroupId: rating.releaseGroupId, recordingId: rating.recordingId }[target.column], target.id);
}

export function targetValues(target: SocialTarget) {
  return { artistId: target.type === "artist" ? target.id : null, releaseGroupId: target.type === "release-group" ? target.id : null, recordingId: target.type === "recording" ? target.id : null };
}

/** Fila `rating` vigente del usuario sobre el objetivo, o `null`. Sin agregados. */
export async function getOwnRatingRow(target: SocialTarget, userId: string) {
  const [own] = await db
    .select()
    .from(rating)
    .where(and(targetWhere(target), eq(rating.userId, userId)))
    .limit(1);
  return own ?? null;
}

export async function getRatings(target: SocialTarget, userId?: string) {
  const [own] = userId
    ? await db.select().from(rating).where(and(targetWhere(target), eq(rating.userId, userId))).limit(1)
    : [];
  const [aggregate] = await db
    .select({
      count: sql<number>`count(*)::int`,
      averageStars: sql<number | null>`avg(${rating.stars})::float`,
      averageDetailedScore: sql<number | null>`avg(${rating.detailedScore})::float`,
    })
    .from(rating)
    .where(targetWhere(target));
  let isHighlighted = false;
  if (own) {
    const [highlighted] = await db
      .select({ ratingId: ratingHighlight.ratingId })
      .from(ratingHighlight)
      .where(and(eq(ratingHighlight.userId, own.userId), eq(ratingHighlight.ratingId, own.id)))
      .limit(1);
    isHighlighted = Boolean(highlighted);
  }
  return {
    own: own ? { ...serializeRating(own), isHighlighted } : null,
    aggregate: aggregate ?? { count: 0, averageStars: null, averageDetailedScore: null },
  };
}

/**
 * Valida una valoración y devuelve las estrellas efectivas. Con `detailedScore` y sin
 * `stars`, las estrellas se derivan (`starsFromScore`); con ambos, se exige coherencia
 * (openspec: define-detailed-score, D3/D4). Sin ninguno de los dos es un error de entrada.
 */
export function validateRating(stars: number | undefined, detailedScore?: number): number {
  if (stars === undefined && detailedScore === undefined) {
    throw new ApiError("VALIDATION_ERROR", 400, "Se requiere al menos estrellas o puntaje detallado");
  }
  if (stars !== undefined && (stars < 0.5 || stars > 5 || stars * 2 !== Math.round(stars * 2))) {
    throw new ApiError("INVALID_RATING", 400, "Las estrellas deben estar entre 0.5 y 5 en pasos de 0.5");
  }
  const resolvedStars = stars ?? starsFromScore(detailedScore!);
  if (detailedScore !== undefined && !isScoreCoherent(resolvedStars, detailedScore)) {
    throw new ApiError("INVALID_RATING", 400, "La valoración detallada no es coherente con las estrellas");
  }
  return resolvedStars;
}

export async function upsertRating(target: SocialTarget, userId: string, stars: number | undefined, detailedScore?: number) {
  const resolvedStars = validateRating(stars, detailedScore);
  const values = { ...targetValues(target), userId, stars: String(resolvedStars), detailedScore: detailedScore ?? null };
  const targetColumn = rating[target.column];
  const [saved] = await db
    .insert(rating)
    .values(values)
    .onConflictDoUpdate({
      target: [rating.userId, targetColumn],
      targetWhere: sql`${targetColumn} IS NOT NULL`,
      set: { stars: values.stars, detailedScore: values.detailedScore },
    })
    .returning();
  if (!saved) throw new ApiError("INTERNAL_ERROR", 500, "No se pudo guardar el rating");
  return serializeRating(saved);
}

export async function deleteRating(target: SocialTarget, userId: string) {
  const deleted = await db.delete(rating).where(and(targetWhere(target), eq(rating.userId, userId))).returning({ id: rating.id });
  if (!deleted.length) throw new ApiError("RATING_NOT_FOUND", 404, "No existe un rating propio para este objetivo");
}

/**
 * Valida un tema (add-artist-comment-topics): solo los comentarios de artista tienen tema, del
 * catálogo cerrado. Devuelve `undefined` si no se pidió tema; cualquier otro caso inválido lanza
 * `INVALID_TOPIC` (el `CHECK` de la base lo garantiza igual, pero sin código propio).
 */
function parseTopic(target: SocialTarget, topic: string | null | undefined): CommentTopic | undefined {
  if (topic === undefined || topic === null) return undefined;
  if (target.type !== "artist" || !(COMMENT_TOPICS as readonly string[]).includes(topic)) {
    throw new ApiError("INVALID_TOPIC", 400, "El tema no es válido");
  }
  return topic as CommentTopic;
}

/**
 * `viewerId`: quien mira (opcional), para `likedByMe`; la cifra de likes sale umbralizada.
 * `topic`: filtro por tema, solo para artistas (add-artist-comment-topics); sin él, todos los temas.
 */
export async function listComments(target: SocialTarget, page = 1, pageSize = 20, viewerId: string | null = null, topic?: string | null) {
  const topicFilter = parseTopic(target, topic);
  const rows = await db.select({ id: comment.id, body: comment.body, topic: comment.topic, parentId: comment.parentId, replyCount: COMMENT_REPLY_COUNT_SQL, createdAt: comment.createdAt, likes: COMMENT_LIKE_COUNT_SQL, likedByMe: viewerId ? likedByViewerSql(viewerId) : sql<boolean>`false`, user: { id: appUser.id, username: appUser.username, displayName: appUser.displayName, deactivatedAt: appUser.deactivatedAt } }).from(comment).innerJoin(appUser, eq(comment.userId, appUser.id)).where(and(rootCommentsOnly(), commentTargetWhere(target), eq(comment.moderationStatus, "visible"), topicFilter ? eq(comment.topic, topicFilter) : undefined)).orderBy(desc(comment.createdAt), desc(comment.id)).limit(pageSize + 1).offset((page - 1) * pageSize);
  return { comments: rows.slice(0, pageSize).map((row) => serializeComment(row, { likes: row.likes, likedByMe: row.likedByMe })), page, pageSize, hasNext: rows.length > pageSize };
}

function commentTargetWhere(target: SocialTarget) {
  return eq({ artistId: comment.artistId, releaseGroupId: comment.releaseGroupId, recordingId: comment.recordingId }[target.column], target.id);
}

export async function createComment(target: SocialTarget, userId: string, body: string, topic?: string | null) {
  const value = body.trim();
  if (!value || value.length > 5000) throw new ApiError("INVALID_COMMENT", 400, "El comentario no es válido");
  // Artista: tema pedido o `general`; álbum/canción: sin tema (pedir uno es un error).
  const resolvedTopic = parseTopic(target, topic) ?? (target.type === "artist" ? DEFAULT_COMMENT_TOPIC : null);
  const [created] = await db.insert(comment).values({ ...targetValues(target), userId, body: value, topic: resolvedTopic }).returning();
  if (!created) throw new ApiError("INTERNAL_ERROR", 500, "No se pudo crear el comentario");
  return getComment(created.id);
}

async function getComment(id: string) {
  const [row] = await db.select({ id: comment.id, body: comment.body, topic: COMMENT_EFFECTIVE_TOPIC_SQL, parentId: comment.parentId, replyCount: COMMENT_REPLY_COUNT_SQL, createdAt: comment.createdAt, user: { id: appUser.id, username: appUser.username, displayName: appUser.displayName, deactivatedAt: appUser.deactivatedAt } }).from(comment).innerJoin(appUser, eq(comment.userId, appUser.id)).where(and(eq(comment.id, id), eq(comment.moderationStatus, "visible"))).limit(1);
  if (!row) throw new ApiError("COMMENT_NOT_FOUND", 404, "Comentario no encontrado");
  return serializeComment(row);
}

/**
 * Responde a un comentario de artista (openspec: add-comment-replies). Un solo nivel: si `commentId`
 * es una respuesta, la nueva se cuelga de su raíz. La respuesta copia el objetivo de la raíz (lo
 * fija el servidor, nunca el cliente) y no guarda tema: hereda el de la raíz.
 * El llamador ya verificó sesión y suspensión social.
 */
export async function createReply(commentId: string, userId: string, body: string) {
  const value = body.trim();
  if (!value || value.length > 5000) throw new ApiError("INVALID_COMMENT", 400, "El comentario no es válido");
  const root = await findVisibleRoot(commentId);
  if (!root.artistId) throw new ApiError("REPLIES_NOT_ALLOWED", 400, "Este comentario no admite respuestas");
  if (await isBlockedBetween(userId, root.userId)) throw new ApiError("BLOCKED", 403, "No puedes realizar esta acción con esta cuenta");
  const [created] = await db.insert(comment).values({ userId, artistId: root.artistId, parentId: root.id, body: value, topic: null }).returning();
  if (!created) throw new ApiError("INTERNAL_ERROR", 500, "No se pudo crear la respuesta");
  return getComment(created.id);
}

/**
 * Hilo de una raíz: sus respuestas visibles, de la más antigua a la más reciente (una conversación
 * se lee en orden). `COMMENT_NOT_FOUND` si no existe, no es raíz o está oculta por moderación.
 */
export async function listReplies(rootId: string, page = 1, pageSize = 20, viewerId: string | null = null) {
  const root = await findVisibleRoot(rootId, { strict: true });
  const rows = await db.select({ id: comment.id, body: comment.body, topic: COMMENT_EFFECTIVE_TOPIC_SQL, parentId: comment.parentId, replyCount: COMMENT_REPLY_COUNT_SQL, createdAt: comment.createdAt, likes: COMMENT_LIKE_COUNT_SQL, likedByMe: viewerId ? likedByViewerSql(viewerId) : sql<boolean>`false`, user: { id: appUser.id, username: appUser.username, displayName: appUser.displayName, deactivatedAt: appUser.deactivatedAt } }).from(comment).innerJoin(appUser, eq(comment.userId, appUser.id)).where(and(eq(comment.parentId, root.id), eq(comment.moderationStatus, "visible"))).orderBy(asc(comment.createdAt), asc(comment.id)).limit(pageSize + 1).offset((page - 1) * pageSize);
  return { comments: rows.slice(0, pageSize).map((row) => serializeComment(row, { likes: row.likes, likedByMe: row.likedByMe })), page, pageSize, hasNext: rows.length > pageSize };
}

/**
 * La raíz visible de un comentario. Con `strict`, el comentario debe SER la raíz (hilo); sin él, si es
 * una respuesta se sube a su raíz (publicar). Una raíz oculta, o una respuesta cuya raíz está oculta,
 * no existe.
 */
async function findVisibleRoot(commentId: string, options: { strict?: boolean } = {}) {
  const [row] = await db.select({ id: comment.id, userId: comment.userId, artistId: comment.artistId, parentId: comment.parentId, moderationStatus: comment.moderationStatus }).from(comment).where(eq(comment.id, commentId)).limit(1);
  if (!row || row.moderationStatus !== "visible") throw new ApiError("COMMENT_NOT_FOUND", 404, "Comentario no encontrado");
  if (!row.parentId) return row;
  if (options.strict) throw new ApiError("COMMENT_NOT_FOUND", 404, "Comentario no encontrado");
  const [root] = await db.select({ id: comment.id, userId: comment.userId, artistId: comment.artistId, parentId: comment.parentId, moderationStatus: comment.moderationStatus }).from(comment).where(eq(comment.id, row.parentId)).limit(1);
  if (!root || root.moderationStatus !== "visible") throw new ApiError("COMMENT_NOT_FOUND", 404, "Comentario no encontrado");
  return root;
}

export async function updateComment(id: string, userId: string, body: string) {
  const value = body.trim();
  if (!value || value.length > 5000) throw new ApiError("INVALID_COMMENT", 400, "El comentario no es válido");
  const [existing] = await db.select({ id: comment.id, userId: comment.userId }).from(comment).where(eq(comment.id, id)).limit(1);
  if (!existing) throw new ApiError("COMMENT_NOT_FOUND", 404, "Comentario no encontrado");
  if (existing.userId !== userId) throw new ApiError("PERMISSION_DENIED", 403, "No puedes modificar este comentario");
  await db.update(comment).set({ body: value }).where(eq(comment.id, id));
  return getComment(id);
}

export async function deleteComment(id: string, userId: string) {
  const [existing] = await db.select({ id: comment.id, userId: comment.userId }).from(comment).where(eq(comment.id, id)).limit(1);
  if (!existing) throw new ApiError("COMMENT_NOT_FOUND", 404, "Comentario no encontrado");
  if (existing.userId !== userId) throw new ApiError("PERMISSION_DENIED", 403, "No puedes borrar este comentario");
  const deleted = await db.delete(comment).where(and(eq(comment.id, id), eq(comment.userId, userId))).returning({ id: comment.id });
  if (!deleted.length) throw new ApiError("COMMENT_NOT_FOUND", 404, "Comentario no encontrado");
}

function serializeRating(row: typeof rating.$inferSelect) {
  return { ...row, stars: Number(row.stars), detailedScore: row.detailedScore, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}
function serializeComment(row: { id: string; body: string; topic: CommentTopic | null; parentId?: string | null; replyCount?: number; createdAt: Date; user: { id: string; username: string | null; displayName: string | null; deactivatedAt: Date | null } }, likes: { likes: number; likedByMe: boolean } = { likes: 0, likedByMe: false }) {
  // Una cuenta desactivada conserva sus comentarios, pero sin nombre ni usuario reales.
  return { id: row.id, body: row.body, topic: row.topic, parentId: row.parentId ?? null, replyCount: row.replyCount ?? 0, user: maskAuthor(row.user), createdAt: row.createdAt.toISOString(), likeCount: thresholdedLikeCount(likes.likes), likedByMe: likes.likedByMe };
}
