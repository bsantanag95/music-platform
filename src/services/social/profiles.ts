import { and, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { appUser, userFollow } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import {
  PROFILE_VISIBILITIES,
  type FollowRelation,
  type ProfileVisibility,
} from "./types";
import { getRelationBetween, isBlocking, relationsFor } from "./relations";

export interface OwnProfile {
  id: string;
  username: string;
  displayName: string | null;
  email: string;
  profileVisibility: ProfileVisibility;
}

export interface PublicProfile {
  id: string;
  username: string;
  displayName: string | null;
  profileVisibility: ProfileVisibility;
  relation: FollowRelation;
  /** true si el visitante es quien bloqueó al dueño del perfil (acción de desbloquear disponible). */
  blockedByMe: boolean;
  accessible: boolean;
}

export async function getOwnProfile(userId: string): Promise<OwnProfile> {
  const [user] = await db
    .select({
      id: appUser.id,
      username: appUser.username,
      displayName: appUser.displayName,
      email: appUser.email,
      profileVisibility: appUser.profileVisibility,
    })
    .from(appUser)
    .where(eq(appUser.id, userId))
    .limit(1);
  if (!user) throw new ApiError("USER_NOT_FOUND", 404, "Usuario no encontrado");
  return serializeOwnProfile(user);
}

export async function updateProfileVisibility(
  userId: string,
  visibility: ProfileVisibility,
): Promise<OwnProfile> {
  if (!PROFILE_VISIBILITIES.includes(visibility)) {
    throw new ApiError(
      "VALIDATION_ERROR",
      400,
      "La visibilidad de perfil no es válida",
    );
  }
  const [user] = await db
    .update(appUser)
    .set({ profileVisibility: visibility })
    .where(eq(appUser.id, userId))
    .returning({
      id: appUser.id,
      username: appUser.username,
      displayName: appUser.displayName,
      email: appUser.email,
      profileVisibility: appUser.profileVisibility,
    });
  if (!user) throw new ApiError("USER_NOT_FOUND", 404, "Usuario no encontrado");
  return serializeOwnProfile(user);
}

export async function getProfileByUsername(
  username: string,
  viewerId: string | null,
): Promise<PublicProfile> {
  const [user] = await db
    .select({
      id: appUser.id,
      username: appUser.username,
      displayName: appUser.displayName,
      profileVisibility: appUser.profileVisibility,
    })
    .from(appUser)
    .where(eq(appUser.username, username))
    .limit(1);
  if (!user) throw new ApiError("USER_NOT_FOUND", 404, "Usuario no encontrado");

  const visibility = user.profileVisibility as ProfileVisibility;
  const relation = await getRelationBetween(viewerId, user.id);
  const blockedByMe = viewerId ? await isBlocking(viewerId, user.id) : false;
  const accessible =
    visibility === "public" || relation === "self" || relation === "following";

  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    profileVisibility: visibility,
    relation,
    blockedByMe,
    accessible,
  };
}

export async function searchUsers(
  query: string,
  viewerId: string | null,
  page = 1,
  pageSize = 20,
) {
  const q = query.trim();
  if (!q)
    throw new ApiError(
      "VALIDATION_ERROR",
      400,
      "El término de búsqueda es obligatorio",
    );
  if (page < 1 || pageSize < 1 || pageSize > 50) {
    throw new ApiError("VALIDATION_ERROR", 400, "La paginación no es válida");
  }

  const rows = await db
    .select({
      id: appUser.id,
      username: appUser.username,
      displayName: appUser.displayName,
      profileVisibility: appUser.profileVisibility,
    })
    .from(appUser)
    .where(
      or(
        ilike(appUser.username, `%${q}%`),
        ilike(appUser.displayName, `%${q}%`),
      ),
    )
    .orderBy(appUser.username)
    .limit(pageSize + 1)
    .offset((page - 1) * pageSize);

  const slice = rows.slice(0, pageSize);
  const relations = await relationsFor(
    viewerId,
    slice.map((row) => row.id),
  );

  return {
    users: slice.map((row) => ({
      id: row.id,
      username: row.username,
      displayName: row.displayName,
      profileVisibility: row.profileVisibility as ProfileVisibility,
      relation: (relations.get(row.id) ?? "none") as FollowRelation,
    })),
    page,
    pageSize,
    hasNext: rows.length > pageSize,
  };
}

export async function isApprovedFollower(
  ownerId: string,
  candidateId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: userFollow.id })
    .from(userFollow)
    .where(
      and(
        eq(userFollow.followerId, candidateId),
        eq(userFollow.followedId, ownerId),
        eq(userFollow.status, "accepted"),
      ),
    )
    .limit(1);
  return Boolean(row);
}

function serializeOwnProfile(user: {
  id: string;
  username: string;
  displayName: string | null;
  email: string;
  profileVisibility: string;
}): OwnProfile {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    profileVisibility: user.profileVisibility as ProfileVisibility,
  };
}
