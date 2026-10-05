import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { GenreArtist } from "@/services/genres/artists";
import { artistFiltersActive, genrePageHref, parseGenreParams, type GenrePageParams } from "@/services/genres/page-params";
import { GenreArtistFilters, type GenreArtistFacetOptions } from "./GenreArtistFilters";
import { GenreArtistGrid } from "./GenreArtistCard";
import { GenrePagination } from "./GenrePagination";

// Pestaña Artistas (openspec: redesign-genre-page y add-genre-artist-discovery, capability
// `genre-page-catalog`): búsqueda, filtros de descubrimiento, orden y paginación, todo en la URL.

interface GenreArtistsViewProps {
  slug: string;
  params: GenrePageParams;
  artists: GenreArtist[];
  hasNext: boolean;
  facets: GenreArtistFacetOptions;
  authenticated: boolean;
}

export function GenreArtistsView({ slug, params, artists, hasNext, facets, authenticated }: GenreArtistsViewProps) {
  const tArtists = useTranslations("catalog.genres.page.artists");
  const tFilters = useTranslations("catalog.genres.page.filters");
  const filtered = artistFiltersActive(params);

  return (
    <section aria-labelledby="genre-artists-heading" className="flex w-full flex-col gap-4">
      <h2 id="genre-artists-heading" className="sr-only">
        {tArtists("heading")}
      </h2>
      <GenreArtistFilters slug={slug} params={params} facets={facets} authenticated={authenticated} />

      {artists.length === 0 ? (
        <div className="flex flex-col items-start gap-2">
          <p className="font-body text-paper-muted">{filtered ? tArtists("noResults") : tArtists("empty")}</p>
          {filtered && (
            <Link
              href={genrePageHref(slug, parseGenreParams({ tab: "artists" }))}
              className="font-data text-sm text-amber underline-offset-2 hover:underline"
            >
              {tFilters("clear")}
            </Link>
          )}
        </div>
      ) : (
        <GenreArtistGrid artists={artists} authenticated={authenticated} />
      )}

      <GenrePagination slug={slug} params={params} page={params.page} hasNext={hasNext} />
    </section>
  );
}
