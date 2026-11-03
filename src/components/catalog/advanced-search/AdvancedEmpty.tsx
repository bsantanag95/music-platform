import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  advancedSearchHref,
  criterionChips,
  type CriterionChip,
  type SearchCriteria,
} from "@/services/catalog/search/filters";
import { searchHref, type SearchType } from "../search-types";
import { hrefWithout, useCriterionLabel } from "./CriteriaChips";

// Sin coincidencias en la búsqueda avanzada (openspec: refine-advanced-search-phase1, design D3): un enlace por criterio
// para quitarlo, con la cifra que daría cuando la página la calcula (`countOf`, por streaming), y el nombre o título
// en la búsqueda rápida, que tolera errores de escritura. Con un único criterio no hay alternativa: Limpiar.

/** Hasta cuántos criterios se calcula la cifra de cada alternativa. */
export const MAX_COUNTED_ALTERNATIVES = 4;

export function AdvancedEmpty({
  type,
  query,
  criteria,
  countOf,
}: {
  type: SearchType;
  query: string;
  criteria: SearchCriteria;
  /** Cifra de la búsqueda sin un criterio (un `Suspense` del servidor), o nada. */
  countOf?: (chip: CriterionChip) => ReactNode;
}) {
  const t = useTranslations("catalog.search.advanced");
  const label = useCriterionLabel(query, criteria);
  const chips = criterionChips(type, query, criteria);
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-ink-border bg-ink-surface px-5 py-5">
      <h3 className="font-display text-base text-paper">{t("empty.title")}</h3>
      {chips.length > 1 ? (
        <>
          <p className="font-body text-sm text-paper-muted">{t("empty.relax")}</p>
          <ul className="flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <li key={"value" in chip ? `${chip.id}-${chip.value}` : chip.id}>
                <Link
                  href={hrefWithout(type, query, criteria, chip)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-ink-border px-2.5 py-1 font-data text-xs text-paper transition-colors hover:border-amber/60 hover:text-amber"
                >
                  {t("empty.without", { criterion: label(chip) })}
                  {countOf ? countOf(chip) : null}
                  <span aria-hidden>→</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <Link
          href={advancedSearchHref(type, "")}
          className="rounded bg-amber px-3 py-1.5 font-display text-sm text-ink transition-colors hover:bg-amber-hover"
        >
          {t("clear")}
        </Link>
      )}
      {query ? (
        <Link
          href={searchHref(type, query)}
          className="font-data text-xs text-paper-muted transition-colors hover:text-amber"
        >
          {t("empty.quickSearch", { query })} →
        </Link>
      ) : null}
    </div>
  );
}

/** Cifra de una alternativa dentro de su enlace. */
export function AlternativeCount({ count }: { count: number | null }) {
  const t = useTranslations("catalog.search.advanced");
  if (count === null) return null;
  return (
    <span className={count === 0 ? "text-paper-muted" : "text-amber"}>· {t("empty.resultCount", { count })}</span>
  );
}
