// Vocabulario de pestañas de /me/progress, calcado de `lists-tabs.ts`. Módulo
// sin "use client" para que tanto la página (Server Component) como
// `ProgressSection` (client) lo importen. Valores en `?tab=`:
// `discographies` (recorridos de artista), `lists` (Caminos propios) y
// `following` (listas ajenas con seguimiento de progreso).

export type ProgressTab = "discographies" | "lists" | "following";
export const PROGRESS_TABS: ProgressTab[] = ["discographies", "lists", "following"];
export const DEFAULT_PROGRESS_TAB: ProgressTab = "discographies";

// Pestaña de `?tab=` de la ruta anterior `/me/caminos` (`mine` | `tracked`).
const LEGACY_CAMINOS_TABS: Record<string, ProgressTab> = { mine: "lists", tracked: "following" };

export function parseProgressTab(value: string | string[] | undefined): ProgressTab {
  return PROGRESS_TABS.includes(value as ProgressTab) ? (value as ProgressTab) : DEFAULT_PROGRESS_TAB;
}

/** Equivalente en `/me/progress` de la pestaña de `/me/caminos` (por defecto, `lists`). */
export function progressTabFromLegacyCaminos(value: string | string[] | undefined): ProgressTab {
  return typeof value === "string" ? (LEGACY_CAMINOS_TABS[value] ?? "lists") : "lists";
}

export function progressHref(tab: ProgressTab): string {
  return `/me/progress?tab=${tab}`;
}

// Filtros de cada listado en la URL (openspec: refine-progress-page-phase1, D5). Discografías y Mis listas comparten
// orden y estado; Listas que sigo solo tiene búsqueda y orden.
export const OWN_SORTS = ["recent", "alpha", "state"] as const;
export const OWN_STATES = ["all", "in_progress", "complete", "archived"] as const;
export const FOLLOWING_SORTS = ["recent", "progress"] as const;

export type OwnSort = (typeof OWN_SORTS)[number];
export type OwnStateFilter = (typeof OWN_STATES)[number];
export type FollowingSort = (typeof FOLLOWING_SORTS)[number];

export interface OwnFilters extends Record<string, string> {
  q: string;
  sort: OwnSort;
  state: OwnStateFilter;
}
export interface FollowingFilters extends Record<string, string> {
  q: string;
  sort: FollowingSort;
}

export const DEFAULT_OWN_FILTERS: OwnFilters = { q: "", sort: "recent", state: "all" };
export const DEFAULT_FOLLOWING_FILTERS: FollowingFilters = { q: "", sort: "recent" };

type RawParams = Record<string, string | string[] | undefined>;

const MAX_QUERY_LENGTH = 100;

function single(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function pick<T extends string>(value: string | undefined, allowed: readonly T[]): T | undefined {
  return allowed.includes(value as T) ? (value as T) : undefined;
}

function parseQuery(params: RawParams): string | undefined {
  const q = single(params.q)?.trim().slice(0, MAX_QUERY_LENGTH);
  return q ? q : undefined;
}

/** Filtros válidos de Discografías o Mis listas; lo inválido se ignora. */
export function parseOwnFilters(params: RawParams): Partial<OwnFilters> {
  const result: Partial<OwnFilters> = {};
  const q = parseQuery(params);
  const sort = pick(single(params.sort), OWN_SORTS);
  const state = pick(single(params.state), OWN_STATES);
  if (q) result.q = q;
  if (sort) result.sort = sort;
  if (state) result.state = state;
  return result;
}

/** Filtros válidos de Listas que sigo; lo inválido se ignora. */
export function parseFollowingFilters(params: RawParams): Partial<FollowingFilters> {
  const result: Partial<FollowingFilters> = {};
  const q = parseQuery(params);
  const sort = pick(single(params.sort), FOLLOWING_SORTS);
  if (q) result.q = q;
  if (sort) result.sort = sort;
  return result;
}
