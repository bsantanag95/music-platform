// Parámetros de la búsqueda por tipo (openspec: redesign-scoped-search).
// Una sola interpretación de la URL para la página /search (tolerante: tipo
// por defecto y valores heredados) y para GET /api/catalog/search (estricto).

import { ApiError } from "@/lib/api/errors";
import type { ReleaseGroupCategoryValue } from "../ingest-release-group";
import type { ArtistTypeFilter } from "./mb-query";
import type { CatalogSearchType, SearchType } from "./types";

export const SEARCH_TYPES: readonly SearchType[] = ["artist", "album", "song", "user"];
export const DEFAULT_SEARCH_TYPE: SearchType = "artist";

const CATEGORIES: readonly ReleaseGroupCategoryValue[] = ["studio", "single_ep", "compilation", "live_other"];

// Valores de las pestañas anteriores (Todo/Artistas/Álbumes) en enlaces viejos.
const LEGACY_TYPES: Record<string, SearchType> = {
  all: "artist",
  artists: "artist",
  albums: "album",
};

function first(value: string | string[] | null | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : (value ?? undefined);
}

/** Tipo de la URL de /search: ausente o desconocido → Artistas; mapea los heredados. */
export function parseSearchType(value: string | string[] | null | undefined): SearchType {
  const raw = first(value);
  if (!raw) return DEFAULT_SEARCH_TYPE;
  if ((SEARCH_TYPES as readonly string[]).includes(raw)) return raw as SearchType;
  return LEGACY_TYPES[raw] ?? DEFAULT_SEARCH_TYPE;
}

export function parseArtistTypeFilter(value: string | string[] | null | undefined): ArtistTypeFilter | undefined {
  const raw = first(value);
  return raw === "person" || raw === "group" ? raw : undefined;
}

export function parseCategory(value: string | string[] | null | undefined): ReleaseGroupCategoryValue | undefined {
  const raw = first(value);
  return (CATEGORIES as readonly string[]).includes(raw ?? "") ? (raw as ReleaseGroupCategoryValue) : undefined;
}

/** Década como primer año ("1970"); descarta valores que no son múltiplo de 10. */
export function parseDecade(value: string | string[] | null | undefined): number | undefined {
  const raw = first(value);
  if (!raw || !/^\d{4}$/.test(raw)) return undefined;
  const year = Number(raw);
  return year % 10 === 0 && year >= 1900 && year <= 2100 ? year : undefined;
}

export function parseOffset(value: string | string[] | null | undefined): number {
  const raw = first(value);
  if (!raw || !/^\d+$/.test(raw)) return 0;
  return Math.min(Number(raw), 10_000);
}

export interface CatalogSearchParams {
  type: CatalogSearchType;
  q: string;
  offset: number;
  artistType?: ArtistTypeFilter;
  category?: ReleaseGroupCategoryValue;
  decade?: number;
}

/**
 * Contrato estricto del endpoint: `q` no vacío y `type` entre los tipos de
 * catálogo (Usuarios tiene su propio endpoint). Filtros inválidos se ignoran.
 */
export function parseCatalogSearchParams(params: URLSearchParams): CatalogSearchParams {
  const q = params.get("q")?.trim();
  if (!q) throw new ApiError("VALIDATION_ERROR", 400, "Falta el parámetro q");
  const type = params.get("type");
  if (type !== "artist" && type !== "album" && type !== "song") {
    throw new ApiError("VALIDATION_ERROR", 400, "El parámetro type debe ser artist, album o song");
  }
  return {
    type,
    q,
    offset: parseOffset(params.get("offset")),
    artistType: parseArtistTypeFilter(params.get("artistType")),
    category: parseCategory(params.get("category")),
    decade: parseDecade(params.get("decade")),
  };
}
