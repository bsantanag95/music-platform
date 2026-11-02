import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  advancedSearchHref,
  criteriaForTab,
  fromRecord,
  hasCriteria,
  parseCriteria,
} from "@/services/catalog/search/filters";
import { AdvancedSearchForm } from "@/components/catalog/advanced-search/AdvancedSearchForm";
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
  const searching = query !== "" || hasCriteria(criteria);
  // Remonta el formulario con otra URL: sus campos no controlados muestran siempre la búsqueda en curso.
  const formKey = JSON.stringify([type, query, criteria]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-start gap-8 px-4 py-12">
      <Breadcrumbs
        items={[
          { label: tCommon("home"), href: "/" },
          { label: t("breadcrumb"), href: "/search" },
          { label: t("advanced.breadcrumb") },
        ]}
      />
      <h1 className="font-display text-2xl text-paper">{t("advanced.pageTitle")}</h1>

      <div className="flex w-full flex-col gap-4">
        <nav aria-label={t("advanced.tabsLabel")} className="flex gap-1 overflow-x-auto border-b border-ink-border">
          {TABS.map((tab) => {
            const active = tab === type;
            return (
              <Link
                key={tab}
                href={advancedSearchHref(tab, "", criteriaForTab(tab, criteria))}
                aria-current={active ? "page" : undefined}
                className={`-mb-px inline-flex shrink-0 items-center gap-2 rounded-t border px-3 py-2 font-display text-sm transition-colors sm:px-4 ${
                  active
                    ? "border-ink-border border-b-ink bg-ink text-paper"
                    : "border-transparent text-paper-muted hover:text-paper"
                }`}
              >
                <SearchTypeIcon type={tab} className="size-4" />
                {t(`advanced.tabs.${tab}`)}
              </Link>
            );
          })}
        </nav>
        <AdvancedSearchForm key={formKey} type={type} query={query} criteria={criteria} />
      </div>

      {searching ? (
        <section aria-label={t("advanced.resultsTitle")} className="flex w-full flex-col gap-6">
          {type === "artist" ? (
            <ArtistSection query={query} criteria={criteria} advanced />
          ) : type === "album" ? (
            <AlbumSection query={query} criteria={criteria} advanced />
          ) : (
            <SongSection query={query} criteria={criteria} advanced />
          )}
        </section>
      ) : null}
    </main>
  );
}

export default withClientMessages("(catalog)/search/advanced/page", AdvancedSearchPage);
