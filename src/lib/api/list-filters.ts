import { ApiError } from "@/lib/api/errors";
import type { ListFilters } from "@/services/lists/lists";
import { isListTheme, LIST_ENTITY_TYPES, LIST_SORTS } from "@/services/lists/types";

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

/**
 * Tema de la query string (openspec: add-list-themes-phase1). Un valor fuera del vocabulario se ignora, como pide
 * la spec de `/lists`; `none` (listas sin tema) solo vale si el llamador lo permite: la superficie propia.
 */
export function parseThemeParam(
  searchParams: URLSearchParams,
  { allowNone = false }: { allowNone?: boolean } = {},
): ListFilters["theme"] {
  const value = searchParams.get("theme");
  if (allowNone && value === "none") return "none";
  return isListTheme(value) ? value : undefined;
}

// Filtros de listado de listas (`q`, `entityType`, `sort`, `theme`) de la query string.
// Los usan `/api/me/lists` (listas propias) y `/api/users/[username]/lists`
// (listas visibles de un perfil): mismo contrato para el mismo buscador.
export function parseListFilters(
  searchParams: URLSearchParams,
  options: { allowNoTheme?: boolean } = {},
): ListFilters {
  const q = searchParams.get("q")?.trim();
  return {
    q: q ? q : undefined,
    entityType: parseEnumParam(searchParams, "entityType", LIST_ENTITY_TYPES),
    sort: parseEnumParam(searchParams, "sort", LIST_SORTS),
    theme: parseThemeParam(searchParams, { allowNone: options.allowNoTheme }),
  };
}
