import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { advancedSearchHref } from "@/services/catalog/search/filters";
import { findInAllOtherTypes } from "@/services/catalog/search/other-type";
import type { CatalogSearchType } from "@/services/catalog/search/types";
import { searchHref } from "../search-types";
import { SearchTypeSwitch } from "./SearchChrome";
import { OtherTypeRows } from "./OtherTypeRows";

// Estado sin resultados de la búsqueda rápida, sin filtro activo (openspec: redesign-search-phase3, design D4). Siempre
// deja un siguiente paso: la sugerencia del catálogo, lo que hay en los otros tipos (solo de la base propia, sin
// MusicBrainz), consejos, la búsqueda avanzada y tres puertas de entrada. Con un filtro activo sigue `SearchEmpty`.

const START = [
  { key: "explore", href: "/explore" },
  { key: "releases", href: "/explore#lanzamientos" },
  { key: "lists", href: "/lists" },
] as const;

export async function SearchNoResults({
  query,
  type,
  suggestion = null,
  searchedRemote = true,
}: {
  query: string;
  type: CatalogSearchType;
  /** Texto parecido del catálogo para "¿Quisiste decir…?". */
  suggestion?: string | null;
  /** MusicBrainz respondió: la línea "Buscamos en el catálogo y en MusicBrainz" es cierta. */
  searchedRemote?: boolean;
}) {
  const t = await getTranslations("catalog.search");
  const typeName = t(`types.${type}`).toLowerCase();

  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="no-results-title" className="flex flex-col gap-5 rounded-2xl border border-ink-border bg-ink-surface p-6 sm:p-8">
        <div className="flex flex-col gap-2">
          <h3
            id="no-results-title"
            className="wrap-break-word font-display text-[clamp(1.75rem,3vw,2.5rem)] font-bold leading-[1.05] tracking-[-0.02em] text-paper"
          >
            {t("results.noResults.title", { query, type: typeName })}
          </h3>
          {searchedRemote ? <p className="font-body text-base text-paper-muted">{t("results.noResults.lead")}</p> : null}
        </div>

        {suggestion ? (
          <p className="rounded-lg border border-amber/40 bg-ink px-4 py-3 font-body text-base text-paper">
            {t.rich("results.didYouMean", {
              suggestion: () => (
                <Link href={searchHref(type, suggestion)} className="text-amber underline-offset-2 hover:underline">
                  {suggestion}
                </Link>
              ),
            })}
          </p>
        ) : null}

        <Suspense fallback={<SearchTypeSwitch query={query} current={type} />}>
          <OtherTypesFound query={query} type={type} />
        </Suspense>

        <div className="flex flex-col gap-2">
          <h4 className="font-data text-xs uppercase tracking-[0.12em] text-paper-muted">{t("results.noResults.tipsHeading")}</h4>
          <ul className="flex list-disc flex-col gap-1 pl-5 font-body text-sm text-paper-muted">
            <li>{t("results.noResults.tipFewer")}</li>
            {type === "album" || type === "song" ? <li>{t("results.tips.artistTitle")}</li> : null}
            <li>
              <Link href={advancedSearchHref(type, query)} className="text-paper underline-offset-2 hover:text-amber hover:underline">
                {t("results.advancedLink")}
              </Link>
            </li>
          </ul>
        </div>
      </section>

      <section aria-labelledby="no-results-start" className="flex flex-col gap-4">
        <h3 id="no-results-start" className="font-display text-xl font-bold tracking-[-0.01em] text-paper sm:text-[1.375rem]">
          {t("results.noResults.startHeading")}
        </h3>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {START.map((item) => (
            <li key={item.key}>
              <Link
                href={item.href}
                className="group flex h-full flex-col gap-1 rounded-xl border border-ink-border p-4 transition-colors hover:border-amber/60"
              >
                <span className="font-display text-base text-paper transition-colors group-hover:text-amber">
                  {t(`results.noResults.start.${item.key}.title`)} <span aria-hidden>→</span>
                </span>
                <span className="font-body text-sm text-paper-muted">{t(`results.noResults.start.${item.key}.text`)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/** Coincidencias locales en los otros tipos; debajo, los accesos simples a todos los tipos (Usuarios incluido). */
export async function OtherTypesFound({ query, type }: { query: string; type: CatalogSearchType }) {
  const [found, t] = await Promise.all([findInAllOtherTypes(type, query), getTranslations("catalog.search")]);
  return (
    <div className="flex flex-col gap-4">
      {found.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h4 className="font-data text-xs uppercase tracking-[0.12em] text-paper-muted">{t("results.noResults.inOtherTypes")}</h4>
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {found.map((matches) => {
              const name = t(`types.${matches.type}`).toLowerCase();
              return (
                <li key={matches.type} className="flex flex-col gap-3 rounded-xl border border-ink-border bg-ink p-4">
                  <p className="font-display text-base font-bold text-paper">{t("results.noResults.inType", { type: name })}</p>
                  <OtherTypeRows matches={matches} />
                  <Link
                    href={searchHref(matches.type, query)}
                    className="self-start font-data text-xs text-paper-muted transition-colors hover:text-amber"
                  >
                    {t("results.noResults.seeType", { type: name })} <span aria-hidden>→</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      <SearchTypeSwitch query={query} current={type} />
    </div>
  );
}
