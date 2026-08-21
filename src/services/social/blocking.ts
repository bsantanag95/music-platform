import { and, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { appUser, userBlock, userFollow } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import type { UserSummary } from "./types";
import { isBlockedBetween } from "./relations";

function isUniqueViolation(error: unknown): error is { code: "23505" } {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

async function resolveTargetByUsername(username: string) {
  const [user] = await db
    .select({ id: appUser.id })
    .from(appUser)
    .where(eq(appUser.username, username))
    .limit(1);
  if (!user) throw new ApiError("USER_NOT_FOUND", 404, "Usuario no encontrado");
  return user.id;
}

export async function blockUser(blockerId: string, targetUsername: string): Promise<void> {
  const blockedId = await resolveTargetByUsername(targetUsername);
  if (blockerId === blockedId) {
    throw new ApiError("RELATION_INVALID", 400, "No puedes bloquear tu propio perfil");
  }
  if (await isBlockedBetween(blockerId, blockedId)) return;

  try {
    await db.transaction(async (tx) => {
      await tx.insert(userBlock).values({ blockerId, blockedId });
      await tx
        .delete(userFollow)
        .where(
          or(
            and(eq(userFollow.followerId, blockerId), eq(userFollow.followedId, blockedId)),
            and(eq(userFollow.followerId, blockedId), eq(userFollow.followedId, blockerId)),
          ),
        );
    });
  } catch (error) {
    if (isUniqueViolation(error)) return; // carrera: otro bloqueo concurrente ganó
    throw error;
  }
}

export async function unblockUser(blockerId: string, targetUsername: string): Promise<void> {
  const blockedId = await resolveTargetByUsername(targetUsername);
  if (blockerId === blockedId) {
    throw new ApiError("RELATION_INVALID", 400, "No puedes bloquear tu propio perfil");
  }
  await db
    .delete(userBlock)
    .where(and(eq(userBlock.blockerId, blockerId), eq(userBlock.blockedId, blockedId)));
}

export async function listBlocks(userId: string, page = 1, pageSize = 20) {
  const rows = await db
    .select({ user: { id: appUser.id, username: appUser.username, displayName: appUser.displayName, profileVisibility: appUser.profileVisibility } })
    .from(userBlock)
    .innerJoin(appUser, eq(userBlock.blockedId, appUser.id))
    .where(eq(userBlock.blockerId, userId))
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
    profileVisibility: user.profileVisibility as UserSummary["profileVisibility"],
  };
}