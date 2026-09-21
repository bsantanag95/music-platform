import { ApiError } from "@/lib/api/errors";
import { getProfileByUsername } from "@/services/social/profiles";
import type { FollowRelation } from "@/services/social/types";
import { EMPTY_MUSIC_IDENTITY } from "@/lib/music-identity";
import { getExtendedIdentityByUsername, type ExtendedIdentityData } from "./identity";

// Vista compuesta del perfil para la ruta `/users/{username}`: la relación
// observada (de `getProfileByUsername`) más la identidad extendida y los
// contadores (de `identity.ts`), en un solo objeto. `getProfileByUsername`
// no se toca: otros consumidores (búsqueda, botón de seguir) siguen usándolo.
export interface ProfileView extends ExtendedIdentityData {
  relation: FollowRelation;
  /** El visitante puede ver la huella, los destacados y los estantes. */
  accessible: boolean;
  /** El visitante es quien bloqueó al dueño (acción de desbloquear disponible). */
  blockedByMe: boolean;
  /** El visitante es el dueño del perfil. */
  isOwner: boolean;
}

export async function getProfileView(
  username: string,
  viewerId: string | null,
): Promise<ProfileView> {
  const [relationInfo, identity] = await Promise.all([
    getProfileByUsername(username, viewerId),
    getExtendedIdentityByUsername(username),
  ]);

  if (!identity) {
    throw new ApiError("USER_NOT_FOUND", 404, "Usuario no encontrado");
  }

  // La identidad musical y la hora local son de la Placa de un perfil ACCESIBLE
  // (spec profile-music-identity, "Ficha de la Placa"): a quien no tiene acceso a
  // un perfil privado no se le entregan, aunque la tarjeta del perfil privado no
  // las dibuje.
  const hidden = !relationInfo.accessible && relationInfo.relation !== "self";
  return {
    ...identity,
    ...(hidden ? { ...EMPTY_MUSIC_IDENTITY, showLocalTime: false } : {}),
    relation: relationInfo.relation,
    accessible: relationInfo.accessible,
    blockedByMe: relationInfo.blockedByMe,
    isOwner: relationInfo.relation === "self",
  };
}
