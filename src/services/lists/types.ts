// Tipos de listas (Fase 5, cambio add-favorites-and-lists).
// Fuente única de valores posibles de tipo de entidad de una lista.
// El contrato API (src/lib/api/schemas.ts) los refleja con Zod.

export { type Audience } from "@/services/social/types";

export const LIST_ENTITY_TYPES = ["artist", "release-group", "recording"] as const;
export type ListEntityType = (typeof LIST_ENTITY_TYPES)[number];

// Decisión cerrada en el cambio: título hasta 100 y descripción hasta 500.
export const LIST_TITLE_MAX = 100;
export const LIST_DESCRIPTION_MAX = 500;