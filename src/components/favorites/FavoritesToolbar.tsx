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

interface FavoritesToolbarProps {
  filters: FavoritesFiltersState;
  onChange: (next: FavoritesFiltersState) => void;
  searchInput: string;
  onSearchInput: (value: string) => void;
  onClear: () => void;
}

// Barra de herramientas del muro: buscador (con debounce en el orquestador) más
// tres <select> livianos de filtro/orden. Misma disposición que /me/lists y
// /me/diary.
export function FavoritesToolbar({
  filters,
  onChange,
  searchInput,
  onSearchInput,
  onClear,
}: FavoritesToolbarProps) {
  const t = useTranslations("favorites");
  const isFiltered = favoriteFiltersActive(filters);

  return (
    <div className="flex flex-col gap-2">
      <input
        type="search"
        value={searchInput}
        onChange={(event) => onSearchInput(event.target.value)}
        placeholder={t("searchPlaceholder")}
        aria-label={t("searchPlaceholder")}
        className="w-full rounded-md border border-ink-border bg-ink-surface px-3.5 py-2 font-data text-sm text-paper placeholder:text-paper-muted"
      />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <FilterSelect
          value={filters.type}
          onChange={(value) => onChange({ ...filters, type: value as SocialTargetType | "" })}
          ariaLabel={t("typeFilterLabel")}
          widthClassName="w-[17ch]"
        >
          <option value="">{t("filterAllTypes")}</option>
          <option value="artist">{t("typeArtist")}</option>
          <option value="release-group">{t("typeAlbum")}</option>
          <option value="recording">{t("typeSong")}</option>
        </FilterSelect>
        <FilterSelect
          value={filters.audience}
          onChange={(value) => onChange({ ...filters, audience: value as DiaryAudience | "" })}
          ariaLabel={t("audienceFilterLabel")}
          widthClassName="w-[16ch]"
        >
          <option value="">{t("filterAllAudiences")}</option>
          <option value="private">{t("audience.private")}</option>
          <option value="followers">{t("audience.followers")}</option>
          <option value="public">{t("audience.public")}</option>
        </FilterSelect>
        <FilterSelect
          value={filters.sort}
          onChange={(value) => onChange({ ...filters, sort: value as FavoriteSort })}
          ariaLabel={t("sortLabel")}
          widthClassName="w-[13ch]"
        >
          <option value="recent">{t("sortRecent")}</option>
          <option value="alpha">{t("sortAlpha")}</option>
        </FilterSelect>
        {isFiltered ? (
          <button
            type="button"
            onClick={onClear}
            className="font-data text-xs text-paper-muted transition-colors hover:text-paper"
          >
            {t("clearFilters")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
