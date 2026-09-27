import { getTranslations } from "next-intl/server";
import { parseArtistTypeFilter, parseCategory, parseDecade } from "@/services/catalog/search/params";
import { SearchForm } from "@/components/catalog/SearchForm";
import { RecentSearches } from "@/components/catalog/RecentSearches";
import { parseSearchType } from "@/components/catalog/search-types";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { AlbumSection, ArtistSection, SongSection, UserSection } from "./sections";

type Param = string | string[] | undefined;

interface SearchPageProps {
  searchParams: Promise<Record<string, Param>>;
}

function first(value: Param): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

// Server Component: búsqueda POR TIPO a partir de la URL (openspec:
// redesign-scoped-search). Cada tipo ejecuta solo su búsqueda:
//   - Artistas espera su única solicitud a MusicBrainz porque de ella depende
//     la redirección por coincidencia exacta única (estilo Metal Archives);
//   - Álbumes y Canciones pintan primero lo local y transmiten lo de
//     MusicBrainz por streaming (Suspense), ya fusionado en el orden final;
//   - Usuarios no sale a MusicBrainz y redirige con un username exacto.
// La página no ingiere discografías: eso ocurre al abrir un resultado.
export default async function SearchPage({ searchParams }: SearchPageProps) {
  const t = await getTranslations("catalog");
  const tCommon = await getTranslations("common");
  const params = await searchParams;
  const type = parseSearchType(params.type);
  const query = first(params.q)?.trim() ?? "";
  const all = first(params.all) === "1";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-start gap-8 px-4 py-12">
      <Breadcrumbs
        items={[
          { label: tCommon("home"), href: "/" },
          { label: t("search.breadcrumb") },
        ]}
      />
      <h1 className="font-display text-2xl text-paper">{t("search.pageTitle")}</h1>
      <SearchForm initialQuery={query} initialType={type} />
      {!query ? <RecentSearches /> : null}
      {query ? (
        <section className="flex w-full flex-col gap-6">
          {type === "artist" ? (
            <ArtistSection query={query} all={all} artistType={parseArtistTypeFilter(params.artistType)} />
          ) : type === "album" ? (
            <AlbumSection
              query={query}
              category={parseCategory(params.category)}
              decade={parseDecade(params.decade)}
            />
          ) : type === "song" ? (
            <SongSection query={query} />
          ) : (
            <UserSection query={query} all={all} />
          )}
        </section>
      ) : null}
    </main>
  );
}
