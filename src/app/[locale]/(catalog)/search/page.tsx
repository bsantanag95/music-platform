import { getTranslations } from "next-intl/server";
import { searchCatalog } from "@/services/catalog/search-catalog";
import type { CatalogSearchResult } from "@/services/catalog/search-catalog";
import { SearchForm } from "@/components/catalog/SearchForm";
import { SearchResults } from "@/components/catalog/SearchResults";
import { ErrorState } from "@/components/ui/ErrorState";
import { Link } from "@/i18n/navigation";

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

// Server Component: la búsqueda es carga inicial de datos a partir de la URL
// (patrón "cacheo bajo demanda" — ver openspec add-search-results-page). Se
// resuelve en el servidor vía el mismo servicio del endpoint; la página no
// ingiere nada, solo lista candidatos.
export default async function SearchPage({ searchParams }: SearchPageProps) {
  const t = await getTranslations("catalog");
  const tErrors = await getTranslations("errors");
  const tCommon = await getTranslations("common");
  const { q } = await searchParams;
  const query = q?.trim();

  let results: CatalogSearchResult[] | null = null;
  let failed = false;
  if (query) {
    try {
      results = await searchCatalog(query);
    } catch {
      // Fallo total de MusicBrainz sin datos locales: "no se pudo buscar"
      // (recuperable), distinto de "sin coincidencias" (lista vacía).
      failed = true;
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center gap-6 px-4 py-12">
      <h1 className="font-display text-2xl text-paper">{t("search.pageTitle")}</h1>
      <SearchForm initialQuery={query} />
      {query &&
        (failed ? (
          <div className="flex w-full flex-col items-center gap-3">
            <ErrorState
              title={tErrors("INTERNAL_ERROR.title")}
              description={tErrors("INTERNAL_ERROR.description")}
            />
            <Link
              href={`/search?q=${encodeURIComponent(query)}`}
              className="font-body text-sm text-amber hover:underline"
            >
              {tCommon("retry")}
            </Link>
          </div>
        ) : (
          <SearchResults results={results ?? []} />
        ))}
    </main>
  );
}
