// Tipos de favoritos (Fase 5, cambio add-favorites-and-lists).
// Fuente única de valores posibles de tipo de objetivo.
// El contrato API (src/lib/api/schemas.ts) los refleja con Zod.

export { type Audience } from "@/services/social/types";

export const FAVORITE_TARGET_TYPES = ["artist", "release-group", "recording"] as const;
export type FavoriteTargetType = (typeof FAVORITE_TARGET_TYPES)[number];

export const FAVORITE_BODY_MAX = 500;

export interface FavoriteTarget {
  type: FavoriteTargetType;
  id: string;
}
