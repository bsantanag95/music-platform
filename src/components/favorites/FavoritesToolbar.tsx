"use client";

import { useTranslations } from "next-intl";
import { FilterSelect } from "@/components/ui/FilterSelect";
import type { FavoriteSort, SocialTargetType } from "@/lib/api/schemas";
import type { DiaryAudience } from "@/lib/api/schemas";

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
  /**
   * El filtro de audiencia solo tiene sentido para el propio dueño filtrando
   * sus favoritos por visibilidad — en modo lectura (perfil de un tercero) no
   * se muestra: el visitante nunca puede ver "privado" de otra persona, y
   * "seguidores"/"público" ya son la totalidad de lo que le llega.
   */
  showAudienceFilter?: boolean;
}

// Barra de herramientas del muro: buscador (con debounce en el orquestador) más
// hasta tres <select> livianos de filtro/orden. Misma disposición que /me/lists y
// /me/diary.
export function FavoritesToolbar({
  filters,
  onChange,
  searchInput,
  onSearchInput,
  onClear,
  showAudienceFilter = true,
}: FavoritesToolbarProps) {
  const t = useTranslations("favorites");
  const isFiltered = favoriteFiltersActive(filters);

  return (
    <div className="flex flex-col gap-2">
      <input
        type="search"
        autoComplete="off"
        value={searchInput}
        onChange={(event) => onSearchInput(event.target.value)}
        placeholder={t("searchPlaceholder")}
        aria-label={t("searchPlaceholder")}
        className="w-full rounded-md border border-ink-border bg-ink-surface px-3.5 py-2 font-data text-sm text-paper placeholder:text-paper-muted"
      />
      <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
        <FilterSelect
          value={filters.type}
          onChange={(value) => onChange({ ...filters, type: value as SocialTargetType | "" })}
          ariaLabel={t("typeFilterLabel")}
          label={t("typeShort")}
          widthClassName="w-[20ch]"
        >
          <option value="">{t("filterAllTypes")}</option>
          <option value="artist">{t("typeArtist")}</option>
          <option value="release-group">{t("typeAlbum")}</option>
          <option value="recording">{t("typeSong")}</option>
        </FilterSelect>
        {showAudienceFilter && (
          <FilterSelect
            value={filters.audience}
            onChange={(value) => onChange({ ...filters, audience: value as DiaryAudience | "" })}
            ariaLabel={t("audienceFilterLabel")}
            label={t("audienceShort")}
            widthClassName="w-[19ch]"
          >
            <option value="">{t("filterAllAudiences")}</option>
            <option value="private">{t("audience.private")}</option>
            <option value="followers">{t("audience.followers")}</option>
            <option value="public">{t("audience.public")}</option>
          </FilterSelect>
        )}
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
