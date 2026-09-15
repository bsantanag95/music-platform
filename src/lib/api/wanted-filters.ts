import { ApiError } from "./errors";
import { WantedSortSchema } from "./schemas";
import type { WantedFilters } from "@/services/collection/wanted-types";

/**
 * Traduce los query params `q` y `sort` a un `WantedFilters`. Un valor fuera
 * del vocabulario es `VALIDATION_ERROR` y no ejecuta la lectura. Mismo
 * patrón que `parseCollectionFilters`, sin `format`/`attribute`/`group`: la
 * pestaña "Quiero" no los tiene (ver design.md D5 de add-collection-wishlist).
 */
export function parseWantedFilters(searchParams: URLSearchParams): WantedFilters {
  const filters: WantedFilters = {};

  const q = searchParams.get("q");
  if (q !== null && q.trim() !== "") {
    filters.q = q.trim().slice(0, 100);
  }

  const sort = searchParams.get("sort");
  if (sort !== null) {
    const parsed = WantedSortSchema.safeParse(sort);
    if (!parsed.success) throw new ApiError("VALIDATION_ERROR", 400, "El orden no es válido");
    filters.sort = parsed.data;
  }

  return filters;
}
