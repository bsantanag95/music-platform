import { and, asc, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { appUser, userFollow } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import type { ProfileVisibility, UserSummary } from "./types";
import { isBlockedBetween } from "./relations";
import { activeUserCondition } from "@/services/auth/account-status";
import { resolveImageUrl, resolveImageUrls } from "@/services/storage/avatar-urls";
import { countFollows } from "@/services/profiles/identity";
import { escapeLike } from "@/services/catalog/search/normalize";
import type { ConnectionSegment, ConnectionSegmentCounts, ConnectionSort } from "./connection-filters";
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

export interface ConnectionsPageOptions {
  q?: string;
  sort?: ConnectionSort;
  segment?: ConnectionSegment;
  cursor?: string | null;
  limit?: number;
}

// Clave de orden de la última fila, como cursor opaco (redesign-connections-toolbar, D1): `[orden, valor, desempate]`
// en JSON base64url. `created_at` viaja como texto de Postgres para no perder los microsegundos.
function encodeCursor(sort: ConnectionSort, key: [string, string]): string {
  return Buffer.from(JSON.stringify([sort, ...key])).toString("base64url");
}

function decodeCursor(cursor: string, sort: ConnectionSort): [string, string] {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (
      Array.isArray(parsed) &&
      parsed.length === 3 &&
      parsed[0] === sort &&
      typeof parsed[1] === "string" &&
      typeof parsed[2] === "string"
    ) {
      return [parsed[1], parsed[2]];
    }
  } catch {
    // cae al error de abajo
  }
  throw new ApiError("VALIDATION_ERROR", 400, "El cursor no es válido");
}

// Columnas de la relación según la vista: en Seguidores el dueño es el seguido; en Seguidos, el que sigue.
function connectionColumns(kind: ConnectionsKind) {
  return kind === "followers"
    ? { owner: userFollow.followedId, person: userFollow.followerId }
    : { owner: userFollow.followerId, person: userFollow.followedId };
}

// La relación inversa (dueño ↔ persona) aceptada: en Seguidores, el dueño sigue de vuelta; en Seguidos, la persona
// sigue al dueño (D4).
function reciprocalExists(kind: ConnectionsKind, ownerId: string): SQL {
  return kind === "followers"
    ? sql`EXISTS (SELECT 1 FROM user_follow r WHERE r.follower_id = ${ownerId} AND r.followed_id = ${appUser.id} AND r.status = 'accepted')`
    : sql`EXISTS (SELECT 1 FROM user_follow r WHERE r.follower_id = ${appUser.id} AND r.followed_id = ${ownerId} AND r.status = 'accepted')`;
}

function connectionFilters(userId: string, kind: ConnectionsKind, q: string, segment: ConnectionSegment): SQL[] {
  const columns = connectionColumns(kind);
  const filters: SQL[] = [eq(columns.owner, userId), eq(userFollow.status, "accepted"), activeUserCondition()];
  const term = q.trim();
  if (term) {
    const pattern = `%${escapeLike(term)}%`;
    filters.push(
      sql`(search_normalize(${appUser.username}) LIKE search_normalize(${pattern}) OR search_normalize(coalesce(${appUser.displayName}, '')) LIKE search_normalize(${pattern}))`,
    );
  }
  if (segment === "mutual") filters.push(reciprocalExists(kind, userId));
  if (segment === "notBack") filters.push(sql`NOT ${reciprocalExists(kind, userId)}`);
  return filters;
}

const nameKey = sql<string>`lower(coalesce(${appUser.displayName}, ${appUser.username}))`;

// Una página de Seguidores o Seguidos para las vistas de conexiones de un perfil (openspec:
// refine-connections-page-phase1, D2; redesign-connections-toolbar, D1): búsqueda, orden (Recientes por fecha del
// seguimiento, Nombre por el nombre que se ve) y segmento en el servidor, con cursor por clave de orden para que quitar
// una fila no corra la página siguiente. `total` cuenta el corte completo (búsqueda + segmento).
export async function listConnectionsPage(
  userId: string,
  kind: ConnectionsKind,
  { q = "", sort = "recent", segment = "all", cursor = null, limit = CONNECTIONS_PAGE_SIZE }: ConnectionsPageOptions = {},
): Promise<{ users: UserSummary[]; hasNext: boolean; nextCursor: string | null; total: number }> {
  if (limit < 1 || limit > CONNECTIONS_PAGE_SIZE) {
    throw new ApiError("VALIDATION_ERROR", 400, "La paginación no es válida");
  }
  const columns = connectionColumns(kind);
  const filters = connectionFilters(userId, kind, q, segment);
  const pageFilters = [...filters];
  if (cursor) {
    const [value, tiebreak] = decodeCursor(cursor, sort);
    pageFilters.push(
      sort === "recent"
        ? sql`(${userFollow.createdAt}, ${userFollow.id}) < (${value}::timestamptz, ${tiebreak}::uuid)`
        : sql`(${nameKey}, ${appUser.username}) > (${value}, ${tiebreak})`,
    );
  }

  const [rows, [counted]] = await Promise.all([
    db
      .select({
        id: appUser.id,
        username: appUser.username,
        displayName: appUser.displayName,
        profileVisibility: appUser.profileVisibility,
        avatarImageId: appUser.avatarImageId,
        followId: userFollow.id,
        followedAt: sql<string>`${userFollow.createdAt}::text`,
        nameKey,
      })
      .from(userFollow)
      .innerJoin(appUser, eq(columns.person, appUser.id))
      .where(and(...pageFilters))
      .orderBy(
        ...(sort === "recent"
          ? [desc(userFollow.createdAt), desc(userFollow.id)]
          : [asc(nameKey), asc(appUser.username)]),
      )
      .limit(limit + 1),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(userFollow)
      .innerJoin(appUser, eq(columns.person, appUser.id))
      .where(and(...filters)),
  ]);

  const page = rows.slice(0, limit);
  const last = page.at(-1);
  const hasNext = rows.length > limit;
  const avatarUrls = await resolveImageUrls(page.map((row) => row.avatarImageId));
  return {
    users: page.map((row) => serializeSummary(row, avatarUrls)),
    hasNext,
    nextCursor:
      hasNext && last
        ? encodeCursor(sort, sort === "recent" ? [last.followedAt, last.followId] : [last.nameKey, last.username])
        : null,
    total: counted?.count ?? 0,
  };
}

// Cifras de los segmentos de las vistas propias (D4), sin la búsqueda: "No sigues de vuelta" / "No te siguen" es el
// resto de Todos menos Mutuos.
export async function countConnectionSegments(
  userId: string,
  kind: ConnectionsKind,
): Promise<ConnectionSegmentCounts> {
  const columns = connectionColumns(kind);
  const [row] = await db
    .select({
      all: sql<number>`count(*)::int`,
      mutual: sql<number>`(count(*) FILTER (WHERE ${reciprocalExists(kind, userId)}))::int`,
    })
    .from(userFollow)
    .innerJoin(appUser, eq(columns.person, appUser.id))
    .where(and(eq(columns.owner, userId), eq(userFollow.status, "accepted"), activeUserCondition()));
  const all = row?.all ?? 0;
  const mutual = row?.mutual ?? 0;
  return { all, mutual, notBack: all - mutual };
}

// De `ids`, quiénes siguen al visitante con relación aceptada: la mitad de la insignia que `relationsFor` no da
// ("Te sigue" / "Mutuo", D3).
export async function followersOf(viewerId: string | null, ids: string[]): Promise<Set<string>> {
  if (!viewerId || ids.length === 0) return new Set();
  const rows = await db
    .select({ id: userFollow.followerId })
    .from(userFollow)
    .where(
      and(
        eq(userFollow.followedId, viewerId),
        eq(userFollow.status, "accepted"),
        inArray(userFollow.followerId, [...new Set(ids)]),
      ),
    );
  return new Set(rows.map((row) => row.id));
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