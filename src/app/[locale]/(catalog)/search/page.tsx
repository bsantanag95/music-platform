import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { effectiveDecade, parseDecade } from "@/services/catalog/search/params";
import {
  advancedSearchHref,
  fromRecord,
  isQuickSearch,
  parseCriteria,
} from "@/services/catalog/search/filters";
import { SearchForm } from "@/components/catalog/SearchForm";
import { SearchLanding } from "@/components/catalog/SearchLanding";
import { listTrySuggestions } from "@/services/catalog/search/try-suggestions";
import { parseSearchType } from "@/components/catalog/search-types";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { AlbumSection, ArtistSection, SongSection, UserSection } from "./sections";
import { withClientMessages } from "@/i18n/client-messages";

type Param = string | string[] | undefined;

interface SearchPageProps {
  searchParams: Promise<Record<string, Param>>;
}

function first(value: Param): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

// Título de la pestaña por estado (openspec: refine-search-results-phase1): "Buscar" sin consulta y
// "«the wall» en álbumes · Buscar" con ella, para distinguir varias búsquedas abiertas.
export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const t = await getTranslations("catalog.search");
  const params = await searchParams;
  const query = first(params.q)?.trim() ?? "";
  if (!query) return { title: t("pageTitle") };
  const type = parseSearchType(params.type);
  return { title: t("documentTitle", { query, type: t(`types.${type}`).toLowerCase() }) };
}

// Server Component: búsqueda POR TIPO a partir de la URL (openspec:
// redesign-scoped-search). Cada tipo ejecuta solo su búsqueda:
//   - Artistas espera su única solicitud a MusicBrainz porque de ella depende
//     la redirección por coincidencia exacta única (estilo Metal Archives);
//   - Álbumes y Canciones pintan primero lo local y transmiten lo de
//     MusicBrainz por streaming (Suspense), ya fusionado en el orden final;
//   - Usuarios no sale a MusicBrainz y redirige con un username exacto.
// La página no ingiere discografías: eso ocurre al abrir un resultado.
// Es el buscador rápido: con criterios que no tiene (enlaces de la fase 1 de
// la búsqueda avanzada) redirige a /search/advanced (openspec: redesign-advanced-search).
async function SearchPage({ searchParams }: SearchPageProps) {
  const t = await getTranslations("catalog");
  const tCommon = await getTranslations("common");
  const params = await searchParams;
  const type = parseSearchType(params.type);
  const query = first(params.q)?.trim() ?? "";
  const all = first(params.all) === "1";
  const criteria = parseCriteria(type, fromRecord(params), query);
  const decade = effectiveDecade(parseDecade(params.decade), criteria);

  if (!isQuickSearch(type, criteria)) {
    // La avanzada no tiene década: se pasa a un rango de años si no hay uno.
    const years =
      type === "album" && decade !== undefined && criteria.yearFrom === undefined && criteria.yearTo === undefined
        ? { yearFrom: decade, yearTo: decade + 9 }
        : {};
    redirect({ href: advancedSearchHref(type, query, { ...criteria, ...years }), locale: await getLocale() });
  }

  // Sin consulta, la portada (recientes, "Prueba con", consejo); con consulta, encabezado compacto: el título queda
  // para lectores de pantalla y los resultados suben (openspec: refine-search-results-phase2).
  const suggestions = query ? null : await listTrySuggestions().catch(() => null);
  return (
    <main
      className={`mx-auto flex min-h-screen w-full max-w-3xl flex-col items-start px-4 ${
        query ? "gap-5 py-6 sm:py-8" : "gap-8 py-12"
      }`}
    >
      <Breadcrumbs
        items={[
          { label: tCommon("home"), href: "/" },
          { label: t("search.breadcrumb") },
        ]}
      />
      <h1 className={query ? "sr-only" : "font-display text-2xl text-paper"}>{t("search.pageTitle")}</h1>
      <SearchForm initialQuery={query} initialType={type} compact={Boolean(query)} />
      {!query ? <SearchLanding suggestions={suggestions} /> : null}
      {query ? (
        <section className="flex w-full flex-col gap-6">
          {type === "artist" ? (
            <ArtistSection query={query} all={all} criteria={criteria} />
          ) : type === "album" ? (
            <AlbumSection query={query} decade={decade} criteria={criteria} />
          ) : type === "song" ? (
            <SongSection query={query} criteria={criteria} />
          ) : (
            <UserSection query={query} all={all} />
          )}
        </section>
      ) : null}
    </main>
  );
}

export default withClientMessages("(catalog)/search/page", SearchPage);
