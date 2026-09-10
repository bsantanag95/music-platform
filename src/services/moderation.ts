import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { ApiError } from "@/lib/api/errors";
import {
  appUser,
  comment,
  contentReport,
  moderationAction,
  review,
  userList,
  userRestriction,
} from "@/db/schema";
import { requirePermissionForUser } from "@/services/auth/authorization";

type ReportTarget = { commentId: string } | { reviewId: string } | { userId: string };

export async function reportContent(
  reporterId: string,
  target: ReportTarget,
  reason: string,
) {
  if ("commentId" in target) {
    const [existing] = await db
      .select({ id: comment.id })
      .from(comment)
      .where(eq(comment.id, target.commentId));
    if (!existing) throw new ApiError("COMMENT_NOT_FOUND", 404, "El comentario no existe");
  } else if ("reviewId" in target) {
    const [existing] = await db
      .select({ id: review.id })
      .from(review)
      .where(eq(review.id, target.reviewId));
    if (!existing) throw new ApiError("REVIEW_NOT_FOUND", 404, "La reseña no existe");
  } else {
    if (target.userId === reporterId) {
      throw new ApiError("VALIDATION_ERROR", 400, "No podés reportarte a vos mismo");
    }
    const [existing] = await db
      .select({ id: appUser.id })
      .from(appUser)
      .where(eq(appUser.id, target.userId));
    if (!existing) throw new ApiError("USER_NOT_FOUND", 404, "El usuario no existe");
  }
  const [report] = await db
    .insert(contentReport)
    .values({ reporterId, ...target, reason: reason.trim() })
    .onConflictDoNothing()
    .returning();
  return report ?? null;
}

function normalizedReason(reason: string) {
  const value = reason.trim();
  if (!value) throw new ApiError("VALIDATION_ERROR", 400, "El motivo es obligatorio");
  return value;
}

export async function hideComment(actorId: string, commentId: string, reason: string): Promise<void> {
  await requirePermissionForUser(actorId, "moderation.review_content");
  const normalized = normalizedReason(reason);
  await db.transaction(async (tx) => {
    const [target] = await tx
      .update(comment)
      .set({ moderationStatus: "hidden", moderatedBy: actorId, moderatedAt: new Date(), moderationReason: normalized })
      .where(eq(comment.id, commentId));
    if (!target) throw new ApiError("COMMENT_NOT_FOUND", 404, "El comentario no existe");
    await tx.insert(moderationAction).values({ actorId, action: "hide", commentId, reason: normalized });
  });
}

export async function restoreComment(actorId: string, commentId: string, reason: string): Promise<void> {
  await requirePermissionForUser(actorId, "moderation.review_content");
  const normalized = normalizedReason(reason);
  await db.transaction(async (tx) => {
    const [target] = await tx
      .update(comment)
      .set({ moderationStatus: "visible", moderatedBy: actorId, moderatedAt: new Date(), moderationReason: normalized })
      .where(eq(comment.id, commentId));
    if (!target) throw new ApiError("COMMENT_NOT_FOUND", 404, "El comentario no existe");
    await tx.insert(moderationAction).values({ actorId, action: "restore", commentId, reason: normalized });
  });
}

export async function hideReview(actorId: string, reviewId: string, reason: string): Promise<void> {
  await requirePermissionForUser(actorId, "moderation.review_content");
  const normalized = normalizedReason(reason);
  await db.transaction(async (tx) => {
    const [target] = await tx
      .update(review)
      .set({ moderationStatus: "hidden", moderatedBy: actorId, moderatedAt: new Date(), moderationReason: normalized })
      .where(eq(review.id, reviewId));
    if (!target) throw new ApiError("REVIEW_NOT_FOUND", 404, "La reseña no existe");
    await tx.insert(moderationAction).values({ actorId, action: "hide", reviewId, reason: normalized });
  });
}

export async function restoreReview(actorId: string, reviewId: string, reason: string): Promise<void> {
  await requirePermissionForUser(actorId, "moderation.review_content");
  const normalized = normalizedReason(reason);
  await db.transaction(async (tx) => {
    const [target] = await tx
      .update(review)
      .set({ moderationStatus: "visible", moderatedBy: actorId, moderatedAt: new Date(), moderationReason: normalized })
      .where(eq(review.id, reviewId));
    if (!target) throw new ApiError("REVIEW_NOT_FOUND", 404, "La reseña no existe");
    await tx.insert(moderationAction).values({ actorId, action: "restore", reviewId, reason: normalized });
  });
}

/**
 * Resuelve un usuario a partir de username o email. Usado por la consola de
 * moderación, donde el moderador identifica la cuenta por nombre en vez de UUID.
 */
export async function resolveUserByIdentifier(identifier: string): Promise<string> {
  const [byUsername] = await db
    .select({ id: appUser.id })
    .from(appUser)
    .where(eq(appUser.username, identifier))
    .limit(1);
  if (byUsername) return byUsername.id;
  const [byEmail] = await db
    .select({ id: appUser.id })
    .from(appUser)
    .where(eq(sql`lower(${appUser.email})`, identifier.trim().toLowerCase()))
    .limit(1);
  if (byEmail) return byEmail.id;
  throw new ApiError("USER_NOT_FOUND", 404, "El usuario no existe");
}

export async function suspendSocialActivity(
  actorId: string,
  userId: string,
  reason: string,
  expiresAt: Date,
) {
  await requirePermissionForUser(actorId, "moderation.suspend_social");
  const normalized = normalizedReason(reason);
  if (expiresAt.getTime() <= Date.now()) {
    throw new ApiError("VALIDATION_ERROR", 400, "La expiración debe ser futura");
  }
  const [user] = await db.select({ id: appUser.id }).from(appUser).where(eq(appUser.id, userId));
  if (!user) throw new ApiError("USER_NOT_FOUND", 404, "El usuario no existe");
  const [restriction] = await db
    .insert(userRestriction)
    .values({ userId, scope: "social_activity", reason: normalized, expiresAt, createdBy: actorId })
    .returning();
  if (!restriction) throw new ApiError("INTERNAL_ERROR", 500, "No se pudo crear la restricción");
  await db.insert(moderationAction).values({
    actorId,
    action: "suspend_social",
    restrictionId: restriction.id,
    reason: normalized,
  });
  return restriction;
}

export async function revokeSocialSuspension(actorId: string, restrictionId: string): Promise<void> {
  await requirePermissionForUser(actorId, "moderation.suspend_social");
  const revoked = await db
    .update(userRestriction)
    .set({ revokedAt: new Date(), revokedBy: actorId })
    .where(and(eq(userRestriction.id, restrictionId), isNull(userRestriction.revokedAt)))
    .returning({ id: userRestriction.id });
  if (revoked.length === 0) {
    throw new ApiError("RESTRICTION_NOT_FOUND", 404, "La restricción no existe o ya fue revocada");
  }
  await db.insert(moderationAction).values({
    actorId,
    action: "revoke_social",
    restrictionId,
    reason: "Revocación de suspensión social",
  });
}

export async function hideList(actorId: string, listId: string, reason: string): Promise<void> {
  await requirePermissionForUser(actorId, "moderation.review_content");
  const normalized = normalizedReason(reason);
  const [target] = await db
    .update(userList)
    .set({ moderationStatus: "hidden", moderatedBy: actorId, moderatedAt: new Date(), moderationReason: normalized })
    .where(eq(userList.id, listId));
  if (!target) throw new ApiError("LIST_NOT_FOUND", 404, "La lista no existe");
  await db.insert(moderationAction).values({ actorId, action: "hide", listId, reason: normalized });
}

export async function restoreList(actorId: string, listId: string, reason: string): Promise<void> {
  await requirePermissionForUser(actorId, "moderation.review_content");
  const normalized = normalizedReason(reason);
  const [target] = await db
    .update(userList)
    .set({ moderationStatus: "visible", moderatedBy: actorId, moderatedAt: new Date(), moderationReason: normalized })
    .where(eq(userList.id, listId));
  if (!target) throw new ApiError("LIST_NOT_FOUND", 404, "La lista no existe");
  await db.insert(moderationAction).values({ actorId, action: "restore", listId, reason: normalized });
}

export async function updateReportStatus(
  actorId: string,
  reportId: string,
  status: "resolved" | "dismissed",
) {
  await requirePermissionForUser(actorId, "moderation.review_content");
  const [report] = await db
    .update(contentReport)
    .set({ status, resolvedBy: actorId, resolvedAt: new Date() })
    .where(and(eq(contentReport.id, reportId), eq(contentReport.status, "pending")))
    .returning();
  if (!report) throw new ApiError("MODERATION_REPORT_NOT_FOUND", 404, "El reporte no existe");
  // Auditoría: el CHECK de moderation_action exige un objetivo no nulo; para
  // resolver/descartar se referencia el contenido o el usuario reportado.
  await db.insert(moderationAction).values({
    actorId,
    action: status === "resolved" ? "report_resolve" : "report_dismiss",
    commentId: report.commentId,
    reviewId: report.reviewId,
    userId: report.userId,
    reason: status === "resolved" ? "Resolución de reporte" : "Descarte de reporte",
  });
  return report;
}
