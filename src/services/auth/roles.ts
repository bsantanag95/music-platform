import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { userRole, userRoleAction } from "@/db/schema";
import { requirePermissionForUser } from "./authorization";

export type PlatformRole = "moderator" | "admin";

export async function grantRole(actorId: string, targetId: string, role: PlatformRole): Promise<void> {
  await requirePermissionForUser(actorId, "platform.manage_roles");
  await db.transaction(async (tx) => {
    await tx
      .insert(userRole)
      .values({ userId: targetId, role, grantedBy: actorId })
      .onConflictDoNothing({ target: [userRole.userId, userRole.role] });
    await tx.insert(userRoleAction).values({
      actorId,
      targetId,
      role,
      action: "grant",
    });
  });
}

export async function revokeRole(actorId: string, targetId: string, role: PlatformRole): Promise<void> {
  await requirePermissionForUser(actorId, "platform.manage_roles");
  await db.transaction(async (tx) => {
    await tx.delete(userRole).where(and(eq(userRole.userId, targetId), eq(userRole.role, role)));
    await tx.insert(userRoleAction).values({ actorId, targetId, role, action: "revoke" });
  });
}
