// Tipos compartidos del dominio social (Fase 5). Son la fuente única de
// valores posibles para visibilidad de perfil y relaciones de seguimiento.
// El contrato API (src/lib/api/schemas.ts) los refleja con Zod; los servicios
// los consumen directo sin duplicar strings mágicos.

export const PROFILE_VISIBILITIES = ["public", "private"] as const;
export type ProfileVisibility = (typeof PROFILE_VISIBILITIES)[number];

export const FOLLOW_STATES = ["pending", "accepted"] as const;
export type FollowState = (typeof FOLLOW_STATES)[number];

// Relación observada entre un visitante y un perfil objetivo.
export const FOLLOW_RELATIONS = [
  "none",
  "following",
  "requested",
  "incoming",
  "blocked",
  "self",
] as const;
export type FollowRelation = (typeof FOLLOW_RELATIONS)[number];

// Identidad mínima que se puede exponer de un perfil en búsquedas y listados,
// sin email, password hash, tokens ni datos de autenticación.
export interface UserSummary {
  id: string;
  username: string;
  displayName: string | null;
  profileVisibility: ProfileVisibility;
}

export const AUDIENCES = ["private", "followers", "public"] as const;
export type Audience = (typeof AUDIENCES)[number];