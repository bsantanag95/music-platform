import { and, eq, isNull, lte, or, gt } from "drizzle-orm";
import { resolveSession } from "./sessions";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/db";
import { userRestriction, userRole } from "@/db/schema";
import { getPermissionsForRoles, type Permission } from "./permissions";

export type { Permission } from "./permissions";

export async function requireUser() {
  const current = await resolveSession();
  if (!current) throw new ApiError("AUTH_REQUIRED", 401, "Se requiere una sesión activa");
  return current.user;
}

export async function getCurrentUser() {
  return (await resolveSession())?.user ?? null;
}

export async function getUserRoles(userId: string): Promise<string[]> {
  const rows = await db
    .select({ role: userRole.role })
    .from(userRole)
    .where(eq(userRole.userId, userId));
  return rows.map((row) => row.role);
}

export async function userHasPermission(userId: string, permission: Permission): Promise<boolean> {
  const roles = await getUserRoles(userId);
  return getPermissionsForRoles(roles).includes(permission);
}

export async function getUserPermissions(userId: string): Promise<Permission[]> {
  const roles = await getUserRoles(userId);
  return getPermissionsForRoles(roles);
}

export async function requirePermission(permission: Permission) {
  const user = await requireUser();
  await requirePermissionForUser(user.id, permission);
  return user;
}

export async function requirePermissionForUser(userId: string, permission: Permission): Promise<void> {
  if (!(await userHasPermission(userId, permission))) {
    throw new ApiError("ROLE_REQUIRED", 403, "La sesión no tiene el permiso requerido");
  }
}

export async function hasActiveRestriction(userId: string, scope: "social_activity"): Promise<boolean> {
  const now = new Date();
  const [restriction] = await db
    .select({ id: userRestriction.id })
    .from(userRestriction)
    .where(
      and(
        eq(userRestriction.userId, userId),
        eq(userRestriction.scope, scope),
        lte(userRestriction.startsAt, now),
        isNull(userRestriction.revokedAt),
        or(isNull(userRestriction.expiresAt), gt(userRestriction.expiresAt, now)),
      ),
    )
    .limit(1);
  return Boolean(restriction);
}

export async function requireSocialActivityAllowed(userId: string): Promise<void> {
  if (await hasActiveRestriction(userId, "social_activity")) {
    throw new ApiError(
      "SOCIAL_SUSPENSION_ACTIVE",
      403,
      "La cuenta tiene una suspensión social activa",
    );
  }
}
