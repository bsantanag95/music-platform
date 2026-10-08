"use client";

import { useTranslations } from "next-intl";
import { FilterSelect } from "@/components/ui/FilterSelect";
import type { MyRatingGroup, MyRatingSort } from "@/lib/api/schemas";

export interface RatingsFiltersState {
  q: string;
  sort: MyRatingSort;
  stars: string;
  type: string;
  year: string;
  decade: string;
  group: MyRatingGroup;
}

export const EMPTY_RATING_FILTERS: RatingsFiltersState = {
  q: "",
  sort: "best",
  stars: "",
  type: "",
  year: "",
  decade: "",
  group: "type",
};

export function ratingFiltersActive(filters: RatingsFiltersState): boolean {
  return Boolean(
    filters.q.trim() ||
      filters.sort !== EMPTY_RATING_FILTERS.sort ||
      filters.group !== EMPTY_RATING_FILTERS.group ||
      filters.stars ||
      filters.type ||
      filters.year ||
      filters.decade,
  );
}

const STAR_OPTIONS = ["5", "4.5", "4", "3.5", "3", "2.5", "2", "1.5", "1", "0.5"] as const;
const DECADES = [2020, 2010, 2000, 1990, 1980, 1970, 1960, 1950] as const;

function starsText(value: string): string {
  const number = Number(value);
  if (number === 0.5) return "½★";
  return Number.isInteger(number) ? `${number}★` : `${Math.floor(number)}½★`;
}

interface RatingsToolbarProps {
  filters: RatingsFiltersState;
  onChange: (next: RatingsFiltersState) => void;
  searchInput: string;
  onSearchInput: (value: string) => void;
  onClear: () => void;
  availableYears: number[];
}

// Barra de herramientas de la biblioteca: buscador (con debounce en el orquestador) más
// `FilterSelect` livianos de tipo, estrellas, año, década, orden y agrupación. Misma
// disposición que `FavoritesToolbar`, pero cada selector lleva su nombre visible sobre el control
// (un "Todos" suelto no dice qué filtra). El tipo se limita a álbum/canción: los artistas no se
// valoran; agrupar por artista solo reúne las valoraciones bajo su artista principal.
export function RatingsToolbar({
  filters,
  onChange,
  searchInput,
  onSearchInput,
  onClear,
  availableYears,
}: RatingsToolbarProps) {
  const t = useTranslations("ratings");
  const isFiltered = ratingFiltersActive(filters);

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
          onChange={(value) => onChange({ ...filters, type: value })}
          ariaLabel={t("typeFilterLabel")}
          label={t("typeFilterLabel")}
          widthClassName="w-[14ch]"
        >
          <option value="">{t("typeAll")}</option>
          <option value="release-group">{t("typeAlbum")}</option>
          <option value="recording">{t("typeSong")}</option>
        </FilterSelect>
        <FilterSelect
          value={filters.stars}
          onChange={(value) => onChange({ ...filters, stars: value })}
          ariaLabel={t("starsFilterLabel")}
          label={t("starsFilterLabel")}
          widthClassName="w-[12ch]"
        >
          <option value="">{t("starsAll")}</option>
          {STAR_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {starsText(value)}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          value={filters.year}
          onChange={(value) => onChange({ ...filters, year: value })}
          ariaLabel={t("yearFilterLabel")}
          label={t("yearFilterLabel")}
          widthClassName="w-[10ch]"
        >
          <option value="">{t("yearAll")}</option>
          {availableYears.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          value={filters.decade}
          onChange={(value) => onChange({ ...filters, decade: value })}
          ariaLabel={t("decadeFilterLabel")}
          label={t("decadeFilterLabel")}
          widthClassName="w-[11ch]"
          disabled={Boolean(filters.year)}
        >
          <option value="">{t("decadeAll")}</option>
          {DECADES.map((decade) => (
            <option key={decade} value={decade}>
              {decade}s
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          value={filters.sort}
          onChange={(value) => onChange({ ...filters, sort: value as MyRatingSort })}
          ariaLabel={t("sortLabel")}
          label={t("sortLabel")}
          widthClassName="w-[14ch]"
        >
          <option value="best">{t("sortBest")}</option>
          <option value="worst">{t("sortWorst")}</option>
          <option value="recent">{t("sortRecent")}</option>
          <option value="title">{t("sortTitle")}</option>
        </FilterSelect>
        <FilterSelect
          value={filters.group}
          onChange={(value) => onChange({ ...filters, group: value as MyRatingGroup })}
          ariaLabel={t("groupLabel")}
          label={t("groupLabel")}
          widthClassName="w-[14ch]"
        >
          <option value="type">{t("groupType")}</option>
          <option value="artist">{t("groupArtist")}</option>
          <option value="none">{t("groupNone")}</option>
        </FilterSelect>
        {isFiltered ? (
          <button
            type="button"
            onClick={onClear}
            className="pb-2 font-data text-xs text-paper-muted transition-colors hover:text-paper"
          >
            {t("clearFilters")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
