import type { ListEntityType, PublicListSort } from "@/services/lists/types";

export type { ListEntityType, PublicListSort };

// Filtros del modo explorar de `/lists` (cambio rework-public-lists-surface).
// Compartido entre el Server Component (`page.tsx`) y los componentes cliente
// (toolbar y grilla), por eso vive fuera de ambos. Los valores permitidos se
// declaran localmente para no acoplar el bundle cliente al módulo de servicios;
// los tipos se importan como `type`, que no genera import en runtime.

export const COMMUNITY_ENTITY_TYPES = [
  "artist",
  "release-group",
  "recording",
] as const satisfies readonly ListEntityType[];

export const PUBLIC_LIST_SORTS_UI = ["recent", "popular"] as const satisfies readonly PublicListSort[];

export interface CommunityListFilters {
  q?: string;
  type?: ListEntityType;
  sort?: PublicListSort;
}

type RawSearchParams = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

/**
 * Parsea los filtros de la URL. Los valores inválidos se tratan como ausentes.
 * Devuelve `undefined` cuando no hay ningún filtro válido (estado vitrina).
 */
export function parseCommunityFilters(searchParams: RawSearchParams): CommunityListFilters | undefined {
  const q = single(searchParams.q).trim();
  const rawType = single(searchParams.type);
  const rawSort = single(searchParams.sort);
  const type = (COMMUNITY_ENTITY_TYPES as readonly string[]).includes(rawType)
    ? (rawType as ListEntityType)
    : undefined;
  const sort = (PUBLIC_LIST_SORTS_UI as readonly string[]).includes(rawSort)
    ? (rawSort as PublicListSort)
    : undefined;
  if (!q && !type && !sort) return undefined;
  return { q: q || undefined, type, sort };
}

/** Traduce los filtros de UI a los parámetros del endpoint de descubrimiento. */
export function toDiscoverFilters(
  filters: CommunityListFilters,
): { q?: string; entityType?: ListEntityType; sort?: PublicListSort } {
  return { q: filters.q, entityType: filters.type, sort: filters.sort };
}
