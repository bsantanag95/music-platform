import { getTranslations } from "next-intl/server";
import { AlbumRail } from "@/components/discovery/AlbumRail";
import { Link } from "@/i18n/navigation";
import type { ReleaseGroupCategory } from "@/lib/api/schemas";
import { resolvePrimaryArtists } from "@/services/catalog/primary-artists";
import { listAlbumsFiltered } from "@/services/discovery/discovery";
import { listGenreArtists } from "@/services/genres/artists";
import { GENRE_OVERVIEW_ARTISTS, GENRE_OVERVIEW_LISTS } from "@/services/genres/constants";
import { listGenreLists } from "@/services/genres/lists";
import { getGenreRecentReviews } from "@/services/genres/reviews";
import { genreDisplayName, genreLocaleOf } from "@/services/genres/names";
import type { GenrePageData } from "@/services/genres/page";
import { genrePageHref, type GenrePageParams } from "@/services/genres/page-params";
import { getGenreEssentials, getGenreNewReleases } from "@/services/genres/rails";
import { albumHasGenre, albumInGenreTree, findDescendantStyleGenre } from "@/services/genres/read";
import { getGenreFootprint } from "@/services/genres/personal";
import { getGenreStats } from "@/services/genres/stats";
import { GenreAlbumsView } from "./GenreAlbumsView";
import { GenreArtistGrid } from "./GenreArtistCard";
import { GenreArtistsView } from "./GenreArtistsView";
import { GenreListsPreview, GenreListsView, GenreRecentReviews } from "./GenreCommunity";
import { GenreDecadeBars } from "./GenreDecadeBars";
import { GenreFootprint } from "./GenreFootprint";

// Secciones de servidor de la página de género (openspec: redesign-genre-page). Cada una carga lo suyo
// y delega la presentación en un componente sin estado, así la página puede envolverlas en `<Suspense>`
// y una consulta lenta no retrasa la cabecera. Las lecturas devuelven `[]`/`null` bajo su umbral y aquí
// la sección simplemente no se renderiza.

interface RailContext {
  data: GenrePageData;
  params: GenrePageParams;
  categoryLabels: Record<ReleaseGroupCategory, string>;
  coverLabel: string;
  authenticated: boolean;
  /** Identificador del lector (bloqueos y estado de guardado); `null` si es anónimo. */
  readerId?: string | null;
}

export async function GenreEssentialsSection({ data, params, categoryLabels, coverLabel, authenticated }: RailContext) {
  const albums = await getGenreEssentials(data.genre.id);
  if (albums.length === 0) return null;
  const t = await getTranslations("catalog.genres.page.rails");
  return (
    <AlbumRail
      heading={t("essentialsHeading")}
      albums={albums}
      categoryLabels={categoryLabels}
      coverLabel={coverLabel}
      authenticated={authenticated}
      id="genre-essentials"
      seeAll={{ href: genrePageHref(data.genre.slug, params, { tab: "albums", albumSort: "best", page: 1 }), label: t("seeAll") }}
    />
  );
}

export async function GenreNewReleasesSection({ data, params, categoryLabels, coverLabel, authenticated }: RailContext) {
  const albums = await getGenreNewReleases(data.genre.id);
  if (albums.length === 0) return null;
  const t = await getTranslations("catalog.genres.page.rails");
  return (
    <AlbumRail
      heading={t("newReleasesHeading")}
      albums={albums}
      categoryLabels={categoryLabels}
      coverLabel={coverLabel}
      authenticated={authenticated}
      seeAll={{ href: genrePageHref(data.genre.slug, params, { tab: "albums", albumSort: "newest", page: 1 }), label: t("seeAll") }}
    />
  );
}

export async function GenreArtistsPreviewSection({ data, params }: Pick<RailContext, "data" | "params">) {
  const { artists } = await listGenreArtists(data.genre.id, { pageSize: GENRE_OVERVIEW_ARTISTS });
  if (artists.length === 0) return null;
  const t = await getTranslations("catalog.genres.page.artists");
  return (
    <section aria-labelledby="genre-artists-preview" className="flex w-full flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="genre-artists-preview" className="font-display text-xl text-paper">
          {t("heading")}
        </h2>
        <Link
          href={genrePageHref(data.genre.slug, params, { tab: "artists", page: 1 })}
          className="font-data text-sm text-amber underline-offset-2 hover:underline"
        >
          {t("seeAll")} →
        </Link>
      </div>
      <GenreArtistGrid artists={artists} />
    </section>
  );
}

export async function GenreDecadesSection({ data, params }: Pick<RailContext, "data" | "params">) {
  const stats = await getGenreStats(data.genre.id);
  return <GenreDecadeBars slug={data.genre.slug} params={params} decades={stats.decades} />;
}

/** Pestaña Álbumes: aplica los filtros de la URL (el subgénero y el alcance cambian la raíz del árbol). */
export async function GenreAlbumsSection({
  data,
  params,
  categoryLabels,
  coverLabel,
  authenticated,
  locale,
}: RailContext & { locale: string }) {
  const sub = params.sub ? await findDescendantStyleGenre(data.genre.id, params.sub) : null;
  const root = sub ?? data.genre;
  const condition = params.exact ? albumHasGenre(root.id) : albumInGenreTree(root.id);
  // Un `sub` ajeno al árbol se ignora: la URL que lo trae sigue mostrando el género de la página.
  const effective = sub ? params : { ...params, sub: undefined };

  const [page, stats] = await Promise.all([
    listAlbumsFiltered(condition, {
      page: params.page,
      category: params.category,
      decade: params.decade,
      q: params.q,
      sort: params.albumSort,
    }),
    getGenreStats(data.genre.id),
  ]);
  const primary = await resolvePrimaryArtists({ releaseGroupIds: page.albums.map((a) => a.id) });
  const artists = new Map([...primary.releaseGroups].map(([id, ref]) => [id, { id: ref.id, name: ref.name }]));

  const genreLocale = genreLocaleOf(locale);
  const subgenres = data.children
    .filter((c) => c.albumCount > 0)
    .map((c) => ({ value: c.slug, label: genreDisplayName(c, genreLocale) }));
  // La década activa siempre figura en el selector, aunque el subárbol no la liste (p. ej. con `sub`).
  const decades = [...new Set([...stats.allDecades, ...(params.decade !== undefined ? [params.decade] : [])])].sort((a, b) => b - a);

  return (
    <GenreAlbumsView
      slug={data.genre.slug}
      params={effective}
      albums={page.albums}
      hasNext={page.hasNext}
      artists={artists}
      categoryLabels={categoryLabels}
      coverLabel={coverLabel}
      authenticated={authenticated}
      decades={decades}
      subgenres={subgenres}
    />
  );
}

export async function GenreArtistsSection({ data, params }: Pick<RailContext, "data" | "params">) {
  const page = await listGenreArtists(data.genre.id, { page: params.page, q: params.q, sort: params.artistSort });
  return <GenreArtistsView slug={data.genre.slug} params={params} artists={page.artists} hasNext={page.hasNext} />;
}

export async function GenreListsPreviewSection({ data, params, authenticated, readerId = null }: Pick<RailContext, "data" | "params" | "authenticated" | "readerId">) {
  const { lists } = await listGenreLists(readerId, data.genre.id, { pageSize: GENRE_OVERVIEW_LISTS });
  return <GenreListsPreview slug={data.genre.slug} params={params} lists={lists} canSave={authenticated} />;
}

export async function GenreListsSection({ data, params, authenticated, readerId = null }: Pick<RailContext, "data" | "params" | "authenticated" | "readerId">) {
  const page = await listGenreLists(readerId, data.genre.id, { page: params.page });
  return <GenreListsView slug={data.genre.slug} params={params} lists={page.lists} hasNext={page.hasNext} canSave={authenticated} />;
}

export async function GenreReviewsSection({ data, readerId = null }: Pick<RailContext, "data" | "readerId">) {
  const reviews = await getGenreRecentReviews(data.genre.id, readerId);
  return <GenreRecentReviews reviews={reviews} />;
}

/** "Tu huella en este género": solo con sesión. La invitación apunta a los Esenciales si el género los tiene. */
export async function GenreFootprintSection({ data, params, readerId }: Pick<RailContext, "data" | "params" | "readerId">) {
  if (!readerId) return null;
  const [footprint, essentials] = await Promise.all([getGenreFootprint(readerId, data.genre.id), getGenreEssentials(data.genre.id)]);
  const start =
    essentials.length > 0
      ? { kind: "essentials" as const, href: `${genrePageHref(data.genre.slug, params, { tab: "overview" })}#genre-essentials` }
      : { kind: "albums" as const, href: genrePageHref(data.genre.slug, params, { tab: "albums", page: 1 }) };
  return <GenreFootprint footprint={footprint} start={start} />;
}
