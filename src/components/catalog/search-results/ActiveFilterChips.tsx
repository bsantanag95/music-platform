import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { countryName } from "@/components/artist/artist-format";
import {
  filtersToParams,
  formatDuration,
  hasActiveFilters,
  withoutFilter,
  type AdvancedFilterKey,
  type AdvancedFilters,
} from "@/services/catalog/search/filters";
import { searchHref, type SearchType } from "../search-types";

// Chips de los filtros del panel activos (openspec: add-advanced-search-phase1), debajo del
// resumen de resultados. Cada uno enlaza a la misma búsqueda sin él (un rango se quita entero).
// Persona/Grupo, categoría y década siguen en sus pastillas y no se repiten aquí.

interface Chip {
  key: AdvancedFilterKey;
  label: string;
}

export function ActiveFilterChips({
  type,
  query,
  filters,
  pillParams = {},
}: {
  type: SearchType;
  query: string;
  filters: AdvancedFilters;
  pillParams?: Record<string, string>;
}) {
  const t = useTranslations("catalog.search.advanced");
  const locale = useLocale();
  if (!hasActiveFilters(filters)) return null;

  const range = (from: string | undefined, to: string | undefined) =>
    from !== undefined && to !== undefined
      ? t("chip.between", { from, to })
      : from !== undefined
        ? t("chip.since", { from })
        : t("chip.until", { to: to ?? "" });
  const text = (value: number | undefined) => (value === undefined ? undefined : String(value));
  const duration = (value: number | undefined) => (value === undefined ? undefined : formatDuration(value));

  const chips: Chip[] = [];
  if (filters.country) {
    chips.push({ key: "country", label: t("chip.country", { country: countryName(filters.country, locale) ?? filters.country }) });
  }
  if (filters.beginFrom !== undefined || filters.beginTo !== undefined) {
    chips.push({
      key: filters.beginFrom !== undefined ? "beginFrom" : "beginTo",
      label: t("chip.begin", { range: range(text(filters.beginFrom), text(filters.beginTo)) }),
    });
  }
  if (filters.ended !== undefined) {
    chips.push({ key: "ended", label: filters.ended ? t("chip.ended") : t("chip.active") });
  }
  if (filters.yearFrom !== undefined || filters.yearTo !== undefined) {
    chips.push({
      key: filters.yearFrom !== undefined ? "yearFrom" : "yearTo",
      label: t("chip.years", { range: range(text(filters.yearFrom), text(filters.yearTo)) }),
    });
  }
  if (filters.artist) chips.push({ key: "artist", label: t("chip.artist", { artist: filters.artist }) });
  if (filters.durMin !== undefined || filters.durMax !== undefined) {
    chips.push({
      key: filters.durMin !== undefined ? "durMin" : "durMax",
      label: t("chip.duration", { range: range(duration(filters.durMin), duration(filters.durMax)) }),
    });
  }

  return (
    <div role="group" aria-label={t("chipsLabel")} className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 font-data text-xs text-paper-muted">{t("chipsLabel")}</span>
      {chips.map((chip) => (
        <Link
          key={chip.key}
          href={searchHref(type, query, { ...pillParams, ...filtersToParams(withoutFilter(filters, chip.key)) })}
          aria-label={t("removeChip", { label: chip.label })}
          className="inline-flex items-center gap-1.5 rounded-full border border-amber/60 px-2.5 py-1 font-data text-xs text-paper transition-colors hover:border-amber"
        >
          {chip.label}
          <span aria-hidden className="text-paper-muted">×</span>
        </Link>
      ))}
      <Link
        href={searchHref(type, query, pillParams)}
        className="ml-1 font-data text-xs text-paper-muted underline-offset-4 hover:text-paper hover:underline"
      >
        {t("clear")}
      </Link>
    </div>
  );
}
