import { getProfileByUsername } from "@/services/social/profiles";
import { getExtendedIdentityByUsername } from "./identity";
import { getShowcase, type IdentityCard } from "./showcase";
import type { FollowRelation } from "@/services/social/types";

export interface IdentityCardPreview {
  id: string;
  username: string;
  displayName: string | null;
  /**
   * La bio es parte de la "identidad extendida" — pública incluso en un
   * perfil privado sin relación de "sigue" (mismo criterio que `Placa`),
   * a diferencia de la Tarjeta de Identidad.
   */
  bio: string | null;
  relation: FollowRelation;
  /** true si quien pide la previsualización tiene sesión — habilita el botón Seguir. */
  viewerAuthenticated: boolean;
  /** false si el perfil es privado y el visitante no tiene acceso — no hay tarjeta que mostrar. */
  accessible: boolean;
  identityCard: IdentityCard | null;
}

// Previsualización liviana del perfil para la vista rápida al pasar el
// cursor sobre un username (comentarios, reseñas, feed, listas, y
// cualquier otro lugar que enlace a un perfil). La Tarjeta de Identidad
// sigue la misma regla de acceso que la página de perfil (spec
// social-profiles): un perfil privado sin relación de "sigue" no la expone
// — `getProfileByUsername` ya calcula `accessible` con ese criterio, no se
// duplica acá. La bio, en cambio, se muestra siempre (spec social-profiles,
// "la vista privada expone bio... ").
export async function getIdentityCardPreview(
  username: string,
  viewerId: string | null,
): Promise<IdentityCardPreview> {
  const [profile, identity] = await Promise.all([
    getProfileByUsername(username, viewerId),
    getExtendedIdentityByUsername(username),
  ]);
  const base = {
    id: profile.id,
    username: profile.username,
    displayName: profile.displayName,
    bio: identity?.bio ?? null,
    relation: profile.relation,
    viewerAuthenticated: viewerId !== null,
  };
  if (!profile.accessible) {
    return { ...base, accessible: false, identityCard: null };
  }
  const { identityCard } = await getShowcase(profile.id);
  return { ...base, accessible: true, identityCard };
}
