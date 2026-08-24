import type { ProfileVisibility, FollowRelation } from "@/services/social/types";
import { audiencesForProfile as audiencesForProfileBase } from "@/services/social/visibility";
import { DIARY_AUDIENCES, type DiaryAudience } from "./types";

/**
 * Resuelve las audiencias permitidas de entradas del diario que un lector
 * puede ver según la relación con el dueño del perfil.
 *
 * Wrapper del helper compartido que garantiza que el resultado es un
 * subconjunto de DIARY_AUDIENCES (mismo conjunto en la práctica, pero
 * preserva el tipo DiaryAudience para callers existentes).
 *
 * Función pura — no consulta la BD. Se testea directamente con la matriz
 * de visibilidad.
 */
export function audiencesForProfile(profile: {
  profileVisibility: ProfileVisibility;
  relation: FollowRelation;
  blockedByMe: boolean;
}): DiaryAudience[] {
  const audiences = audiencesForProfileBase(profile);
  return audiences.filter((a): a is DiaryAudience =>
    (DIARY_AUDIENCES as readonly string[]).includes(a),
  );
}
