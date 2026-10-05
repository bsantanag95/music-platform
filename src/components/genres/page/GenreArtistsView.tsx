import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { GenreArtist } from "@/services/genres/artists";
import { ARTIST_SORT_PARAM, genrePageHref, type GenrePageParams } from "@/services/genres/page-params";
import { GenreArtistGrid } from "./GenreArtistCard";
import { GenrePagination } from "./GenrePagination";

// Pestaña Artistas (openspec: redesign-genre-page, capability `genre-page-catalog`): búsqueda por
// nombre, orden y paginación. Es un formulario `GET` sin estado en el cliente: funciona sin JavaScript.

interface GenreArtistsViewProps {
  slug: string;
  params: GenrePageParams;
  artists: GenreArtist[];
  hasNext: boolean;
}

const SORTS = [
  ["albums", "sortAlbums"],
  ["followed", "sortFollowed"],
  ["az", "sortAz"],
] as const;

export function GenreArtistsView({ slug, params, artists, hasNext }: GenreArtistsViewProps) {
  const tArtists = useTranslations("catalog.genres.page.artists");
  const tFilters = useTranslations("catalog.genres.page.filters");
  const filtered = Boolean(params.q);

  return (
    <section aria-labelledby="genre-artists-heading" className="flex w-full flex-col gap-4">
      <h2 id="genre-artists-heading" className="sr-only">
        {tArtists("heading")}
      </h2>
      <form method="get" role="search" aria-label={tArtists("searchPlaceholder")} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="tab" value="artists" />
        {params.artistSort !== "albums" && <input type="hidden" name="orden" value={ARTIST_SORT_PARAM[params.artistSort]} />}
        <input
          type="search"
          name="q"
          defaultValue={params.q}
          placeholder={tArtists("searchPlaceholder")}
          aria-label={tArtists("searchPlaceholder")}
          className="min-w-0 flex-1 rounded-md border border-ink-border bg-ink-surface px-3.5 py-2 font-data text-sm text-paper placeholder:text-paper-muted"
        />
        <button type="submit" className="rounded-md border border-ink-border px-3 py-2 font-data text-sm text-paper hover:border-amber">
          {tFilters("searchSubmit")}
        </button>
      </form>

      <nav aria-label={tArtists("sortLabel")} className="flex flex-wrap items-center gap-1 font-data text-xs">
        <span className="text-paper-muted">{tArtists("sortLabel")}:</span>
        {SORTS.map(([sort, key]) => (
          <Link
            key={sort}
            href={genrePageHref(slug, params, { artistSort: sort })}
            aria-current={params.artistSort === sort ? "true" : undefined}
            className={`rounded px-2 py-1 transition-colors ${
              params.artistSort === sort ? "bg-ink-border text-paper" : "text-paper-muted hover:text-paper"
            }`}
          >
            {tArtists(key)}
          </Link>
        ))}
      </nav>

      {artists.length === 0 ? (
        <div className="flex flex-col items-start gap-2">
          <p className="font-body text-paper-muted">{filtered ? tFilters("noResults") : tArtists("empty")}</p>
          {filtered && (
            <Link
              href={genrePageHref(slug, { ...params, q: "" }, { page: 1 })}
              className="font-data text-sm text-amber underline-offset-2 hover:underline"
            >
              {tFilters("clear")}
            </Link>
          )}
        </div>
      ) : (
        <GenreArtistGrid artists={artists} />
      )}

      <GenrePagination slug={slug} params={params} page={params.page} hasNext={hasNext} />
    </section>
  );
}
