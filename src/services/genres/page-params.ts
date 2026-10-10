import { ReleaseGroupCategorySchema, type ReleaseGroupCategory } from "@/lib/api/schemas";
import type { AlbumSort } from "@/services/discovery/discovery";
import type { GenreArtistSort } from "./artists";

// Contrato de URL de la página de género (openspec: redesign-genre-page, capabilities `genre-pages` y
// `genre-page-catalog`). Módulo puro: la lectura es tolerante (un valor inválido cae al
// predeterminado, la URL se puede compartir y no debe romperse) y los servicios validan en estricto.
// Las claves de consulta van en español, como `decada`/`familia`/`genero` de Explorar.

export const GENRE_TABS = ["overview", "albums", "artists", "lists"] as const;
export type GenreTab = (typeof GENRE_TABS)[number];

/** Valor de `?tab=` de cada pestaña (el Resumen no lleva parámetro). */
export const GENRE_TAB_PARAM: Record<GenreTab, string | null> = {
  overview: null,
  albums: "albums",
  artists: "artists",
  lists: "lists",
};

export const ALBUM_SORT_PARAM: Record<AlbumSort, string> = {
  best: "mejor",
  popular: "populares",
  newest: "recientes",
  oldest: "antiguos",
  az: "az",
};

export const ARTIST_SORT_PARAM: Record<GenreArtistSort, string> = {
  albums: "albumes",
  followed: "seguidos",
  az: "az",
  recent: "recientes",
  discover: "descubrir",
};

export type GenreAlbumView = "grid" | "list";

export interface GenrePageParams {
  tab: GenreTab;
  /** Texto de búsqueda (álbumes y artistas), recortado. */
  q: string;
  category?: ReleaseGroupCategory;
  /** Año de inicio de la década. */
  decade?: number;
  /** Slug de un subgénero; la página lo valida contra el árbol. */
  sub?: string;
  /** Solo los álbumes con el género exacto, sin subgéneros. */
  exact: boolean;
  albumSort: AlbumSort;
  artistSort: GenreArtistSort;
  /** Pestaña Artistas: país (ISO-2 en mayúsculas). */
  country?: string;
  /** Pestaña Artistas: década de debut (exige debut conocido). */
  debutDecade?: number;
  /** Pestaña Artistas: solo discografía corta. */
  shortOnly: boolean;
  /** Pestaña Artistas: oculta los artistas que la persona ya conoce (solo con sesión). */
  hideKnown: boolean;
  view: GenreAlbumView;
  page: number;
}

export type RawSearchParams = Record<string, string | string[] | undefined>;

const MAX_QUERY_LENGTH = 100;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function reverse<K extends string>(map: Record<K, string>, value: string | undefined): K | undefined {
  return (Object.keys(map) as K[]).find((key) => map[key] === value);
}

function parseDecade(raw: string | undefined): number | undefined {
  if (raw === undefined || !/^\d{4}$/.test(raw)) return undefined;
  const n = Number(raw);
  return n % 10 === 0 && n >= 1800 && n <= 2100 ? n : undefined;
}

function parsePage(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

/** Lee los parámetros de la página. Cada valor inválido se reemplaza por el predeterminado. */
export function parseGenreParams(raw: RawSearchParams): GenrePageParams {
  const tabValue = first(raw.tab);
  const tab = GENRE_TABS.find((t) => GENRE_TAB_PARAM[t] !== null && GENRE_TAB_PARAM[t] === tabValue) ?? "overview";
  const category = ReleaseGroupCategorySchema.safeParse(first(raw.tipo));
  const sub = first(raw.sub)?.trim().toLowerCase();
  const country = first(raw.pais)?.trim().toUpperCase();

  return {
    tab,
    q: (first(raw.q) ?? "").trim().slice(0, MAX_QUERY_LENGTH),
    category: category.success ? category.data : undefined,
    decade: parseDecade(first(raw.decada)),
    sub: sub ? sub : undefined,
    exact: first(raw.solo) === "1",
    albumSort: reverse(ALBUM_SORT_PARAM, first(raw.orden)) ?? "best",
    artistSort: reverse(ARTIST_SORT_PARAM, first(raw.orden)) ?? "albums",
    country: country && /^[A-Z]{2}$/.test(country) ? country : undefined,
    debutDecade: parseDecade(first(raw.debut)),
    shortOnly: first(raw.tam) === "corta",
    hideKnown: first(raw.conocidos) === "no",
    view: first(raw.vista) === "lista" ? "list" : "grid",
    page: parsePage(first(raw.page)),
  };
}

const DEFAULTS: GenrePageParams = parseGenreParams({});

/**
 * Enlace a la página con `overrides` sobre `current`: solo se escriben los valores que no son los
 * predeterminados, así la URL del Resumen sigue siendo `/genre/<slug>`. Cambiar cualquier filtro
 * vuelve a la página 1 salvo que `overrides` fije `page`.
 */
export function genrePageHref(slug: string, current: GenrePageParams, overrides: Partial<GenrePageParams> = {}): string {
  const changesFilter = Object.keys(overrides).some((key) => key !== "page" && key !== "tab" && key !== "view");
  const next: GenrePageParams = { ...current, ...(changesFilter && !("page" in overrides) ? { page: 1 } : {}), ...overrides };
  const params = new URLSearchParams();
  const tabParam = GENRE_TAB_PARAM[next.tab];
  if (tabParam) params.set("tab", tabParam);

  if (next.tab === "albums" || next.tab === "artists") {
    if (next.q) params.set("q", next.q);
  }
  if (next.tab === "albums") {
    if (next.category) params.set("tipo", next.category);
    if (next.decade !== undefined) params.set("decada", String(next.decade));
    if (next.sub) params.set("sub", next.sub);
    if (next.exact) params.set("solo", "1");
    if (next.albumSort !== DEFAULTS.albumSort) params.set("orden", ALBUM_SORT_PARAM[next.albumSort]);
    if (next.view === "list") params.set("vista", "lista");
  }
  if (next.tab === "artists") {
    if (next.country) params.set("pais", next.country);
    if (next.debutDecade !== undefined) params.set("debut", String(next.debutDecade));
    if (next.shortOnly) params.set("tam", "corta");
    if (next.hideKnown) params.set("conocidos", "no");
    if (next.artistSort !== DEFAULTS.artistSort) params.set("orden", ARTIST_SORT_PARAM[next.artistSort]);
  }
  if (next.tab !== "overview" && next.page > 1) params.set("page", String(next.page));

  const query = params.toString();
  const base = `/genre/${slug}`;
  return query ? `${base}?${query}` : base;
}

/** Hay algún filtro del listado de álbumes distinto del predeterminado (para "Limpiar filtros"). */
export function albumFiltersActive(params: GenrePageParams): boolean {
  return Boolean(
    params.q || params.category || params.decade !== undefined || params.sub || params.exact || params.albumSort !== DEFAULTS.albumSort,
  );
}

/** Hay algún filtro u orden de la pestaña Artistas distinto del predeterminado (para "Limpiar filtros"). */
export function artistFiltersActive(params: GenrePageParams): boolean {
  return Boolean(
    params.q ||
      params.country ||
      params.debutDecade !== undefined ||
      params.shortOnly ||
      params.hideKnown ||
      params.artistSort !== DEFAULTS.artistSort,
  );
}
