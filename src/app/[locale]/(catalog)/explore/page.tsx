import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { AlbumRail } from "@/components/discovery/AlbumRail";
import { CollectionRail } from "@/components/discovery/CollectionRail";
import { daysUntilRelease, releaseDateLabel } from "@/components/discovery/release-date-label";
import { AwardsExploreSection } from "@/components/awards/AwardsExploreSection";
import { listLatestCeremoniesByAward } from "@/services/awards/read";
import { ExploreJumpNav } from "@/components/discovery/ExploreJumpNav";
import { FilteredAlbumList } from "@/components/discovery/FilteredAlbumList";
import { MosaicGrid, type MosaicTile } from "@/components/discovery/MosaicGrid";
import { PopularNow } from "@/components/discovery/PopularNow";
import { ApiError } from "@/lib/api/errors";
import { isExploreEnabled } from "@/lib/config/discovery";
import { genreHref } from "@/lib/catalog-links";
import { getCurrentUser } from "@/services/auth/authorization";
import {
  CURATOR_USERNAME,
  isValidDecade,
  MIN_RATINGS_PER_ALBUM,
  MOSAIC_FIRST_DECADE,
  NEW_RELEASE_WINDOW_DAYS,
  UPCOMING_WINDOW_DAYS,
} from "@/services/discovery/constants";
import {
  getExplorePage,
  albumArtistNames,
  listAlbumsByDecade,
  listAlbumsByFamily,
  listAlbumsByGenre,
  listDecades,
  listDecadeCategories,
  listDecadeYears,
  listNewAlbums,
  listUpcomingAlbums,
  listGenreFamilies,
  type AlbumPage,
  type FamilyBucket,
} from "@/services/discovery/discovery";
import { ensureCollectionsFresh } from "@/services/discovery/collections/sync";
import { decadeLabel } from "@/services/discovery/decade-label";
import { listDecadeCovers } from "@/services/discovery/decade-covers";
import { listDecadeGenres } from "@/services/discovery/decade-genres";
import { listFamilyGenres } from "@/services/discovery/family-genres";
import { exploreListHref, parseExploreListParams } from "@/services/discovery/explore-params";
import { genreDisplayName, genreLocaleOf } from "@/services/genres/names";
import type { GenreRow } from "@/db/schema";
import type { ReleaseGroupCategory } from "@/lib/api/schemas";

interface ExplorePageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ proximos?: string; novedades?: string; decada?: string; anio?: string; familia?: string; genero?: string; tipo?: string; orden?: string; page?: string }>;
}

export async function generateMetadata({ params }: ExplorePageProps): Promise<Metadata> {
  await params;
  const t = await getTranslations("catalog.explore");
  return { title: t("pageTitle") };
}

export default async function ExplorePage({ params, searchParams }: ExplorePageProps) {
  const { locale } = await params;
  if (!isExploreEnabled()) redirect({ href: "/", locale });

  const t = await getTranslations("catalog.explore");
  const tCommon = await getTranslations("common");
  const tCat = await getTranslations("catalog.artist");
  const tGenres = await getTranslations("catalog.genres");
  const raw = await searchParams;
  const { decada, familia, genero, proximos, novedades } = raw;
  const listParams = parseExploreListParams(raw);
  const listOptions = { category: listParams.category, sort: listParams.sort };

  const categoryLabels = {
    studio: tCat("categories.studio"),
    single_ep: tCat("categories.single_ep"),
    compilation: tCat("categories.compilation"),
    live_other: tCat("categories.live_other"),
  } satisfies Record<ReleaseGroupCategory, string>;
  const coverLabel = t("albumCoverLabel");
  // Sesión para el menú de acciones de cada disco (openspec: extend-album-quick-actions); antes
  // las tarjetas trataban a todos como anónimos.
  const authenticated = (await getCurrentUser()) !== null;
  const dateLabelsFor = (albums: { id: string; firstReleaseDate: string | null }[]): Record<string, string> => {
    const labels: Record<string, string> = {};
    for (const album of albums) {
      const label = releaseDateLabel(album.firstReleaseDate, locale);
      if (label) labels[album.id] = label;
    }
    return labels;
  };
  // Cuenta regresiva de "Próximos lanzamientos" sobre la carátula ("En 5 días", "Mañana", "Hoy"): la fecha
  // sola obligaba a calcular cuánto falta, y el riel quedaba idéntico al de Novedades.
  const countdownsFor = (albums: { id: string; firstReleaseDate: string | null }[]): Record<string, string> => {
    const labels: Record<string, string> = {};
    for (const album of albums) {
      const days = daysUntilRelease(album.firstReleaseDate);
      if (days !== undefined) labels[album.id] = t("countdown", { days });
    }
    return labels;
  };
  const listProps = { params: listParams, categoryLabels, coverLabel, authenticated };

  // --- Vista filtrada: un corte a la vez; prioridad década > familia > género. Los cortes hermanos
  // conservan el tipo y el orden elegidos. ---
  if (decada !== undefined) {
    const decade = Number(decada);
    const decadeName = isValidDecade(decade) ? decadeLabel(decade, locale) : decada.trim();
    // Un año que no es de la década (`?anio=1985` en `?decada=1990`, `?anio=abc`) se ignora y se muestra la década completa.
    const rawYear = Array.isArray(raw.anio) ? raw.anio[0] : raw.anio;
    const yearValue = rawYear === undefined || rawYear.trim() === "" ? Number.NaN : Number(rawYear);
    const year = Number.isInteger(yearValue) && yearValue >= decade && yearValue <= decade + 9 ? yearValue : undefined;
    // El género refina la década (`?decada=1980&genero=hard-rock`); una `familia` junto a la década se ignora.
    const rawGenre = (Array.isArray(genero) ? genero[0] : genero)?.trim();
    const genreSlug = rawGenre ? rawGenre : undefined;
    const ifInvalid = <T,>(empty: T) => (error: unknown) => {
      if (error instanceof ApiError && error.code === "VALIDATION_ERROR") return empty;
      throw error;
    };
    type DecadeListing = AlbumPage & { genre: GenreRow | null };
    const emptyListing: DecadeListing = { albums: [], page: listParams.page, pageSize: 0, hasNext: false, genre: null };
    const listing: Promise<DecadeListing> = genreSlug
      ? listAlbumsByGenre(genreSlug, listParams.page, { ...listOptions, decade, year })
      : listAlbumsByDecade(decade, listParams.page, { ...listOptions, year }).then((found) => ({ ...found, genre: null }));
    const [result, decades, decadeYears, decadeGenres, decadeCovers] = await Promise.all([
      listing.catch(ifInvalid(emptyListing)),
      listDecades(),
      listDecadeYears(decade).catch(ifInvalid([] as number[])),
      listDecadeGenres(decade),
      listDecadeCovers(),
    ]);
    const genre = result.genre ?? null;
    const currentGenre = genre?.slug ?? genreSlug;
    const genreName = genre ? genreDisplayName(genre, genreLocaleOf(locale)) : (genreSlug ?? "");
    // Tipos con discos en el corte actual: los demás chips de tipo salen deshabilitados.
    const availableCategories = await listDecadeCategories(decade, { year, genreId: genre?.id }).catch(ifInvalid([] as ReleaseGroupCategory[]));

    // Cada chip conserva el resto de refinamientos y el tipo y el orden elegidos; la página vuelve a la 1.
    const cutHref = (cut: { decade?: number; year?: number; genre?: string }) => {
      const parts = [`decada=${cut.decade ?? decade}`];
      if (cut.year !== undefined) parts.push(`anio=${cut.year}`);
      if (cut.genre !== undefined) parts.push(`genero=${encodeURIComponent(cut.genre)}`);
      return `/explore?${parts.join("&")}`;
    };
    const chipHref = (cut: Parameters<typeof cutHref>[0]) => exploreListHref(cutHref(cut), listParams, { page: 1 });
    const decadePlainHref = cutHref({});
    const baseHref = cutHref({ year, genre: currentGenre });

    // Con mayúscula inicial, como las familias de la portada ("Rock", no "rock"): la taxonomía guarda los nombres en minúscula.
    const capitalize = (text: string) => text.charAt(0).toLocaleUpperCase(locale) + text.slice(1);
    const genreLinks = decadeGenres.map((item) => ({
      key: item.slug,
      label: capitalize(genreDisplayName(item, genreLocaleOf(locale))),
      href: chipHref({ year, genre: item.slug }),
      current: item.slug === currentGenre,
    }));
    // Un género de la URL que no está entre los de la fila se agrega al final, marcado.
    if (genre && !genreLinks.some((link) => link.key === genre.slug)) {
      genreLinks.push({ key: genre.slug, label: capitalize(genreName), href: chipHref({ year, genre: genre.slug }), current: true });
    }

    // Datos de la portada: cuántos álbumes tiene la década en el catálogo y qué años abarca.
    const numberFormat = new Intl.NumberFormat(locale, { useGrouping: "always" });
    const decadeCount = decades.find((bucket) => bucket.decade === decade)?.count;
    const yearsSpan = decadeYears.length > 0 ? `${Math.min(...decadeYears)}–${Math.max(...decadeYears)}` : null;
    const decadeStats = [
      decadeCount !== undefined ? t("albumCount", { count: decadeCount, formatted: numberFormat.format(decadeCount) }) : null,
      yearsSpan,
    ]
      .filter(Boolean)
      .join(" · ");

    return (
      <FilteredAlbumList
        {...listProps}
        heading={
          genreSlug && year !== undefined
            ? t("decadeGenreYearHeading", { genre: genreName, year })
            : genreSlug
              ? t("decadeGenreHeading", { genre: genreName, decade: decadeName.toLowerCase() })
              : year !== undefined
                ? t("yearResultsHeading", { year })
                : t("decadeResultsHeading", { decade: decadeName.toLowerCase() })
        }
        // Un nivel por refinamiento: Explorar / década / año / género, con el último sin enlace.
        parentCrumbs={[
          ...(genreSlug || year !== undefined ? [{ label: decadeName, href: decadePlainHref }] : []),
          ...(genreSlug && year !== undefined ? [{ label: String(year), href: cutHref({ year }) }] : []),
        ]}
        crumb={genreSlug ? genreName : year !== undefined ? String(year) : decadeName}
        result={result}
        artistNames={await albumArtistNames(result.albums.map((album) => album.id))}
        baseHref={baseHref}
        hero={{
          display: year !== undefined ? String(year) : `${decade}s`,
          stats: decadeStats,
          covers: decadeCovers.get(decade) ?? [],
        }}
        typeAsSelect
        selects={
          genreLinks.length > 0
            ? [
                {
                  key: "genero",
                  label: t("facetGenre"),
                  options: [
                    { key: "all", label: t("facetAllGenres"), href: chipHref({ year }), current: !currentGenre },
                    ...genreLinks,
                  ],
                },
              ]
            : undefined
        }
        availableCategories={availableCategories}
        related={genre ? { href: `${genreHref(genre.slug)}?tab=albums&decada=${decade}`, label: t("genrePageLink", { genre: genreName }) } : undefined}
        clearHref={genreSlug || year !== undefined ? decadePlainHref : undefined}
        facets={[
          {
            label: t("facetYear"),
            links: [
              { key: "all", label: t("decadeAllYears"), href: chipHref({ genre: currentGenre }), current: year === undefined },
              ...decadeYears.map((value) => ({
                key: String(value),
                label: String(value),
                href: chipHref({ year: value, genre: currentGenre }),
                current: value === year,
              })),
            ],
            // Las demás décadas conservan el género, el tipo y el orden y quitan el año: comparar una época con otra dentro de un género.
            menu: {
              label: t("otherDecades"),
              links: [...decades]
                .sort((a, b) => a.decade - b.decade)
                .map((bucket) => ({
                  key: String(bucket.decade),
                  label: decadeLabel(bucket.decade, locale),
                  href: chipHref({ decade: bucket.decade, genre: currentGenre }),
                  current: bucket.decade === decade,
                })),
            },
          },
        ]}
      />
    );
  }
  if (familia !== undefined) {
    const [result, families, familyGenres] = await Promise.all([
      listAlbumsByFamily(familia, listParams.page, listOptions),
      listGenreFamilies(),
      listFamilyGenres(familia.trim()),
    ]);
    const family = result.family ? tGenres(`families.${result.family}`) : familia.trim();
    return (
      <FilteredAlbumList
        {...listProps}
        heading={t("familyResultsHeading", { family })}
        crumb={family}
        result={result}
        artistNames={await albumArtistNames(result.albums.map((album) => album.id))}
        baseHref={`/explore?familia=${encodeURIComponent(result.family ?? familia.trim())}`}
        // Los géneros más grandes de la familia, cada uno con su página completa: la forma de seguir navegando hacia dentro.
        topics={{
          label: t("familyGenresLabel", { family }),
          links: familyGenres.map((item) => ({
            key: item.slug,
            label: genreDisplayName(item, genreLocaleOf(locale)),
            href: genreHref(item.slug),
          })),
        }}
        siblings={{
          label: t("otherFamilies"),
          // Veinte chips de familia empujaban el primer disco bajo el pliegue: van en un desplegable cerrado.
          collapsed: true,
          links: families.map((bucket) => ({
            key: bucket.key,
            label: tGenres(`families.${bucket.key}`),
            href: exploreListHref(`/explore?familia=${bucket.key}`, listParams, { page: 1 }),
            current: bucket.key === result.family,
          })),
        }}
      />
    );
  }
  if (genero !== undefined) {
    const result = await listAlbumsByGenre(genero, listParams.page, listOptions);
    const genre = result.genre ? genreDisplayName(result.genre, genreLocaleOf(locale)) : genero.trim();
    return (
      <FilteredAlbumList
        {...listProps}
        heading={t("genreResultsHeading", { genre })}
        crumb={genre}
        result={result}
        artistNames={await albumArtistNames(result.albums.map((album) => album.id))}
        baseHref={`/explore?genero=${encodeURIComponent(result.genre?.slug ?? genero.trim())}`}
        related={result.genre ? { href: genreHref(result.genre.slug), label: t("genrePageLink", { genre }) } : undefined}
      />
    );
  }

  // --- Listados cronológicos de lanzamientos (orden fijo): el selector de orden no aplica y el `orden`
  // de la URL se descarta. Prioridad: próximos > novedades. Los dos se enlazan como cortes hermanos. ---
  const fixedOrderParams = { ...listParams, sort: "best" as const };
  const releaseSiblings = (current: "novedades" | "proximos") => ({
    label: t("releasesNavLabel"),
    links: [
      {
        key: "novedades",
        label: t("newReleasesHeading"),
        href: exploreListHref("/explore?novedades=1", fixedOrderParams, { page: 1 }),
        current: current === "novedades",
      },
      {
        key: "proximos",
        label: t("upcomingHeading"),
        href: exploreListHref("/explore?proximos=1", fixedOrderParams, { page: 1 }),
        current: current === "proximos",
      },
    ],
  });

  if (proximos === "1") {
    const result = await listUpcomingAlbums(listParams.page, { category: listParams.category });
    return (
      <FilteredAlbumList
        {...listProps}
        params={fixedOrderParams}
        siblings={releaseSiblings("proximos")}
        heading={t("upcomingResultsHeading")}
        crumb={t("upcomingCrumb")}
        result={result}
        artistNames={await albumArtistNames(result.albums.map((album) => album.id))}
        baseHref="/explore?proximos=1"
        hideSort
        dateLabels={dateLabelsFor(result.albums)}
        stats={countdownsFor(result.albums)}
      />
    );
  }
  if (novedades === "1") {
    const result = await listNewAlbums(listParams.page, { category: listParams.category });
    return (
      <FilteredAlbumList
        {...listProps}
        params={fixedOrderParams}
        siblings={releaseSiblings("novedades")}
        heading={t("newReleasesResultsHeading")}
        crumb={t("newReleasesHeading")}
        result={result}
        artistNames={await albumArtistNames(result.albums.map((album) => album.id))}
        baseHref="/explore?novedades=1"
        hideSort
        dateLabels={dateLabelsFor(result.albums)}
      />
    );
  }

  // --- Portada ---
  // Las colecciones destacadas se regeneran cada semana bajo demanda, después de responder.
  const [explore, recentCeremonies] = await Promise.all([
    getExplorePage(),
    listLatestCeremoniesByAward(),
    ensureCollectionsFresh(),
  ]);
  const railArtistNames = await albumArtistNames(
    [explore.newReleases, explore.upcoming, explore.topRated, explore.popular.albums?.items ?? []].flat().map((album) => album.id),
  );
  const starsFormat = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  // Cifra que ubica a cada disco en su riel, sobre la carátula: el promedio en "Mejor valorados".
  const topRatedStats = Object.fromEntries(explore.topRated.map((album) => [album.id, `★ ${starsFormat.format(album.avgStars)}`]));
  const hasPopular = Boolean(explore.popular.albums || explore.popular.artists || explore.popular.songs);
  const familyTiles = (buckets: FamilyBucket[]): MosaicTile[] =>
    buckets.map((bucket) => ({
      key: bucket.key,
      label: tGenres(`families.${bucket.key}`),
      href: `/explore?familia=${bucket.key}`,
      covers: bucket.covers,
    }));
  const moreFamilies = explore.families.filter((f) => f.tier === "more");
  // Décadas: de la más reciente a la más antigua; desde 1950 son tarjetas de la grilla y las anteriores van tras "Décadas anteriores".
  const decadeTile = (bucket: (typeof explore.decades)[number]): MosaicTile => ({
    key: String(bucket.decade),
    label: decadeLabel(bucket.decade, locale),
    href: `/explore?decada=${bucket.decade}`,
    covers: bucket.covers,
  });
  const decadeTiles = explore.decades.filter((bucket) => bucket.decade >= MOSAIC_FIRST_DECADE).map(decadeTile);
  const earlierDecadeTiles = explore.decades.filter((bucket) => bucket.decade < MOSAIC_FIRST_DECADE).map(decadeTile);
  // Navegación rápida: una entrada por cada sección que se renderiza (mismos datos que cada sección usa para omitirse),
  // en el orden de la página.
  const jumpItems = [
    { id: "colecciones", label: t("jump.collections"), visible: explore.collections.length > 0 },
    { id: "popular", label: t("jump.popular"), visible: hasPopular },
    { id: "generos", label: t("jump.genres"), visible: explore.families.length > 0 },
    { id: "decadas", label: t("jump.decades"), visible: explore.decades.length > 0 },
    { id: "novedades", label: t("jump.newReleases"), visible: explore.newReleases.length > 0 },
    { id: "proximos", label: t("jump.upcoming"), visible: explore.upcoming.length > 0 },
    { id: "premios", label: t("jump.awards"), visible: recentCeremonies.length > 0 },
    { id: "mejor-valorados", label: t("jump.topRated"), visible: explore.topRated.length > 0 },
  ].filter((item) => item.visible);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col items-start gap-12 px-4 py-12">
      {/* Solo miga de pan y título: el rótulo repetía "Explorar" y la introducción enumeraba lo que cada
          sección ya explica en su propia línea. Así la primera pantalla muestra contenido. */}
      <div className="flex w-full flex-col gap-4">
        <Breadcrumbs items={[{ label: tCommon("home"), href: "/" }, { label: t("heading") }]} />
        <h1 className="font-display text-3xl text-paper">{t("heading")}</h1>
        <ExploreJumpNav label={t("jump.label")} items={jumpItems} />
      </div>

      {/* Un solo riel (ADR 0038): las curadas a mano y las generadas por plantilla mezcladas. Cómo se mantiene
          una colección no es información para quien mira; lo que la distingue de las otras es su familia. Fila
          desplazable porque son hasta 10 y una rejilla alargaría la portada. */}
      <CollectionRail
        id="colecciones"
        heading={t("collectionsHeading")}
        description={t("collectionsDescription")}
        collections={explore.collections}
        curatorUsername={CURATOR_USERNAME}
        itemsLabel={(count) => t("collectionItems", { count })}
        familyLabel={(family) => t(`collectionFamilies.${family}`)}
        seeAll={{ href: "/explore/collections", label: t("seeAllCollections") }}
        layout="scroll"
      />

      {/* Popular ahora (openspec: explore-popular-now): justo después de Colecciones, como prueba de que hay gente usando la
          plataforma. Reemplaza al antiguo riel "Más reseñados". */}
      <PopularNow
        section={explore.popular}
        heading={t("popularHeading")}
        tabsLabel={t("popularTabsLabel")}
        tabLabels={{ albums: t("popularTabs.albums"), artists: t("popularTabs.artists"), songs: t("popularTabs.songs") }}
        windowDescription={(window) => t(`popularWindow.${window}`)}
        peopleLabel={(count) => t("popularPeople", { count })}
        categoryLabels={categoryLabels}
        artistNames={railArtistNames}
      />

      <MosaicGrid
        id="generos"
        headingId="explore-genres-heading"
        listId="explore-genre-families"
        heading={t("genresHeading")}
        description={t("genresDescription")}
        tiles={familyTiles(explore.families.filter((f) => f.tier === "main"))}
        moreTiles={familyTiles(moreFamilies)}
        moreLabel={t("moreFamilies", { count: moreFamilies.length })}
        lessLabel={t("fewerFamilies")}
      />

      {/* Décadas (openspec: redesign-explore-decades): el mismo mosaico que los géneros, sin cifras, justo después de ellos: los
          dos ejes del catálogo juntos, antes de los feeds con fecha. */}
      <MosaicGrid
        id="decadas"
        headingId="explore-decades-heading"
        listId="explore-decade-tiles"
        heading={t("decadesHeading")}
        description={t("decadesDescription")}
        tiles={decadeTiles}
        moreTiles={earlierDecadeTiles}
        moreLabel={t("earlierDecades")}
        lessLabel={t("fewerDecades")}
      />

      <AlbumRail
        layout="scroll"
        id="novedades"
        authenticated={authenticated}
        heading={t("newReleasesHeading")}
        description={t("newReleasesDescription", { days: NEW_RELEASE_WINDOW_DAYS })}
        albums={explore.newReleases}
        artistNames={railArtistNames}
        categoryLabels={categoryLabels}
        coverLabel={coverLabel}
        seeAll={{ href: "/explore?novedades=1", label: t("seeAll") }}
        dateLabels={dateLabelsFor(explore.newReleases)}
      />

      <AlbumRail
        layout="scroll"
        id="proximos"
        authenticated={authenticated}
        heading={t("upcomingHeading")}
        description={t("upcomingDescription", { days: UPCOMING_WINDOW_DAYS })}
        albums={explore.upcoming}
        artistNames={railArtistNames}
        stats={countdownsFor(explore.upcoming)}
        categoryLabels={categoryLabels}
        coverLabel={coverLabel}
        seeAll={{ href: "/explore?proximos=1", label: t("seeAll") }}
        dateLabels={dateLabelsFor(explore.upcoming)}
      />

      <AwardsExploreSection ceremonies={recentCeremonies} />

      <AlbumRail
        layout="scroll"
        id="mejor-valorados"
        authenticated={authenticated}
        heading={t("topRatedHeading")}
        description={t("topRatedDescription", { min: MIN_RATINGS_PER_ALBUM })}
        albums={explore.topRated}
        artistNames={railArtistNames}
        stats={topRatedStats}
        categoryLabels={categoryLabels}
        coverLabel={coverLabel}
      />
    </main>
  );
}
