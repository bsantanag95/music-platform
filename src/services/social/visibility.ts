import type { ProfileVisibility, FollowRelation, Audience } from "./types";
import { AUDIENCES } from "./types";

/**
 * Resuelve las audiencias permitidas de una actividad que un lector puede ver
 * según la relación con el dueño del perfil.
 *
 * Función pura — no consulta la BD. Se testea directamente con la matriz
 * de visibilidad.
 *
 * Compartida entre diario, favoritos y listas. Cada consumidor puede filtrar
 * el resultado según su modelo específico si lo necesita.
 */
export function audiencesForProfile(profile: {
  profileVisibility: ProfileVisibility;
  relation: FollowRelation;
  blockedByMe: boolean;
}): Audience[] {
  const { profileVisibility, relation, blockedByMe } = profile;

  if (blockedByMe || relation === "blocked") return [];
  if (relation === "self") return [...AUDIENCES];
  if (profileVisibility === "private" && relation !== "following") return [];
  if (relation === "following") return ["followers", "public"];

  return ["public"];
}
