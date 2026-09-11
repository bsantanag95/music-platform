// Tipos de listas (Fase 5, cambio add-favorites-and-lists).
// Fuente única de valores posibles de tipo de entidad de una lista.
// El contrato API (src/lib/api/schemas.ts) los refleja con Zod.

export { type Audience } from "@/services/social/types";

export const LIST_ENTITY_TYPES = ["artist", "release-group", "recording"] as const;
export type ListEntityType = (typeof LIST_ENTITY_TYPES)[number];

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