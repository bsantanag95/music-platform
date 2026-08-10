import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { appUser, artist, comment, rating, recording, releaseGroup } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
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

function targetValues(target: SocialTarget) {
  return { artistId: target.type === "artist" ? target.id : null, releaseGroupId: target.type === "release-group" ? target.id : null, recordingId: target.type === "recording" ? target.id : null };
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
  return {
    own: own ? serializeRating(own) : null,
    aggregate: aggregate ?? { count: 0, averageStars: null, averageDetailedScore: null },
  };
}

function validateRating(stars: number, detailedScore?: number) {
  if (stars < 0.5 || stars > 5 || stars * 2 !== Math.round(stars * 2)) {
    throw new ApiError("INVALID_RATING", 400, "Las estrellas deben estar entre 0.5 y 5 en pasos de 0.5");
  }
  if (detailedScore !== undefined && (detailedScore < 1 || detailedScore > 100 || detailedScore < (Math.round(stars * 2) - 1) * 10 + 1 || detailedScore > Math.round(stars * 2) * 10)) {
    throw new ApiError("INVALID_RATING", 400, "La valoración detallada no es coherente con las estrellas");
  }
}

export async function upsertRating(target: SocialTarget, userId: string, stars: number, detailedScore?: number) {
  validateRating(stars, detailedScore);
  const values = { ...targetValues(target), userId, stars: String(stars), detailedScore: detailedScore ?? null };
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

export async function listComments(target: SocialTarget, page = 1, pageSize = 20) {
  const rows = await db.select({ id: comment.id, body: comment.body, createdAt: comment.createdAt, user: { id: appUser.id, username: appUser.username, displayName: appUser.displayName } }).from(comment).innerJoin(appUser, eq(comment.userId, appUser.id)).where(commentTargetWhere(target)).orderBy(desc(comment.createdAt), desc(comment.id)).limit(pageSize + 1).offset((page - 1) * pageSize);
  return { comments: rows.slice(0, pageSize).map(serializeComment), page, pageSize, hasNext: rows.length > pageSize };
}

function commentTargetWhere(target: SocialTarget) {
  return eq({ artistId: comment.artistId, releaseGroupId: comment.releaseGroupId, recordingId: comment.recordingId }[target.column], target.id);
}

export async function createComment(target: SocialTarget, userId: string, body: string) {
  const value = body.trim();
  if (!value || value.length > 5000) throw new ApiError("INVALID_COMMENT", 400, "El comentario no es válido");
  const [created] = await db.insert(comment).values({ ...targetValues(target), userId, body: value }).returning();
  if (!created) throw new ApiError("INTERNAL_ERROR", 500, "No se pudo crear el comentario");
  return getComment(created.id);
}

async function getComment(id: string) {
  const [row] = await db.select({ id: comment.id, body: comment.body, createdAt: comment.createdAt, user: { id: appUser.id, username: appUser.username, displayName: appUser.displayName } }).from(comment).innerJoin(appUser, eq(comment.userId, appUser.id)).where(eq(comment.id, id)).limit(1);
  if (!row) throw new ApiError("COMMENT_NOT_FOUND", 404, "Comentario no encontrado");
  return serializeComment(row);
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
function serializeComment(row: { id: string; body: string; createdAt: Date; user: { id: string; username: string; displayName: string | null } }) {
  return { ...row, createdAt: row.createdAt.toISOString() };
}
