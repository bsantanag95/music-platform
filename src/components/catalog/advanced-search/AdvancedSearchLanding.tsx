"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  advancedSearchHref,
  criterionChips,
  fromSearchParams,
  parseCriteria,
  type SearchCriteria,
} from "@/services/catalog/search/filters";
import {
  pushRecentAdvancedSearch,
  readRecentAdvancedSearches,
  removeRecentAdvancedSearch,
} from "@/lib/search/recent-advanced-searches";
import { SearchTypeIcon } from "../SearchTypeIcon";
import { ADVANCED_EXAMPLES } from "./advanced-examples";
import { useCriterionLabel } from "./CriteriaChips";

// La búsqueda avanzada sin campos (openspec: refine-advanced-search-phase2, design D5): tres ejemplos de la pestaña y
// las búsquedas avanzadas recientes de este navegador. Las recientes se leen tras hidratar (localStorage no existe en
// el servidor); sin entradas, no se muestra su bloque.

type AdvancedType = "artist" | "album" | "song";

/** Criterios de una búsqueda, como en la barra ("Grupo · Chile · Inicio 1980–1989"). */
function CriteriaSummary({ type, query, criteria }: { type: AdvancedType; query: string; criteria: SearchCriteria }) {
  const label = useCriterionLabel(query, criteria);
  return <>{criterionChips(type, query, criteria).map(label).join(" · ")}</>;
}

function parseHref(href: string): { type: AdvancedType; query: string; criteria: SearchCriteria } {
  const params = new URLSearchParams(href.slice(href.indexOf("?") + 1));
  const raw = params.get("type");
  const type: AdvancedType = raw === "album" || raw === "song" ? raw : "artist";
  const query = params.get("q")?.trim() ?? "";
  return { type, query, criteria: parseCriteria(type, fromSearchParams(params), query) };
}

export function AdvancedSearchLanding({ type }: { type: AdvancedType }) {
  const t = useTranslations("catalog.search.advanced");
  const tTypes = useTranslations("catalog.search.advanced.tabs");
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    setRecent(readRecentAdvancedSearches());
  }, []);

  return (
    <div className="flex w-full flex-col gap-6">
      <section aria-labelledby="advanced-examples" className="flex flex-col gap-3">
        <h2 id="advanced-examples" className="font-data text-xs uppercase tracking-wider text-paper-muted">
          {t("examplesTitle")}
        </h2>
        <ul className="grid gap-2 sm:grid-cols-3">
          {ADVANCED_EXAMPLES[type].map((example) => (
            <li key={example.key}>
              <Link
                href={advancedSearchHref(type, example.query ?? "", example.criteria)}
                className="group flex h-full flex-col gap-1 rounded-lg border border-ink-border px-3 py-2.5 transition-colors hover:border-amber/60"
              >
                <span className="font-display text-sm text-paper transition-colors group-hover:text-amber">
                  {t(`examples.${example.key}`)}
                </span>
                <span className="font-data text-xs text-paper-muted">
                  <CriteriaSummary type={type} query={example.query ?? ""} criteria={example.criteria} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {recent.length > 0 ? (
        <section aria-labelledby="advanced-recent" className="flex flex-col gap-3">
          <h2 id="advanced-recent" className="font-data text-xs uppercase tracking-wider text-paper-muted">
            {t("recentTitle")}
          </h2>
          <ul className="flex flex-col divide-y divide-ink-border">
            {recent.map((href) => {
              const entry = parseHref(href);
              return (
                <li key={href} className="flex items-center gap-3 py-2">
                  <Link href={href} className="group flex min-w-0 flex-1 items-center gap-2">
                    <SearchTypeIcon type={entry.type} className="size-3.5 shrink-0 text-paper-muted" />
                    <span className="sr-only">{tTypes(entry.type)}: </span>
                    <span className="min-w-0 truncate font-data text-xs text-paper transition-colors group-hover:text-amber">
                      <CriteriaSummary {...entry} />
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setRecent(removeRecentAdvancedSearch(href))}
                    aria-label={t("recentRemove")}
                    className="shrink-0 rounded px-2 py-1 font-data text-xs text-paper-muted transition-colors hover:text-danger"
                  >
                    <span aria-hidden>×</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/** Registra la búsqueda mostrada entre las recientes del navegador. */
export function RecordAdvancedSearch({ href }: { href: string }) {
  useEffect(() => {
    pushRecentAdvancedSearch(href);
  }, [href]);
  return null;
}
