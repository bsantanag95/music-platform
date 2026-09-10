import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  comment,
  contentReport,
  moderationAction,
  review,
  userList,
  userRestriction,
} from "@/db/schema";
import { requirePermissionForUser } from "@/services/auth/authorization";

type ReportTarget = { commentId: string } | { reviewId: string };

export async function reportContent(
  reporterId: string,
  target: ReportTarget,
  reason: string,
) {
  const [report] = await db
    .insert(contentReport)
    .values({ reporterId, ...target, reason: reason.trim() })
    .onConflictDoNothing()
    .returning();
  return report ?? null;
}

export async function hideComment(actorId: string, commentId: string, reason: string): Promise<void> {
  await requirePermissionForUser(actorId, "moderation.review_content");
  await db.transaction(async (tx) => {
    await tx
      .update(comment)
      .set({ moderationStatus: "hidden", moderatedBy: actorId, moderatedAt: new Date(), moderationReason: reason })
      .where(eq(comment.id, commentId));
    await tx.insert(moderationAction).values({ actorId, action: "hide", commentId, reason });
  });
}

export async function restoreComment(actorId: string, commentId: string, reason: string): Promise<void> {
  await requirePermissionForUser(actorId, "moderation.review_content");
  await db.transaction(async (tx) => {
    await tx
      .update(comment)
      .set({ moderationStatus: "visible", moderatedBy: actorId, moderatedAt: new Date(), moderationReason: reason })
      .where(eq(comment.id, commentId));
    await tx.insert(moderationAction).values({ actorId, action: "restore", commentId, reason });
  });
}

export async function hideReview(actorId: string, reviewId: string, reason: string): Promise<void> {
  await requirePermissionForUser(actorId, "moderation.review_content");
  await db.transaction(async (tx) => {
    await tx
      .update(review)
      .set({ moderationStatus: "hidden", moderatedBy: actorId, moderatedAt: new Date(), moderationReason: reason })
      .where(eq(review.id, reviewId));
    await tx.insert(moderationAction).values({ actorId, action: "hide", reviewId, reason });
  });
}

export async function restoreReview(actorId: string, reviewId: string, reason: string): Promise<void> {
  await requirePermissionForUser(actorId, "moderation.review_content");
  await db.transaction(async (tx) => {
    await tx
      .update(review)
      .set({ moderationStatus: "visible", moderatedBy: actorId, moderatedAt: new Date(), moderationReason: reason })
      .where(eq(review.id, reviewId));
    await tx.insert(moderationAction).values({ actorId, action: "restore", reviewId, reason });
  });
}

export async function suspendSocialActivity(
  actorId: string,
  userId: string,
  reason: string,
  expiresAt: Date,
) {
  await requirePermissionForUser(actorId, "moderation.suspend_social");
  const [restriction] = await db
    .insert(userRestriction)
    .values({ userId, scope: "social_activity", reason: reason.trim(), expiresAt, createdBy: actorId })
    .returning();
  return restriction;
}

export async function revokeSocialSuspension(actorId: string, restrictionId: string): Promise<void> {
  await requirePermissionForUser(actorId, "moderation.suspend_social");
  await db
    .update(userRestriction)
    .set({ revokedAt: new Date(), revokedBy: actorId })
    .where(and(eq(userRestriction.id, restrictionId), isNull(userRestriction.revokedAt)));
}

export async function hideList(actorId: string, listId: string, reason: string): Promise<void> {
  await requirePermissionForUser(actorId, "moderation.review_content");
  await db
    .update(userList)
    .set({ moderationStatus: "hidden", moderatedBy: actorId, moderatedAt: new Date(), moderationReason: reason })
    .where(eq(userList.id, listId));
}

export async function restoreList(actorId: string, listId: string, reason: string): Promise<void> {
  await requirePermissionForUser(actorId, "moderation.review_content");
  await db
    .update(userList)
    .set({ moderationStatus: "visible", moderatedBy: actorId, moderatedAt: new Date(), moderationReason: reason })
    .where(eq(userList.id, listId));
}
