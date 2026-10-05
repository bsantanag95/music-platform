import { useTranslations } from "next-intl";
import { AlbumCard } from "@/components/catalog/AlbumCard";
import { Link } from "@/i18n/navigation";
import type { ReleaseGroup, ReleaseGroupCategory } from "@/lib/api/schemas";
import { albumFiltersActive, genrePageHref, parseGenreParams, type GenrePageParams } from "@/services/genres/page-params";
import { GenreAlbumRow } from "./GenreAlbumRow";
import { GenreFilterBar, type GenreFilterOption } from "./GenreFilterBar";
import { GenrePagination } from "./GenrePagination";

// Pestaña Álbumes (openspec: redesign-genre-page, capability `genre-page-catalog`): barra de filtros,
// selector de vista y el listado, en cuadrícula o en lista, con paginación en servidor. La página
// carga los datos (ver `GenreAlbumsSection`) y esta vista solo los presenta.

interface GenreAlbumsViewProps {
  slug: string;
  params: GenrePageParams;
  albums: ReleaseGroup[];
  hasNext: boolean;
  /** Artista principal por álbum (para la vista lista). */
  artists: Map<string, { id: string; name: string }>;
  categoryLabels: Record<ReleaseGroupCategory, string>;
  coverLabel: string;
  authenticated: boolean;
  decades: number[];
  subgenres: GenreFilterOption[];
}

function ViewLink({ slug, params, view, label }: { slug: string; params: GenrePageParams; view: "grid" | "list"; label: string }) {
  const active = params.view === view;
  return (
    <Link
      href={genrePageHref(slug, params, { view })}
      aria-current={active ? "true" : undefined}
      className={`rounded px-2 py-1 font-data text-xs transition-colors ${
        active ? "bg-ink-border text-paper" : "text-paper-muted hover:text-paper"
      }`}
    >
      {label}
    </Link>
  );
}

export function GenreAlbumsView({
  slug,
  params,
  albums,
  hasNext,
  artists,
  categoryLabels,
  coverLabel,
  authenticated,
  decades,
  subgenres,
}: GenreAlbumsViewProps) {
  const t = useTranslations("catalog.genres.page");
  const filtered = albumFiltersActive(params);
  const clearHref = genrePageHref(slug, parseGenreParams({ tab: "albums", vista: params.view === "list" ? "lista" : undefined }));

  return (
    <section aria-label={t("filters.resultsLabel")} className="flex w-full flex-col gap-4">
      <GenreFilterBar slug={slug} params={params} categoryLabels={categoryLabels} decades={decades} subgenres={subgenres} />

      <div className="flex items-center justify-end gap-1" role="group" aria-label={t("filters.viewLabel")}>
        <ViewLink slug={slug} params={params} view="grid" label={t("filters.viewGrid")} />
        <ViewLink slug={slug} params={params} view="list" label={t("filters.viewList")} />
      </div>

      {albums.length === 0 ? (
        filtered ? (
          <div className="flex flex-col items-start gap-2 rounded-lg border border-ink-border bg-ink-surface p-4">
            <p className="font-body text-paper-muted">{t("filters.noResults")}</p>
            <Link href={clearHref} className="font-data text-sm text-amber underline-offset-2 hover:underline">
              {t("filters.clear")}
            </Link>
          </div>
        ) : (
          <p className="font-body text-paper-muted">{t("empty")}</p>
        )
      ) : params.view === "list" ? (
        <ul className="flex w-full flex-col gap-2">
          {albums.map((album) => (
            <li key={album.id}>
              <GenreAlbumRow
                album={album}
                artist={artists.get(album.id) ?? null}
                categoryLabel={categoryLabels[album.category]}
                coverLabel={coverLabel}
                authenticated={authenticated}
              />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {albums.map((album) => (
            <li key={album.id}>
              <AlbumCard
                releaseGroup={album}
                categoryLabel={categoryLabels[album.category]}
                coverLabel={coverLabel}
                authenticated={authenticated}
              />
            </li>
          ))}
        </ul>
      )}

      <GenrePagination slug={slug} params={params} page={params.page} hasNext={hasNext} />
    </section>
  );
}
