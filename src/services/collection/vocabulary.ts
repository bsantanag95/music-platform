// Vocabulario de la colección física (Fase 5, cambio add-physical-collection).
// Fuente única de verdad: lo consumen el contrato Zod (src/lib/api/schemas.ts),
// el servicio de dominio y la UI. El CHECK del vocabulario de `attributes` en
// drizzle/0012_physical_collection.sql debe mantenerse sincronizado a mano con
// EDITION_ATTRIBUTES.

export { type Audience } from "@/services/social/types";

// Soportes físicos. Formatos digitales quedan deliberadamente fuera: la
// colección modela medios físicos.
export const COLLECTION_FORMATS = ["vinyl", "cd", "cassette", "other"] as const;
export type CollectionFormat = (typeof COLLECTION_FORMATS)[number];

// Atributos de edición/copia: vocabulario cerrado y curado. Son descriptores
// ("esta copia tiene tal cualidad"), no afirmaciones de identidad de catálogo.
export const EDITION_ATTRIBUTES = [
  // Edición
  "limited-edition",
  "numbered",
  "first-press",
  "reissue",
  "remaster",
  "anniversary-edition",
  "deluxe-edition",
  // Soporte / prensado
  "colored-vinyl",
  "picture-disc",
  "180g",
  "gatefold",
  "box-set",
  // Región
  "regional-edition",
  // Contenido
  "bonus-tracks",
  "extra-disc",
  // Otro
  "signed",
  "promo",
] as const;
export type EditionAttribute = (typeof EDITION_ATTRIBUTES)[number];

export const COLLECTION_NOTE_MAX = 140;

const EDITION_ATTRIBUTE_SET = new Set<string>(EDITION_ATTRIBUTES);

export function isEditionAttribute(value: string): value is EditionAttribute {
  return EDITION_ATTRIBUTE_SET.has(value);
}

/**
 * Deduplica y ordena los atributos según el orden canónico de
 * `EDITION_ATTRIBUTES`, para persistir siempre la misma representación.
 * Asume que los valores ya fueron validados contra el vocabulario.
 */
export function normalizeAttributes(attributes: readonly string[]): EditionAttribute[] {
  const present = new Set(attributes);
  return EDITION_ATTRIBUTES.filter((attribute) => present.has(attribute));
}
