import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { appUser, userFollow, userProfileLink } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import {
  ReplaceProfileLinksRequestSchema,
  UpdateProfileIdentityRequestSchema,
  type ProfileLinkInput,
  type UpdateProfileIdentityRequest,
} from "@/lib/api/schemas";
import type { ProfileLinkKind, ProfileVisibility } from "@/services/social/types";
import { PROFILE_MAX_LINKS } from "@/services/social/types";

export interface ProfileLinkData {
  id: string;
  kind: ProfileLinkKind;
  url: string;
  position: number;
}

// Identidad extendida del perfil: lo que se muestra en las tres vistas
// (incluida la privada sin autorización). Nunca incluye email ni datos de
// autenticación. Las fechas quedan como `Date`; la serialización a ISO la hace
// la capa que devuelve el objeto por la red.
export interface ExtendedIdentityData {
  id: string;
  username: string;
  displayName: string | null;
  profileVisibility: ProfileVisibility;
  bio: string | null;
  pronouns: string | null;
  location: string | null;
  timezone: string | null;
  avatarUrl: string | null;
  memberSince: Date;
  links: ProfileLinkData[];
  followerCount: number;
  followingCount: number;
}

const IDENTITY_COLUMNS = {
  id: appUser.id,
  username: appUser.username,
  displayName: appUser.displayName,
  profileVisibility: appUser.profileVisibility,
  bio: appUser.bio,
  pronouns: appUser.pronouns,
  location: appUser.location,
  timezone: appUser.timezone,
  avatarUrl: appUser.avatarUrl,
  createdAt: appUser.createdAt,
} as const;

type IdentityRow = {
  id: string;
  username: string;
  displayName: string | null;
  profileVisibility: string;
  bio: string | null;
  pronouns: string | null;
  location: string | null;
  timezone: string | null;
  avatarUrl: string | null;
  createdAt: Date;
};

async function hydrate(user: IdentityRow): Promise<ExtendedIdentityData> {
  const [links, counts] = await Promise.all([
    db
      .select({
        id: userProfileLink.id,
        kind: userProfileLink.kind,
        url: userProfileLink.url,
        position: userProfileLink.position,
      })
      .from(userProfileLink)
      .where(eq(userProfileLink.userId, user.id))
      .orderBy(asc(userProfileLink.position)),
    countFollows(user.id),
  ]);

  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    profileVisibility: user.profileVisibility as ProfileVisibility,
    bio: user.bio,
    pronouns: user.pronouns,
    location: user.location,
    timezone: user.timezone,
    avatarUrl: user.avatarUrl,
    memberSince: user.createdAt,
    links: links.map((link) => ({
      id: link.id,
      kind: link.kind as ProfileLinkKind,
      url: link.url,
      position: link.position,
    })),
    followerCount: counts.followerCount,
    followingCount: counts.followingCount,
  };
}

export async function getExtendedIdentity(userId: string): Promise<ExtendedIdentityData | null> {
  const [user] = await db
    .select(IDENTITY_COLUMNS)
    .from(appUser)
    .where(eq(appUser.id, userId))
    .limit(1);
  return user ? hydrate(user) : null;
}

export async function getExtendedIdentityByUsername(
  username: string,
): Promise<ExtendedIdentityData | null> {
  const [user] = await db
    .select(IDENTITY_COLUMNS)
    .from(appUser)
    .where(eq(appUser.username, username))
    .limit(1);
  return user ? hydrate(user) : null;
}

// Normaliza un campo de texto opcional: `undefined` = no tocar, cadena vacía
// (o solo espacios) = borrar (null), resto = recortado.
function normalizeText(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export async function updateIdentity(
  userId: string,
  input: UpdateProfileIdentityRequest,
): Promise<void> {
  const parsed = UpdateProfileIdentityRequestSchema.safeParse(input);
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", 400, "Los datos de identidad no son válidos");
  }

  const patch: Partial<Record<"bio" | "pronouns" | "location" | "timezone", string | null>> = {};
  for (const key of ["bio", "pronouns", "location", "timezone"] as const) {
    const next = normalizeText(parsed.data[key]);
    if (next !== undefined) patch[key] = next;
  }
  if (Object.keys(patch).length === 0) return;

  const updated = await db
    .update(appUser)
    .set(patch)
    .where(eq(appUser.id, userId))
    .returning({ id: appUser.id });
  if (updated.length === 0) {
    throw new ApiError("USER_NOT_FOUND", 404, "Usuario no encontrado");
  }
}

// Reemplaza el conjunto ordenado de enlaces externos del usuario. La posición
// se deriva del orden del array. Máximo 5 (también en el CHECK del contrato,
// pero el servicio lo garantiza para las llamadas directas y los tests).
export async function replaceLinks(
  userId: string,
  links: ProfileLinkInput[],
): Promise<ProfileLinkData[]> {
  const parsed = ReplaceProfileLinksRequestSchema.safeParse({ links });
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", 400, "Los enlaces del perfil no son válidos");
  }
  if (parsed.data.links.length > PROFILE_MAX_LINKS) {
    throw new ApiError("VALIDATION_ERROR", 400, `Máximo ${PROFILE_MAX_LINKS} enlaces`);
  }

  const inserted = await db.transaction(async (tx) => {
    await tx.delete(userProfileLink).where(eq(userProfileLink.userId, userId));
    if (parsed.data.links.length === 0) return [];
    return tx
      .insert(userProfileLink)
      .values(
        parsed.data.links.map((link, position) => ({
          userId,
          kind: link.kind,
          url: link.url,
          position,
        })),
      )
      .returning({
        id: userProfileLink.id,
        kind: userProfileLink.kind,
        url: userProfileLink.url,
        position: userProfileLink.position,
      });
  });

  return inserted
    .map((link) => ({
      id: link.id,
      kind: link.kind as ProfileLinkKind,
      url: link.url,
      position: link.position,
    }))
    .sort((a, b) => a.position - b.position);
}

// Conteo de seguidores/seguidos aceptados de un usuario, en una sola query.
export async function countFollows(
  userId: string,
): Promise<{ followerCount: number; followingCount: number }> {
  const [row] = await db
    .select({
      followers: sql<number>`count(*) filter (where ${userFollow.followedId} = ${userId})::int`,
      following: sql<number>`count(*) filter (where ${userFollow.followerId} = ${userId})::int`,
    })
    .from(userFollow)
    .where(
      and(
        eq(userFollow.status, "accepted"),
        sql`${userFollow.followedId} = ${userId} OR ${userFollow.followerId} = ${userId}`,
      ),
    );
  return { followerCount: row?.followers ?? 0, followingCount: row?.following ?? 0 };
}
