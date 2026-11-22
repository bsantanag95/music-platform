// Tipos de listas (Fase 5, cambio add-favorites-and-lists).
// Fuente única de valores posibles de tipo de entidad de una lista.
// El contrato API (src/lib/api/schemas.ts) los refleja con Zod.

export { type Audience } from "@/services/social/types";

export const LIST_ENTITY_TYPES = ["artist", "release-group", "recording"] as const;
export type ListEntityType = (typeof LIST_ENTITY_TYPES)[number];

// Temas de lista (openspec: add-list-themes-phase1), en orden de presentación. Debe coincidir con
// `chk_user_list_theme` de drizzle/0098_list_theme.sql (types.test.ts lo compara). Vocabulario cerrado:
// ampliarlo es una migración nueva, nunca etiquetas libres.
export const LIST_THEMES = [
  "start_here",
  "recommendations",
  "personal_ranking",
  "hidden_gems",
  "moment",
  "history",
  "connections",
  "year_review",
  "curiosities",
  "other",
] as const;
export type ListTheme = (typeof LIST_THEMES)[number];

export function isListTheme(value: unknown): value is ListTheme {
  return typeof value === "string" && (LIST_THEMES as readonly string[]).includes(value);
}

/** Tipo de entidad del "sobre" de una lista: un artista o un género. */
export const LIST_SUBJECT_TYPES = ["artist", "genre"] as const;
export type ListSubjectType = (typeof LIST_SUBJECT_TYPES)[number];

// Orden de la superficie propia de listas (cambio rework-lists-section).
// `recent`: por creación descendente (comportamiento previo).
// `alpha`: por título, sin distinguir mayúsculas.
export const LIST_SORTS = ["recent", "alpha"] as const;
export type ListSort = (typeof LIST_SORTS)[number];

// Orden de la exploración pública de listas (cambio rework-public-lists-surface).
// `recent`: cronológico descendente (default, igual que list-discovery).
// `popular`: por conteo agregado de guardados, con las listas sin guardados al final.
export const PUBLIC_LIST_SORTS = ["recent", "popular"] as const;
export type PublicListSort = (typeof PUBLIC_LIST_SORTS)[number];

// Decisión cerrada en el cambio: título hasta 100 y descripción hasta 500.
export const LIST_TITLE_MAX = 100;
export const LIST_DESCRIPTION_MAX = 500;

// Cuántas listas muestra el estante "Listas" del perfil antes de la puerta a la
// página dedicada `/users/[username]/lists` (mismo criterio de tope que
// `FAVORITES_PREVIEW_LIMIT` y `EXPLORATION_PREVIEW_PAGE_SIZE`).
export const LISTS_PREVIEW_LIMIT = 10;
