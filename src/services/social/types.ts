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

// Tipos de enlace externo del perfil (cambio redesign-user-profile). Conjunto
// cerrado, espejado en el CHECK de user_profile_link y en el contrato Zod.
export const PROFILE_LINK_KINDS = [
  "website",
  "bandcamp",
  "lastfm",
  "discogs",
  "instagram",
  "youtube",
  "soundcloud",
  "other",
] as const;
export type ProfileLinkKind = (typeof PROFILE_LINK_KINDS)[number];

// Límites de longitud de los campos de identidad extendida. Fuente única
// para el contrato Zod y la validación de dominio del servicio; los CHECK de
// la migración 0014 los reflejan.
export const PROFILE_IDENTITY_LIMITS = {
  bio: 200,
  pronouns: 40,
  location: 80,
  timezone: 64,
  linkUrl: 400,
  pinnedNote: 120,
} as const;

export const PROFILE_MAX_LINKS = 5;
export const PROFILE_MAX_PINNED = 4;