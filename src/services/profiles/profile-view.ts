import { ApiError } from "@/lib/api/errors";
import { getProfileByUsername } from "@/services/social/profiles";
import type { FollowRelation } from "@/services/social/types";
import { EMPTY_MUSIC_IDENTITY } from "@/lib/music-identity";
import { EMPTY_PERSONAL_INFO } from "@/lib/personal-info";
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

  // La identidad musical, la hora local y los datos personales (país, ciudad o
  // región y pronombres) son de la Placa de un perfil ACCESIBLE (specs
  // profile-music-identity, "Ficha de la Placa", y profile-personal-info,
  // "Visibilidad de los datos personales según el acceso al perfil"): a quien no
  // tiene acceso a un perfil privado no se le entregan, aunque la tarjeta del
  // perfil privado no los dibuje. Este es el ÚNICO punto que lo decide: ninguna
  // vista que consuma `ProfileView` los recibe sin acceso. La bio, los enlaces y
  // los contadores siguen siendo la identidad pública de siempre.
  const hidden = !relationInfo.accessible && relationInfo.relation !== "self";
  return {
    ...identity,
    ...(hidden ? { ...EMPTY_MUSIC_IDENTITY, ...EMPTY_PERSONAL_INFO, showLocalTime: false } : {}),
    relation: relationInfo.relation,
    accessible: relationInfo.accessible,
    blockedByMe: relationInfo.blockedByMe,
    isOwner: relationInfo.relation === "self",
  };
}
