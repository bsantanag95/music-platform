import { and, eq, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { appUser, userFollow } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import type { ProfileVisibility, UserSummary } from "./types";
import { isBlockedBetween } from "./relations";

function isUniqueViolation(error: unknown): error is { code: "23505" } {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

async function resolveTargetByUsername(username: string) {
  const [user] = await db
    .select({ id: appUser.id, profileVisibility: appUser.profileVisibility })
    .from(appUser)
    .where(eq(appUser.username, username))
    .limit(1);
  if (!user) throw new ApiError("USER_NOT_FOUND", 404, "Usuario no encontrado");
  return user;
}

export async function followUser(followerId: string, targetUsername: string): Promise<{ relation: "following" | "requested" }> {
  const target = await resolveTargetByUsername(targetUsername);
  if (followerId === target.id) {
    throw new ApiError("RELATION_INVALID", 400, "No puedes seguir tu propio perfil");
  }
  if (await isBlockedBetween(followerId, target.id)) {
    throw new ApiError("BLOCKED", 403, "No puedes seguir a un usuario bloqueado");
  }

  const visibility = target.profileVisibility as ProfileVisibility;
  const newStatus = visibility === "public" ? "accepted" : "pending";

  try {
    await db.transaction(async (tx) => {
      await tx
        .insert(userFollow)
        .values({ followerId, followedId: target.id, status: newStatus })
        .onConflictDoUpdate({
          target: [userFollow.followerId, userFollow.followedId],
          set: { status: newStatus },
        });
      if (newStatus === "accepted") {
        // Si el objetivo ya había enviado una solicitud pendiente al
        // seguidor, el seguimiento mutuo se consolida en accepted.
        await tx
          .update(userFollow)
          .set({ status: "accepted" })
          .where(
            and(
              eq(userFollow.followerId, target.id),
              eq(userFollow.followedId, followerId),
              eq(userFollow.status, "pending"),
            ),
          );
      }
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      // carrera: otra operación creó la relación; releer y devolver su estado
      return getFollowState(followerId, target.id);
    }
    throw error;
  }

  return { relation: newStatus === "accepted" ? "following" : "requested" };
}

async function getFollowState(followerId: string, followedId: string) {
  const [row] = await db
    .select({ status: userFollow.status })
    .from(userFollow)
    .where(and(eq(userFollow.followerId, followerId), eq(userFollow.followedId, followedId)))
    .limit(1);
  return { relation: row?.status === "accepted" ? ("following" as const) : ("requested" as const) };
}

export async function unfollowUser(followerId: string, targetUsername: string): Promise<{ relation: "none" }> {
  const target = await resolveTargetByUsername(targetUsername);
  if (followerId === target.id) {
    throw new ApiError("RELATION_INVALID", 400, "No puedes seguir tu propio perfil");
  }
  if (await isBlockedBetween(followerId, target.id)) {
    throw new ApiError("BLOCKED", 403, "No puedes seguir a un usuario bloqueado");
  }
  await db
    .delete(userFollow)
    .where(
      and(
        eq(userFollow.followerId, followerId),
        eq(userFollow.followedId, target.id),
      ),
    );
  return { relation: "none" };
}

async function loadPendingRequest(ownerId: string, requesterId: string) {
  const [row] = await db
    .select({ id: userFollow.id, followerId: userFollow.followerId, followedId: userFollow.followedId, status: userFollow.status })
    .from(userFollow)
    .where(
      and(
        eq(userFollow.followerId, requesterId),
        eq(userFollow.followedId, ownerId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function approveRequest(ownerId: string, requesterId: string): Promise<void> {
  if (ownerId === requesterId) throw new ApiError("RELATION_INVALID", 400, "Operación de seguimiento inválida");
  const request = await loadPendingRequest(ownerId, requesterId);
  if (!request || request.status !== "pending") {
    throw new ApiError("REQUEST_NOT_FOUND", 404, "La solicitud no existe o ya fue resuelta");
  }
  if (await isBlockedBetween(ownerId, requesterId)) {
    throw new ApiError("BLOCKED", 403, "No puedes aprobar una solicitud de un usuario bloqueado");
  }
  await db.update(userFollow).set({ status: "accepted" }).where(eq(userFollow.id, request.id));
}

export async function rejectRequest(ownerId: string, requesterId: string): Promise<void> {
  if (ownerId === requesterId) throw new ApiError("RELATION_INVALID", 400, "Operación de seguimiento inválida");
  const request = await loadPendingRequest(ownerId, requesterId);
  if (!request || request.status !== "pending") {
    throw new ApiError("REQUEST_NOT_FOUND", 404, "La solicitud no existe o ya fue resuelta");
  }
  await db.delete(userFollow).where(eq(userFollow.id, request.id));
}

export async function cancelRequest(requesterId: string, targetUsername: string): Promise<void> {
  const target = await resolveTargetByUsername(targetUsername);
  await db
    .delete(userFollow)
    .where(
      and(
        eq(userFollow.followerId, requesterId),
        eq(userFollow.followedId, target.id),
        eq(userFollow.status, "pending"),
      ),
    );
}

export async function removeFollower(userId: string, followerId: string): Promise<void> {
  if (userId === followerId) throw new ApiError("RELATION_INVALID", 400, "Operación de seguimiento inválida");
  await db
    .delete(userFollow)
    .where(
      and(
        eq(userFollow.followerId, followerId),
        eq(userFollow.followedId, userId),
      ),
    );
}

export async function listFollowers(userId: string, page = 1, pageSize = 20) {
  return listRelatedUsers(
    eq(userFollow.followedId, userId),
    eq(userFollow.status, "accepted"),
    page,
    pageSize,
    userFollow.followerId,
  );
}

export async function listFollowing(userId: string, page = 1, pageSize = 20) {
  return listRelatedUsers(
    eq(userFollow.followerId, userId),
    eq(userFollow.status, "accepted"),
    page,
    pageSize,
    userFollow.followedId,
  );
}

export async function listFollowRequests(userId: string, page = 1, pageSize = 20) {
  return listRelatedUsers(
    eq(userFollow.followedId, userId),
    eq(userFollow.status, "pending"),
    page,
    pageSize,
    userFollow.followerId,
  );
}

async function listRelatedUsers(
  ownerWhere: SQL,
  statusWhere: SQL,
  page: number,
  pageSize: number,
  userColumn: typeof userFollow.followerId | typeof userFollow.followedId,
) {
  if (page < 1 || pageSize < 1 || pageSize > 50) {
    throw new ApiError("VALIDATION_ERROR", 400, "La paginación no es válida");
  }
  const rows = await db
    .select({ user: { id: appUser.id, username: appUser.username, displayName: appUser.displayName, profileVisibility: appUser.profileVisibility } })
    .from(userFollow)
    .innerJoin(appUser, eq(userColumn, appUser.id))
    .where(and(ownerWhere, statusWhere))
    .orderBy(appUser.username)
    .limit(pageSize + 1)
    .offset((page - 1) * pageSize);

  return {
    users: rows.slice(0, pageSize).map((row) => serializeSummary(row.user)),
    page,
    pageSize,
    hasNext: rows.length > pageSize,
  };
}

function serializeSummary(user: {
  id: string;
  username: string;
  displayName: string | null;
  profileVisibility: string;
}): UserSummary {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    profileVisibility: user.profileVisibility as ProfileVisibility,
  };
}