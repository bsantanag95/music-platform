import { getProfileByUsername } from "@/services/social/profiles";
import { getShowcase, type IdentityCard } from "./showcase";

export interface IdentityCardPreview {
  username: string;
  displayName: string | null;
  /** false si el perfil es privado y el visitante no tiene acceso — no hay tarjeta que mostrar. */
  accessible: boolean;
  identityCard: IdentityCard | null;
}

// Previsualización liviana de la Tarjeta de Identidad para la vista rápida al
// pasar el cursor sobre un username (comentarios, reseñas, y cualquier otro
// lugar que enlace a un perfil). Misma regla de acceso que la página de
// perfil (spec social-profiles): un perfil privado sin relación de "sigue"
// no expone nada, ni siquiera la tarjeta — `getProfileByUsername` ya calcula
// `accessible` con ese criterio, no se duplica acá.
export async function getIdentityCardPreview(
  username: string,
  viewerId: string | null,
): Promise<IdentityCardPreview> {
  const profile = await getProfileByUsername(username, viewerId);
  if (!profile.accessible) {
    return {
      username: profile.username,
      displayName: profile.displayName,
      accessible: false,
      identityCard: null,
    };
  }
  const { identityCard } = await getShowcase(profile.id);
  return {
    username: profile.username,
    displayName: profile.displayName,
    accessible: true,
    identityCard,
  };
}
