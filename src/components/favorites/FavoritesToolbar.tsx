"use client";

import { useTranslations } from "next-intl";
import { FilterSelect } from "@/components/ui/FilterSelect";
import type { FavoriteAudienceFacet, FavoriteCounts, FavoriteSort, SocialTargetType } from "@/lib/api/schemas";
import type { DiaryAudience } from "@/lib/api/schemas";
import { FavoritesAudienceChips } from "./FavoritesAudienceChips";
import { FavoritesTypeSegments } from "./FavoritesTypeSegments";

export interface FavoritesFiltersState {
  q: string;
  type: SocialTargetType | "";
  audience: DiaryAudience | "";
  sort: FavoriteSort;
}

export const EMPTY_FAVORITE_FILTERS: FavoritesFiltersState = {
  q: "",
  type: "",
  audience: "",
  sort: "recent",
};

export function favoriteFiltersActive(filters: FavoritesFiltersState): boolean {
  return Boolean(filters.q.trim() || filters.type || filters.audience || filters.sort !== "recent");
}

// Lo que de verdad reduce el conjunto (búsqueda y filtros de tipo o audiencia): ordenar no quita
// favoritos, así que no cuenta. Gobierna la etiqueta "N resultados" de la cabecera y el conmutador.
export function favoriteScopeNarrowed(filters: FavoritesFiltersState): boolean {
  return Boolean(filters.q.trim() || filters.type || filters.audience);
}

interface FavoritesToolbarProps {
  filters: FavoritesFiltersState;
  onChange: (next: FavoritesFiltersState) => void;
  searchInput: string;
  onSearchInput: (value: string) => void;
  onClear: () => void;
  /** Cantidad por tipo para los segmentos, calculada sin el filtro de tipo (`counts`). */
  counts: FavoriteCounts;
  /** Cantidad por audiencia para las fichas (`facets.audience`); solo la lista propia la tiene. */
  audienceFacet?: FavoriteAudienceFacet;
  /**
   * Las fichas de audiencia solo tienen sentido para el propio dueño filtrando sus favoritos por
   * visibilidad — en modo lectura (perfil de un tercero) no se muestran: el visitante nunca puede ver
   * "privado" de otra persona, y "seguidores"/"público" ya son la totalidad de lo que le llega.
   */
  showAudienceFilter?: boolean;
}

// Barra de herramientas del muro (openspec: redesign-favorites-summary-toolbar): buscador (con debounce en
// el orquestador) y segmentos de tipo con su cantidad en la primera fila; fichas de audiencia con su
// cantidad (solo vista propia), orden y "Limpiar filtros" en la segunda.
export function FavoritesToolbar({
  filters,
  onChange,
  searchInput,
  onSearchInput,
  onClear,
  counts,
  audienceFacet,
  showAudienceFilter = true,
}: FavoritesToolbarProps) {
  const t = useTranslations("favorites");
  const isFiltered = favoriteFiltersActive(filters);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="search"
          autoComplete="off"
          value={searchInput}
          onChange={(event) => onSearchInput(event.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
          className="w-full min-w-0 flex-1 rounded-md border border-ink-border bg-ink-surface px-3.5 py-2 font-data text-sm text-paper placeholder:text-paper-muted"
        />
        <FavoritesTypeSegments value={filters.type} onChange={(type) => onChange({ ...filters, type })} counts={counts} />
      </div>
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
        {showAudienceFilter && audienceFacet ? (
          <FavoritesAudienceChips
            value={filters.audience}
            onChange={(audience) => onChange({ ...filters, audience })}
            facet={audienceFacet}
          />
        ) : null}
        <FilterSelect
          value={filters.sort}
          onChange={(value) => onChange({ ...filters, sort: value as FavoriteSort })}
          ariaLabel={t("sortLabel")}
          label={t("sortLabel")}
          widthClassName="w-[15ch]"
        >
          <option value="recent">{t("sortRecent")}</option>
          <option value="alpha">{t("sortAlpha")}</option>
          <option value="artist">{t("sortArtist")}</option>
        </FilterSelect>
        {isFiltered ? (
          <button
            type="button"
            onClick={onClear}
            className="pb-2 font-data text-xs text-paper-muted transition-colors hover:text-paper [@media(pointer:coarse)]:min-h-11"
          >
            {t("clearFilters")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
