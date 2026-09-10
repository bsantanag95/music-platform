import { and, desc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import {
  appUser,
  comment,
  contentReport,
  review,
  userRestriction,
} from "@/db/schema";

export type ReportStatus = "pending" | "resolved" | "dismissed";

// Alias para el usuario reportado: `appUser` ya se usa para el autor del reporte.
const reportedUser = alias(appUser, "reported_user");

export async function listModerationReports(options: {
  status: ReportStatus;
  targetType?: "comment" | "review" | "user";
  page: number;
  pageSize: number;
}) {
  const targetCondition = options.targetType
    ? options.targetType === "comment"
      ? sql`${contentReport.commentId} IS NOT NULL`
      : options.targetType === "review"
        ? sql`${contentReport.reviewId} IS NOT NULL`
        : sql`${contentReport.userId} IS NOT NULL`
    : undefined;
  const where = and(
    eq(contentReport.status, options.status),
    targetCondition,
  );
  const rows = await db
    .select({
      id: contentReport.id,
      reason: contentReport.reason,
      status: contentReport.status,
      createdAt: contentReport.createdAt,
      reporter: {
        id: appUser.id,
        username: appUser.username,
        displayName: appUser.displayName,
      },
      comment: {
        id: comment.id,
        body: comment.body,
        moderationStatus: comment.moderationStatus,
      },
      review: {
        id: review.id,
        title: review.title,
        body: review.body,
        moderationStatus: review.moderationStatus,
      },
      user: {
        id: reportedUser.id,
        username: reportedUser.username,
        displayName: reportedUser.displayName,
      },
    })
    .from(contentReport)
    .innerJoin(appUser, eq(appUser.id, contentReport.reporterId))
    .leftJoin(comment, eq(comment.id, contentReport.commentId))
    .leftJoin(review, eq(review.id, contentReport.reviewId))
    .leftJoin(reportedUser, eq(reportedUser.id, contentReport.userId))
    .where(where)
    .orderBy(desc(contentReport.createdAt), desc(contentReport.id))
    .limit(options.pageSize + 1)
    .offset((options.page - 1) * options.pageSize);

  const hasNext = rows.length > options.pageSize;
  return {
    reports: rows.slice(0, options.pageSize).map((row) => ({
      ...row,
      targetType: row.comment?.id ? "comment" : row.review?.id ? "review" : "user",
      createdAt: row.createdAt.toISOString(),
    })),
    status: options.status,
    page: options.page,
    pageSize: options.pageSize,
    hasNext,
  };
}

export async function listSocialRestrictions(userId?: string) {
  const rows = await db
    .select({
      id: userRestriction.id,
      userId: userRestriction.userId,
      scope: userRestriction.scope,
      startsAt: userRestriction.startsAt,
      expiresAt: userRestriction.expiresAt,
      reason: userRestriction.reason,
      revokedAt: userRestriction.revokedAt,
      createdAt: userRestriction.createdAt,
      user: { username: appUser.username, displayName: appUser.displayName },
    })
    .from(userRestriction)
    .innerJoin(appUser, eq(appUser.id, userRestriction.userId))
    .where(userId ? eq(userRestriction.userId, userId) : undefined)
    .orderBy(desc(userRestriction.createdAt));

  return rows.map((row) => ({
    ...row,
    startsAt: row.startsAt.toISOString(),
    expiresAt: row.expiresAt?.toISOString() ?? null,
    revokedAt: row.revokedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }));
}