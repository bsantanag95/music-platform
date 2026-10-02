import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AlbumCard } from "@/components/catalog/AlbumCard";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { artistHref, genreHref } from "@/lib/catalog-links";
import type { ReleaseGroup, ReleaseGroupCategory } from "@/lib/api/schemas";
import type { FamilyKey } from "@/services/genres/families";
import { genreDisplayName, genreLocaleOf } from "@/services/genres/names";
import type { GenreArtist, RelatedGenre } from "@/services/genres/page";

// Vista de la página de género `/genre/<slug>` (openspec: show-genres, capability `genre-pages`).
// Componente sin estado: la página de servidor le pasa los datos ya cargados.

interface GenrePageViewProps {
  name: string;
  families: FamilyKey[];
  parents: RelatedGenre[];
  subgenres: RelatedGenre[];
  related: RelatedGenre[];
  artists: GenreArtist[];
  albums: ReleaseGroup[];
  page: number;
  hasNext: boolean;
  /** Base de la paginación (`/genre/<slug>`). */
  baseHref: string;
  categoryLabels: Record<ReleaseGroupCategory, string>;
  coverLabel: string;
  authenticated: boolean;
  /** Etiqueta del enlace "Explorar" del breadcrumb y textos de paginación. */
  labels: { home: string; explore: string; prev: string; next: string };
}

const CHIP =
  "inline-flex rounded-full border border-ink-border px-2.5 py-0.5 font-data text-xs text-paper-muted transition-colors hover:border-amber hover:text-paper";

function GenreLinks({ label, genres }: { label: string; genres: RelatedGenre[] }) {
  const locale = genreLocaleOf(useLocale());
  if (genres.length === 0) return null;
  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <span className="font-data text-xs uppercase tracking-wide text-paper-muted">{label}</span>
      <ul className="flex flex-wrap gap-1.5">
        {genres.map((g) => (
          <li key={g.slug}>
            <Link href={genreHref(g.slug)} className={CHIP}>
              {genreDisplayName(g, locale)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function GenrePageView({
  name,
  families,
  parents,
  subgenres,
  related,
  artists,
  albums,
  page,
  hasNext,
  baseHref,
  categoryLabels,
  coverLabel,
  authenticated,
  labels,
}: GenrePageViewProps) {
  const t = useTranslations("catalog.genres");
  const tPage = useTranslations("catalog.genres.page");
  const empty = artists.length === 0 && albums.length === 0;

  return (
    <main className="flex min-h-screen w-full flex-col items-start gap-8 px-4 py-12">
      <Breadcrumbs
        items={[
          { label: labels.home, href: "/" },
          { label: labels.explore, href: "/explore" },
          { label: tPage("breadcrumb") },
        ]}
      />
      <div className="flex w-full flex-col gap-3">
        <h1 className="font-display text-3xl text-paper [overflow-wrap:anywhere]">{name}</h1>
        {families.length > 0 && (
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="font-data text-xs uppercase tracking-wide text-paper-muted">{tPage("familiesLabel")}</span>
            <ul className="flex flex-wrap gap-1.5">
              {families.map((family) => (
                <li key={family}>
                  <Link href={`/explore?familia=${family}`} className={CHIP}>
                    {t(`families.${family}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        <GenreLinks label={tPage("parentsLabel")} genres={parents} />
        <GenreLinks label={tPage("childrenLabel")} genres={subgenres} />
        <GenreLinks label={tPage("relatedLabel")} genres={related} />
      </div>

      {empty && <p className="font-body text-paper-muted">{tPage("empty")}</p>}

      {artists.length > 0 && (
        <section className="flex w-full flex-col gap-3">
          <h2 className="font-display text-xl text-paper">{tPage("artistsHeading")}</h2>
          <ul className="flex flex-wrap gap-2">
            {artists.map((artist) => (
              <li key={artist.id}>
                <Link href={artistHref(artist.name, artist.id)} className={CHIP}>
                  {artist.name} · {tPage("albumCount", { count: artist.albumCount })}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {albums.length > 0 && (
        <section className="flex w-full flex-col gap-3">
          <h2 className="font-display text-xl text-paper">{tPage("albumsHeading")}</h2>
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
          {(page > 1 || hasNext) && (
            <nav className="flex gap-4 font-data text-sm">
              {page > 1 ? (
                <Link href={`${baseHref}?page=${page - 1}`} className="text-amber underline">
                  {labels.prev}
                </Link>
              ) : (
                <span className="text-paper-muted opacity-50">{labels.prev}</span>
              )}
              {hasNext ? (
                <Link href={`${baseHref}?page=${page + 1}`} className="text-amber underline">
                  {labels.next}
                </Link>
              ) : (
                <span className="text-paper-muted opacity-50">{labels.next}</span>
              )}
            </nav>
          )}
        </section>
      )}
    </main>
  );
}
