import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { appUser, userFollow, userProfileLink, userProfilePrompt } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import { normalizeLinkInput } from "@/lib/profile-links";
import type { Genre, ListeningFormat, ProfilePromptData, PromptKey, SelfRole } from "@/lib/music-identity";
import {
  ReplaceProfileLinksRequestSchema,
  UpdateProfileIdentityRequestSchema,
  type ProfileLinkInput,
  type UpdateProfileIdentityRequest,
} from "@/lib/api/schemas";
import type { ProfileLinkKind, ProfileVisibility } from "@/services/social/types";
import { PROFILE_MAX_LINKS } from "@/services/social/types";
import { activeUserCondition } from "@/services/auth/account-status";

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
  /** Mostrar la hora local en la Placa (exige `timezone`). */
  showLocalTime: boolean;
  avatarUrl: string | null;
  memberSince: Date;
  links: ProfileLinkData[];
  // Identidad musical (spec profile-music-identity). Solo la muestra la Placa de
  // un perfil accesible; `getProfileView` la vacía para quien no tiene acceso.
  selfRoles: SelfRole[];
  genres: Genre[];
  listeningFormats: ListeningFormat[];
  prompts: ProfilePromptData[];
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
  showLocalTime: appUser.showLocalTime,
  selfRoles: appUser.selfRoles,
  genres: appUser.genres,
  listeningFormats: appUser.listeningFormats,
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
  showLocalTime: boolean;
  selfRoles: string[];
  genres: string[];
  listeningFormats: string[];
  avatarUrl: string | null;
  createdAt: Date;
};

async function hydrate(user: IdentityRow): Promise<ExtendedIdentityData> {
  const [links, counts, prompts] = await Promise.all([
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
    db
      .select({
        promptKey: userProfilePrompt.promptKey,
        answer: userProfilePrompt.answer,
        position: userProfilePrompt.position,
      })
      .from(userProfilePrompt)
      .where(eq(userProfilePrompt.userId, user.id))
      .orderBy(asc(userProfilePrompt.position)),
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
    showLocalTime: user.showLocalTime,
    selfRoles: user.selfRoles as SelfRole[],
    genres: user.genres as Genre[],
    listeningFormats: user.listeningFormats as ListeningFormat[],
    prompts: prompts.map((prompt) => ({
      promptKey: prompt.promptKey as PromptKey,
      answer: prompt.answer,
      position: prompt.position,
    })),
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
    .where(and(eq(appUser.username, username), activeUserCondition()))
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

  const patch: Partial<Record<"bio" | "pronouns" | "location" | "timezone", string | null>> & {
    showLocalTime?: boolean;
  } = {};
  for (const key of ["bio", "pronouns", "location", "timezone"] as const) {
    const next = normalizeText(parsed.data[key]);
    if (next !== undefined) patch[key] = next;
  }

  // Mostrar la hora local exige tener zona (`CHECK chk_app_user_local_time`): sin
  // zona la opción se apaga sola y no se puede activar. La zona efectiva es la
  // que llega o, si no llega, la guardada.
  if (parsed.data.showLocalTime !== undefined) patch.showLocalTime = parsed.data.showLocalTime;
  if (patch.timezone === null) patch.showLocalTime = false;
  if (patch.showLocalTime === true && patch.timezone === undefined) {
    const [current] = await db
      .select({ timezone: appUser.timezone })
      .from(appUser)
      .where(eq(appUser.id, userId))
      .limit(1);
    if (current && current.timezone === null) {
      throw new ApiError("VALIDATION_ERROR", 400, "Elegí una zona horaria para mostrar tu hora local");
    }
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

// URL canónica de un enlace ya validado por el esquema (que usa las mismas
// reglas): el usuario de una red social se convierte en la URL de su perfil y a
// un sitio web sin esquema se le antepone `https://`.
function canonicalUrl(link: ProfileLinkInput): string {
  const result = normalizeLinkInput(link.kind, link.value);
  if (!result.ok) {
    throw new ApiError("VALIDATION_ERROR", 400, "Los enlaces del perfil no son válidos");
  }
  return result.url;
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
          url: canonicalUrl(link),
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

// Conteo de seguidores/seguidos aceptados de un usuario. Cuenta solo a las
// personas con cuenta ACTIVA: una cuenta desactivada deja de contarse mientras
// dure la desactivación (spec account-lifecycle) y vuelve al reactivarse.
export async function countFollows(
  userId: string,
): Promise<{ followerCount: number; followingCount: number }> {
  const [[followers], [following]] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(userFollow)
      .innerJoin(appUser, eq(userFollow.followerId, appUser.id))
      .where(and(eq(userFollow.followedId, userId), eq(userFollow.status, "accepted"), activeUserCondition())),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(userFollow)
      .innerJoin(appUser, eq(userFollow.followedId, appUser.id))
      .where(and(eq(userFollow.followerId, userId), eq(userFollow.status, "accepted"), activeUserCondition())),
  ]);
  return { followerCount: followers?.count ?? 0, followingCount: following?.count ?? 0 };
}
