import { getTranslations } from "next-intl/server";
import { searchCatalog } from "@/services/catalog/search-catalog";
import type { CatalogSearchResponse } from "@/services/catalog/search-catalog";
import { SearchForm } from "@/components/catalog/SearchForm";
import { SearchResults } from "@/components/catalog/SearchResults";
import { RecentSearches } from "@/components/catalog/RecentSearches";
import { SearchErrorState } from "@/components/catalog/SearchErrorState";
import { parseSearchTab } from "@/components/catalog/search-tabs";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

interface SearchPageProps {
  searchParams: Promise<{ q?: string; type?: string | string[] }>;
}

// Server Component: la búsqueda es carga inicial de datos a partir de la URL
// (patrón "cacheo bajo demanda" — ver openspec add-search-results-page). Se
// resuelve en el servidor vía el mismo servicio del endpoint; la página no
// ingiere nada, solo lista candidatos y, si la consulta coincide con una
// canción, su contexto de álbumes (openspec add-recording-album-search). La
// pestaña activa llega en `?type=` solo para la carga inicial; los cambios
// posteriores los refleja `SearchResults` con la History API, sin re-ejecutar
// la búsqueda.
export default async function SearchPage({ searchParams }: SearchPageProps) {
  const t = await getTranslations("catalog");
  const tCommon = await getTranslations("common");
  const { q, type } = await searchParams;
  const query = q?.trim();

  let response: CatalogSearchResponse | null = null;
  let failed = false;
  if (query) {
    try {
      response = await searchCatalog(query);
    } catch {
      // Fallo total de MusicBrainz sin datos locales: "no se pudo buscar"
      // (recuperable), distinto de "sin coincidencias" (lista vacía).
      failed = true;
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-start gap-8 px-4 py-12">
      <Breadcrumbs
        items={[
          { label: tCommon("home"), href: "/" },
          { label: t("search.breadcrumb") },
        ]}
      />
      <h1 className="font-display text-2xl text-paper">{t("search.pageTitle")}</h1>
      <SearchForm initialQuery={query} />
      {!query && <RecentSearches />}
      {query &&
        (failed ? (
          <SearchErrorState />
        ) : (
          <SearchResults
            results={response?.results ?? []}
            query={query}
            initialTab={parseSearchTab(type)}
            songContext={response?.songContext}
          />
        ))}
    </main>
  );
}
