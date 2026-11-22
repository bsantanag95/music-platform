import type { ListEntityType, ListTheme, PublicListSort } from "@/services/lists/types";

export type { ListEntityType, ListTheme, PublicListSort };

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

// Temas de lista en orden de presentación (openspec: add-list-themes-phase1). Copia local de LIST_THEMES por la misma razón
// que los demás valores; `community-filters.test.ts` comprueba que coincidan.
export const COMMUNITY_LIST_THEMES = [
  "start_here",
  "recommendations",
  "personal_ranking",
  "hidden_gems",
  "moment",
  "history",
  "connections",
  "year_review",
  "curiosities",
  "other",
] as const satisfies readonly ListTheme[];

export const PUBLIC_LIST_SORTS_UI = ["recent", "popular"] as const satisfies readonly PublicListSort[];

export interface CommunityListFilters {
  q?: string;
  type?: ListEntityType;
  theme?: ListTheme;
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
  const rawTheme = single(searchParams.theme);
  const theme = (COMMUNITY_LIST_THEMES as readonly string[]).includes(rawTheme) ? (rawTheme as ListTheme) : undefined;
  const type = (COMMUNITY_ENTITY_TYPES as readonly string[]).includes(rawType)
    ? (rawType as ListEntityType)
    : undefined;
  const sort = (PUBLIC_LIST_SORTS_UI as readonly string[]).includes(rawSort)
    ? (rawSort as PublicListSort)
    : undefined;
  if (!q && !type && !sort && !theme) return undefined;
  return { q: q || undefined, type, theme, sort };
}

/** Traduce los filtros de UI a los parámetros del endpoint de descubrimiento. */
export function toDiscoverFilters(
  filters: CommunityListFilters,
): { q?: string; entityType?: ListEntityType; theme?: ListTheme; sort?: PublicListSort } {
  return { q: filters.q, entityType: filters.type, theme: filters.theme, sort: filters.sort };
}
