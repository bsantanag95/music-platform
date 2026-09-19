import { ApiError } from "@/lib/api/errors";
import type { ListFilters } from "@/services/lists/lists";
import { LIST_ENTITY_TYPES, LIST_SORTS } from "@/services/lists/types";

function parseEnumParam<T extends string>(
  searchParams: URLSearchParams,
  key: string,
  allowed: readonly T[],
): T | undefined {
  const value = searchParams.get(key);
  if (value === null || value === "") return undefined;
  if (!allowed.includes(value as T)) {
    throw new ApiError("VALIDATION_ERROR", 400, `El valor de "${key}" no es válido`);
  }
  return value as T;
}

// Filtros de listado de listas (`q`, `entityType`, `sort`) de la query string.
// Los usan `/api/me/lists` (listas propias) y `/api/users/[username]/lists`
// (listas visibles de un perfil): mismo contrato para el mismo buscador.
export function parseListFilters(searchParams: URLSearchParams): ListFilters {
  const q = searchParams.get("q")?.trim();
  return {
    q: q ? q : undefined,
    entityType: parseEnumParam(searchParams, "entityType", LIST_ENTITY_TYPES),
    sort: parseEnumParam(searchParams, "sort", LIST_SORTS),
  };
}
