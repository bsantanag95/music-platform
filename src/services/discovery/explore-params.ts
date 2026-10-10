import { ReleaseGroupCategorySchema, type ReleaseGroupCategory } from "@/lib/api/schemas";
import { ALBUM_SORT_PARAM } from "@/services/genres/page-params";
import type { AlbumSort } from "./discovery";

// Contrato de URL de los listados filtrados de `/explore` (`?decada=`, `?familia=`, `?genero=`).
// Módulo puro, con la misma convención que la página de género: lectura tolerante (un valor
// inválido cae al predeterminado y la URL compartida no se rompe), claves en español (`tipo`,
// `orden`, `page`) y los mismos valores de orden (`ALBUM_SORT_PARAM`).

export interface ExploreListParams {
  category?: ReleaseGroupCategory;
  sort: AlbumSort;
  page: number;
}

type RawValue = string | string[] | undefined;

function first(value: RawValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Lee tipo, orden y página. Cada valor inválido se reemplaza por el predeterminado. */
export function parseExploreListParams(raw: { tipo?: RawValue; orden?: RawValue; page?: RawValue }): ExploreListParams {
  const category = ReleaseGroupCategorySchema.safeParse(first(raw.tipo));
  const sortValue = first(raw.orden);
  const sort = (Object.keys(ALBUM_SORT_PARAM) as AlbumSort[]).find((key) => ALBUM_SORT_PARAM[key] === sortValue);
  const page = Number(first(raw.page));
  return {
    category: category.success ? category.data : undefined,
    sort: sort ?? "best",
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

/**
 * Enlace al listado con `overrides` sobre `current`. `base` ya lleva el corte
 * (`/explore?decada=1990`). Solo se escriben los valores que no son los predeterminados, y
 * cambiar el tipo o el orden vuelve a la página 1 salvo que `overrides` fije `page`.
 */
export function exploreListHref(
  base: string,
  current: ExploreListParams,
  overrides: Partial<ExploreListParams> = {},
): string {
  const changesFilter = "category" in overrides || "sort" in overrides;
  const next: ExploreListParams = { ...current, ...(changesFilter && !("page" in overrides) ? { page: 1 } : {}), ...overrides };
  const [path = base, query = ""] = base.split("?");
  const params = new URLSearchParams(query);
  if (next.category) params.set("tipo", next.category);
  if (next.sort !== "best") params.set("orden", ALBUM_SORT_PARAM[next.sort]);
  if (next.page > 1) params.set("page", String(next.page));
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

/** Hay tipo u orden distintos del predeterminado (para "Quitar filtros"). */
export function exploreListFiltered(params: ExploreListParams): boolean {
  return params.category !== undefined || params.sort !== "best";
}
