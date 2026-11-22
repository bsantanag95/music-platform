import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { parsePagination } from "@/lib/api/pagination";
import { ApiError } from "@/lib/api/errors";
import { getCurrentUser } from "@/services/auth/authorization";
import { listDiscoverLists, type DiscoverListFilters } from "@/services/lists/discovery";
import { LIST_ENTITY_TYPES, PUBLIC_LIST_SORTS } from "@/services/lists/types";
import { parseThemeParam } from "@/lib/api/list-filters";

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

// Filtros opcionales de exploración (cambio rework-public-lists-surface). Sin
// ninguno, el endpoint conserva su contrato cronológico original.
function parseDiscoverFilters(searchParams: URLSearchParams): DiscoverListFilters | undefined {
  const q = searchParams.get("q")?.trim();
  const entityType = parseEnumParam(searchParams, "entityType", LIST_ENTITY_TYPES);
  const sort = parseEnumParam(searchParams, "sort", PUBLIC_LIST_SORTS);
  // Un tema fuera del vocabulario se ignora (openspec: add-list-themes-phase1).
  const theme = parseThemeParam(searchParams);
  if (!q && !entityType && !sort && !theme) return undefined;
  return { q: q ? q : undefined, entityType, sort, theme: theme === "none" ? undefined : theme };
}

// Descubrir listas públicas de la comunidad. Por defecto en orden cronológico;
// con `q`, `entityType`, `theme` o `sort` se convierte en el listado de exploración.
// Público: con sesión excluye las listas propias y refleja el estado de
// guardado; sin sesión devuelve las mismas listas sin ese estado. Alimenta la
// pestaña "Descubrir" de `/me/lists`, la sección "Recientes" y el modo explorar
// de `/lists`.
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const { page, pageSize } = parsePagination(searchParams);
  const filters = parseDiscoverFilters(searchParams);
  const user = await getCurrentUser();
  return NextResponse.json(
    await listDiscoverLists(user?.id ?? null, page, pageSize, filters),
  );
});
