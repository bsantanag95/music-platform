import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { listAwardOptions } from "@/services/catalog/search/catalog-fields";
import { findStyleGenreBySlug, genreDisplayName } from "@/services/genres/read";
import { genreLocaleOf } from "@/services/genres/names";
import { Link } from "@/i18n/navigation";
import {
  advancedSearchHref,
  criteriaForTab,
  fromRecord,
  hasCriteria,
  ignoredParams,
  parseCriteria,
} from "@/services/catalog/search/filters";
import { AdvancedSearchForm } from "@/components/catalog/advanced-search/AdvancedSearchForm";
import { AdvancedSearchDisclosure } from "@/components/catalog/advanced-search/AdvancedSearchDisclosure";
import { CriteriaChips } from "@/components/catalog/advanced-search/CriteriaChips";
import { ResultsViewProvider } from "@/components/catalog/advanced-search/ResultsView";
import {
  AdvancedSearchLanding,
  RecordAdvancedSearch,
} from "@/components/catalog/advanced-search/AdvancedSearchLanding";
import {
  AdvancedSearchPendingProvider,
  PendingResults,
} from "@/components/catalog/advanced-search/AdvancedSearchPending";
import { parseSearchType } from "@/components/catalog/search-types";
import { SearchTypeIcon } from "@/components/catalog/SearchTypeIcon";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { withClientMessages } from "@/i18n/client-messages";
import { AlbumSection, ArtistSection, SongSection } from "../sections";

type Param = string | string[] | undefined;

interface AdvancedSearchPageProps {
  searchParams: Promise<Record<string, Param>>;
}

const TABS = ["artist", "album", "song"] as const;

function first(value: Param): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("catalog.search.advanced");
  return { title: t("pageTitle") };
}

// Búsqueda avanzada al estilo de Metal Archives (openspec: redesign-advanced-search): una pestaña
// por entidad, cada una con su formulario, y el nombre o título como un campo más (opcional). Usa el
// mismo servicio y las mismas secciones que /search (`advanced`): lo local se ve primero y lo de
// MusicBrainz llega por streaming. Sin ningún campo, solo el formulario: no busca.
async function AdvancedSearchPage({ searchParams }: AdvancedSearchPageProps) {
  const t = await getTranslations("catalog.search");
  const tCommon = await getTranslations("common");
  const params = await searchParams;
  const parsed = parseSearchType(params.type);
  const type = parsed === "user" ? "artist" : parsed;
  const query = first(params.q)?.trim().slice(0, 200) ?? "";
  const criteria = parseCriteria(type, fromRecord(params), query);
  // Valores de la URL que no se entienden: se avisa en lugar de ignorarlos en silencio (openspec:
  // refine-advanced-search-phase2).
  const ignored = ignoredParams(type, fromRecord(params), criteria);
  const searching = query !== "" || hasCriteria(criteria);
  // Campos del catálogo (openspec: add-catalog-search-fields): los premios cargados para el selector y el nombre del
  // género de la URL, para el formulario y la barra de criterios.
  const [awards, genreRow, locale] = await Promise.all([
    listAwardOptions(),
    criteria.genre ? findStyleGenreBySlug(criteria.genre) : null,
    getLocale(),
  ]);
  const genreName = genreRow ? genreDisplayName(genreRow, genreLocaleOf(locale)) : null;
  // Remonta el formulario con otra URL: sus campos no controlados muestran siempre la búsqueda en curso.
  const formKey = JSON.stringify([type, query, criteria]);

  return (
    // Marco de 88rem del resto del sitio; el contenido conserva su ancho de lectura alineado a la izquierda hasta que la
    // fase 2 reparta el espacio entre filtros y resultados (openspec: redesign-advanced-search-phase1, design D4).
    <main className="mx-auto flex min-h-screen w-full max-w-[88rem] flex-col items-start gap-8 px-4 pb-16 pt-10 sm:px-8 xl:px-12">
      <div className="flex w-full max-w-5xl flex-col items-start gap-8">
        <Breadcrumbs
          items={[
            { label: tCommon("home"), href: "/" },
            { label: t("breadcrumb"), href: "/search" },
            { label: t("advanced.breadcrumb") },
          ]}
        />
        <h1 className="font-display text-[clamp(1.875rem,3.4vw,2.75rem)] font-bold leading-[1.05] tracking-[-0.025em] text-paper">
          {t("advanced.pageTitle")}
        </h1>

        <AdvancedSearchPendingProvider>
          <div className="flex w-full flex-col gap-4">
            {/* Pestañas en pastillas, como las de /search (openspec: redesign-advanced-search-phase1). */}
            <nav aria-label={t("advanced.tabsLabel")} className="-mx-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
              {TABS.map((tab) => {
                const active = tab === type;
                return (
                  <Link
                    key={tab}
                    href={advancedSearchHref(tab, "", criteriaForTab(tab, criteria))}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-3.5 font-display text-[0.9375rem] transition-colors sm:px-4 ${
                      active
                        ? "border-paper bg-paper text-ink"
                        : "border-transparent text-paper-muted hover:border-ink-border hover:text-paper"
                    }`}
                  >
                    <SearchTypeIcon type={tab} className="size-4" />
                    {t(`advanced.tabs.${tab}`)}
                  </Link>
                );
              })}
            </nav>
            {ignored.length > 0 ? (
              <p role="status" className="rounded-lg border border-amber/40 bg-ink-surface/70 px-4 py-2.5 font-body text-sm text-paper-muted">
                {t("advanced.ignored", { values: ignored.join(", ") })}
              </p>
            ) : null}
            {/* Con una búsqueda en curso, el formulario se recoge tras la barra de criterios (openspec:
                refine-advanced-search-phase1); la misma `key` lo vuelve a recoger en cada búsqueda nueva. */}
            <AdvancedSearchDisclosure
              key={formKey}
              searching={searching}
              bar={<CriteriaChips type={type} query={query} criteria={criteria} genreName={genreName} />}
            >
              <AdvancedSearchForm type={type} query={query} criteria={criteria} awards={awards} genreName={genreName} />
            </AdvancedSearchDisclosure>
          </div>

          {searching ? null : <AdvancedSearchLanding type={type} />}
          {searching ? <RecordAdvancedSearch href={advancedSearchHref(type, query, criteria)} /> : null}
          {searching ? (
            <PendingResults label={t("advanced.resultsTitle")}>
              <ResultsViewProvider>
                {type === "artist" ? (
                  <ArtistSection query={query} criteria={criteria} advanced />
                ) : type === "album" ? (
                  <AlbumSection query={query} criteria={criteria} advanced />
                ) : (
                  <SongSection query={query} criteria={criteria} advanced />
                )}
              </ResultsViewProvider>
            </PendingResults>
          ) : null}
        </AdvancedSearchPendingProvider>
      </div>
    </main>
  );
}

export default withClientMessages("(catalog)/search/advanced/page", AdvancedSearchPage);
