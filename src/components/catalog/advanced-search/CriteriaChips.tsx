import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { countryName } from "@/components/artist/artist-format";
import {
  advancedSearchHref,
  criterionChips,
  formatDuration,
  removeCriterion,
  type CriterionChip,
  type SearchCriteria,
} from "@/services/catalog/search/filters";
import type { SearchType } from "../search-types";

// Pastillas de los criterios activos de la búsqueda avanzada (openspec: refine-advanced-search-phase1, design D1). Sin
// "use client": la página las arma en el servidor y el estado sin coincidencias reutiliza las etiquetas.

/** Etiqueta legible de un criterio ("Chile", "Inicio 1980–1989", "Artista: Pink Floyd"). */
export function useCriterionLabel(query: string, criteria: SearchCriteria, genreName?: string | null) {
  const t = useTranslations("catalog.search.advanced");
  const tAwards = useTranslations("awards");
  const tCategories = useTranslations("catalog.artist.categories");
  const locale = useLocale();
  const range = (from: number | undefined, to: number | undefined, format: (value: number) => string = String) =>
    from !== undefined && to !== undefined
      ? from === to
        ? format(from)
        : t("range.between", { from: format(from), to: format(to) })
      : from !== undefined
        ? t("range.from", { from: format(from) })
        : t("range.to", { to: format(to as number) });

  return (chip: CriterionChip): string => {
    switch (chip.id) {
      case "q":
        return t(criteria.exact ? "chips.qExact" : "chips.q", { value: query });
      case "artistType":
        return t(criteria.artistType === "group" ? "group" : "person");
      case "country":
        return countryName(chip.value, locale) ?? chip.value;
      case "area":
        return t("chips.area", { value: criteria.area ?? "" });
      case "begin":
        return t("chips.begin", { range: range(criteria.beginFrom, criteria.beginTo) });
      case "ended":
        return t(criteria.ended ? "endedInactive" : "endedActive");
      case "artist":
        return t(criteria.artistExact ? "chips.artistExact" : "chips.artist", { value: criteria.artist ?? "" });
      case "year":
        return t("chips.year", { range: range(criteria.yearFrom, criteria.yearTo) });
      case "category":
        return tCategories(chip.value);
      case "album":
        return t(criteria.albumExact ? "chips.albumExact" : "chips.album", { value: criteria.album ?? "" });
      case "duration":
        return t("chips.duration", { range: range(criteria.durMin, criteria.durMax, formatDuration) });
      // Campos del catálogo (openspec: add-catalog-search-fields).
      case "active":
        return t("chips.active", { range: range(criteria.activeFrom, criteria.activeTo) });
      case "role":
        return t(`roles.${criteria.role ?? "own"}`);
      case "genre":
        return t("chips.genre", { value: genreName ?? (criteria.genre ?? "").replace(/-/g, " ") });
      case "award": {
        if (criteria.award === "any") return t(criteria.awardWon ? "chips.awardAnyWon" : "chips.awardAny");
        const slug = criteria.award ?? "";
        const name = tAwards.has(`names.${slug}`) ? tAwards(`names.${slug}`) : slug;
        return criteria.awardWon ? t("chips.awardWon", { value: name }) : name;
      }
      case "artistCountry":
        return `${t("artistCountry")}: ${countryName(chip.value, locale) ?? chip.value}`;
    }
  };
}

/** La URL de la búsqueda sin un criterio. */
export function hrefWithout(type: SearchType, query: string, criteria: SearchCriteria, chip: CriterionChip): string {
  const next = removeCriterion(query, criteria, chip);
  return advancedSearchHref(type, next.query, next.criteria);
}

export function CriteriaChips({
  type,
  query,
  criteria,
  genreName,
}: {
  type: SearchType;
  query: string;
  criteria: SearchCriteria;
  /** Nombre del género filtrado, resuelto en el servidor. */
  genreName?: string | null;
}) {
  const t = useTranslations("catalog.search.advanced");
  const label = useCriterionLabel(query, criteria, genreName);
  return (
    <ul aria-label={t("criteriaLabel")} className="flex min-w-0 flex-wrap gap-1.5">
      {criterionChips(type, query, criteria).map((chip) => {
        const text = label(chip);
        return (
          <li key={"value" in chip ? `${chip.id}-${chip.value}` : chip.id} className="min-w-0">
            <Link
              href={hrefWithout(type, query, criteria, chip)}
              aria-label={t("removeCriterion", { criterion: text })}
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-amber/60 px-2.5 py-1 font-data text-xs text-paper transition-colors hover:border-amber hover:text-amber"
            >
              <span className="truncate">{text}</span>
              <span aria-hidden className="text-paper-muted">
                ×
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
