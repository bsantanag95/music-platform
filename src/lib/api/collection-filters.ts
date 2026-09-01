import { ApiError } from "./errors";
import { CollectionFormatSchema, EditionAttributeSchema } from "./schemas";
import type { CollectionFilters } from "@/services/collection/types";

/**
 * Traduce los query params `format` y `attribute` a un `CollectionFilters`.
 * Un valor fuera del vocabulario es `VALIDATION_ERROR` y no ejecuta la lectura.
 */
export function parseCollectionFilters(searchParams: URLSearchParams): CollectionFilters {
  const filters: CollectionFilters = {};

  const format = searchParams.get("format");
  if (format !== null) {
    const parsed = CollectionFormatSchema.safeParse(format);
    if (!parsed.success) throw new ApiError("VALIDATION_ERROR", 400, "El formato no es válido");
    filters.format = parsed.data;
  }

  const attribute = searchParams.get("attribute");
  if (attribute !== null) {
    const parsed = EditionAttributeSchema.safeParse(attribute);
    if (!parsed.success) throw new ApiError("VALIDATION_ERROR", 400, "El atributo no es válido");
    filters.attribute = parsed.data;
  }

  return filters;
}
