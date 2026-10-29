import { and, asc, eq, gt, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { appUser, userFollow } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import type { ProfileVisibility, UserSummary } from "./types";
import { isBlockedBetween } from "./relations";
import { activeUserCondition } from "@/services/auth/account-status";
import { resolveImageUrl, resolveImageUrls } from "@/services/storage/avatar-urls";
import { countFollows } from "@/services/profiles/identity";
import { emitNotifications, retractFollowRequestNotifications } from "@/services/notifications/emit";

function isUniqueViolation(error: unknown): error is { code: "23505" } {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

async function resolveTargetByUsername(username: string) {
  const [user] = await db
    .select({ id: appUser.id, profileVisibility: appUser.profileVisibility })
    .from(appUser)
    .where(and(eq(appUser.username, username), activeUserCondition()))
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
      const [saved] = await tx
        .insert(userFollow)
        .values({ followerId, followedId: target.id, status: newStatus })
        .onConflictDoUpdate({
          target: [userFollow.followerId, userFollow.followedId],
          set: { status: newStatus },
        })
        .returning({ id: userFollow.id });
      if (!saved) throw new ApiError("INTERNAL_ERROR", 500, "No se pudo guardar el seguimiento");

      // La notificación de seguimiento sale de la MISMA transacción que la
      // relación: `new_follower` si quedó accepted, `follow_request` si pendiente.
      await emitNotifications(tx, [
        {
          kind: newStatus === "accepted" ? "new_follower" : "follow_request",
          recipientId: target.id,
          actorId: followerId,
          followId: saved.id,
        },
      ]);

      if (newStatus === "accepted") {
        // Si el objetivo ya había enviado una solicitud pendiente al
        // seguidor, el seguimiento mutuo se consolida en accepted. No se emite
        // nada extra por esa fila (D3), pero su `follow_request` deja de tener
        // sentido: la solicitud ya no está pendiente y sus botones fallarían.
        const consolidated = await tx
          .update(userFollow)
          .set({ status: "accepted" })
          .where(
            and(
              eq(userFollow.followerId, target.id),
              eq(userFollow.followedId, followerId),
              eq(userFollow.status, "pending"),
            ),
          )
          .returning({ id: userFollow.id });
        // También la propia: una solicitud pendiente que pasa a accepted al volver a seguir un
        // perfil que ahora es público ya no se puede aprobar.
        await retractFollowRequestNotifications(tx, [
          saved.id,
          ...consolidated.map((row) => row.id),
        ]);
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
  // Aceptar, avisar y retirar la solicitud del dueño son una sola operación
  // (D3): si algo falla, la solicitud sigue pendiente y sin aviso huérfano.
  await db.transaction(async (tx) => {
    await tx.update(userFollow).set({ status: "accepted" }).where(eq(userFollow.id, request.id));
    await retractFollowRequestNotifications(tx, [request.id]);
    await emitNotifications(tx, [
      {
        kind: "follow_accepted",
        recipientId: requesterId,
        actorId: ownerId,
        followId: request.id,
      },
    ]);
  });
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

export type ConnectionsKind = "followers" | "following";

export const CONNECTIONS_PAGE_SIZE = 50;

// Una página de Seguidores o Seguidos para las vistas de conexiones de un perfil (openspec:
// refine-connections-page-phase1, D2). Orden por `username` (único) con cursor `username > after`: quitar una fila no
// corre la página siguiente, como sí pasaría con un desplazamiento.
export async function listConnectionsPage(
  userId: string,
  kind: ConnectionsKind,
  { after = null, limit = CONNECTIONS_PAGE_SIZE }: { after?: string | null; limit?: number } = {},
): Promise<{ users: UserSummary[]; hasNext: boolean }> {
  if (limit < 1 || limit > CONNECTIONS_PAGE_SIZE) {
    throw new ApiError("VALIDATION_ERROR", 400, "La paginación no es válida");
  }
  const ownerColumn = kind === "followers" ? userFollow.followedId : userFollow.followerId;
  const userColumn = kind === "followers" ? userFollow.followerId : userFollow.followedId;
  const rows = await db
    .select({ id: appUser.id, username: appUser.username, displayName: appUser.displayName, profileVisibility: appUser.profileVisibility, avatarImageId: appUser.avatarImageId })
    .from(userFollow)
    .innerJoin(appUser, eq(userColumn, appUser.id))
    .where(
      and(
        eq(ownerColumn, userId),
        eq(userFollow.status, "accepted"),
        activeUserCondition(),
        after ? gt(appUser.username, after) : undefined,
      ),
    )
    .orderBy(asc(appUser.username))
    .limit(limit + 1);

  const page = rows.slice(0, limit);
  const avatarUrls = await resolveImageUrls(page.map((row) => row.avatarImageId));
  return { users: page.map((row) => serializeSummary(row, avatarUrls)), hasNext: rows.length > limit };
}

// Avatar y cifras de la cabecera de las vistas de conexiones (D1): una lectura aparte para no ensanchar
// `PublicProfile`, que usan muchas superficies.
export async function getConnectionsSummary(
  userId: string,
): Promise<{ avatarUrl: string | null; followerCount: number; followingCount: number }> {
  const [[user], counts] = await Promise.all([
    db.select({ avatarImageId: appUser.avatarImageId }).from(appUser).where(eq(appUser.id, userId)).limit(1),
    countFollows(userId),
  ]);
  const avatarUrl = user?.avatarImageId ? await resolveImageUrl(user.avatarImageId) : null;
  return { avatarUrl, ...counts };
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

// Número de solicitudes de seguimiento pendientes dirigidas al usuario, para
// el badge del panel de su perfil (cambio redesign-user-profile). Solo cuenta
// solicitudes `pending` recibidas; nunca las enviadas por el usuario.
export async function countPendingFollowRequests(userId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(userFollow)
    .innerJoin(appUser, eq(userFollow.followerId, appUser.id))
    .where(and(eq(userFollow.followedId, userId), eq(userFollow.status, "pending"), activeUserCondition()));
  return row?.count ?? 0;
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
    .select({ user: { id: appUser.id, username: appUser.username, displayName: appUser.displayName, profileVisibility: appUser.profileVisibility, avatarImageId: appUser.avatarImageId } })
    .from(userFollow)
    .innerJoin(appUser, eq(userColumn, appUser.id))
    .where(and(ownerWhere, statusWhere, activeUserCondition()))
    .orderBy(appUser.username)
    .limit(pageSize + 1)
    .offset((page - 1) * pageSize);

  const avatarUrls = await resolveImageUrls(rows.slice(0, pageSize).map((row) => row.user.avatarImageId));
  return {
    users: rows.slice(0, pageSize).map((row) => serializeSummary(row.user, avatarUrls)),
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
  avatarImageId: string | null;
}, avatarUrls: Map<string, string>): UserSummary {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    profileVisibility: user.profileVisibility as ProfileVisibility,
    avatarUrl: user.avatarImageId ? (avatarUrls.get(user.avatarImageId) ?? null) : null,
  };
}