import { ApiError } from "./errors";
import {
  CollectionFormatSchema,
  CollectionGroupingSchema,
  CollectionSortSchema,
  EditionAttributeSchema,
} from "./schemas";
import type { CollectionFilters } from "@/services/collection/types";

/**
 * Traduce los query params `format`, `attribute`, `q`, `sort` y `group` a un
 * `CollectionFilters`. Un valor fuera del vocabulario es `VALIDATION_ERROR` y no
 * ejecuta la lectura.
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

  const q = searchParams.get("q");
  if (q !== null && q.trim() !== "") {
    filters.q = q.trim().slice(0, 100);
  }

  const sort = searchParams.get("sort");
  if (sort !== null) {
    const parsed = CollectionSortSchema.safeParse(sort);
    if (!parsed.success) throw new ApiError("VALIDATION_ERROR", 400, "El orden no es válido");
    filters.sort = parsed.data;
  }

  const group = searchParams.get("group");
  if (group !== null) {
    const parsed = CollectionGroupingSchema.safeParse(group);
    if (!parsed.success) throw new ApiError("VALIDATION_ERROR", 400, "La agrupación no es válida");
    filters.group = parsed.data;
  }

  return filters;
}
