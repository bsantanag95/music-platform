import type { ProfileVisibility } from "@/services/social/types";
import type { FollowRelation } from "@/services/social/types";
import { DIARY_AUDIENCES, type DiaryAudience } from "./types";

/**
 * Resuelve las audiencias permitidas de entradas del diario que un lector
 * puede ver según la relación con el dueño del perfil.
 *
 * Función pura — no consulta la BD. Se testea directamente con la matriz
 * de visibilidad.
 */
export function audiencesForProfile(profile: {
  profileVisibility: ProfileVisibility;
  relation: FollowRelation;
  blockedByMe: boolean;
}): DiaryAudience[] {
  const { profileVisibility, relation, blockedByMe } = profile;

  if (blockedByMe || relation === "blocked") return [];
  if (relation === "self") return [...DIARY_AUDIENCES];
  if (profileVisibility === "private" && relation !== "following") return [];
  if (relation === "following") return ["followers", "public"];

  return ["public"];
}
