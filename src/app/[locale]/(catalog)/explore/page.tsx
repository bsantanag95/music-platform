import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { AlbumRail } from "@/components/discovery/AlbumRail";
import { CollectionRail } from "@/components/discovery/CollectionRail";
import { DecadeHistogram } from "@/components/discovery/DecadeHistogram";
import { FamilyGrid, type FamilyTile } from "@/components/discovery/FamilyGrid";
import { daysUntilRelease, releaseDateLabel } from "@/components/discovery/release-date-label";
import { AwardsExploreSection } from "@/components/awards/AwardsExploreSection";
import { listRecentCeremonies } from "@/services/awards/read";
import { ExploreJumpNav } from "@/components/discovery/ExploreJumpNav";
import { FilteredAlbumList } from "@/components/discovery/FilteredAlbumList";
import { ApiError } from "@/lib/api/errors";
import { isExploreEnabled } from "@/lib/config/discovery";
import { genreHref } from "@/lib/catalog-links";
import { getCurrentUser } from "@/services/auth/authorization";
import { CURATOR_USERNAME, MIN_RATINGS_PER_ALBUM, NEW_RELEASE_WINDOW_DAYS, UPCOMING_WINDOW_DAYS } from "@/services/discovery/constants";
import {
  getExplorePage,
  albumArtistNames,
  listAlbumsByDecade,
  listAlbumsByFamily,
  listAlbumsByGenre,
  listDecades,
  listNewAlbums,
  listUpcomingAlbums,
  listGenreFamilies,
  type FamilyBucket,
} from "@/services/discovery/discovery";
import { ensureCollectionsFresh } from "@/services/discovery/collections/sync";
import { exploreListHref, parseExploreListParams } from "@/services/discovery/explore-params";
import { genreDisplayName, genreLocaleOf } from "@/services/genres/names";
import type { ReleaseGroupCategory } from "@/lib/api/schemas";

interface ExplorePageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ proximos?: string; novedades?: string; decada?: string; familia?: string; genero?: string; tipo?: string; orden?: string; page?: string }>;
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
  // Separador de miles siempre: con la regla del español ("2112" pero "17.317") las cifras de una
  // misma grilla quedaban con formatos distintos.
  const numberFormat = new Intl.NumberFormat(locale, { useGrouping: "always" });

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
    const decadeLabel = Number.isInteger(decade) ? decade : decada.trim();
    // Una década mal escrita en la URL (`?decada=abc`, `?decada=1995`) muestra el estado vacío,
    // como una familia o un género desconocidos, en lugar de la pantalla de error.
    const [result, decades] = await Promise.all([
      listAlbumsByDecade(decade, listParams.page, listOptions).catch((error: unknown) => {
        if (error instanceof ApiError && error.code === "VALIDATION_ERROR") {
          return { albums: [], page: listParams.page, pageSize: 0, hasNext: false };
        }
        throw error;
      }),
      listDecades(),
    ]);
    return (
      <FilteredAlbumList
        {...listProps}
        kicker={t("kickerDecade")}
        heading={t("decadeResultsHeading", { decade: decadeLabel })}
        crumb={t("decadeChip", { decade: decadeLabel })}
        result={result}
        artistNames={await albumArtistNames(result.albums.map((album) => album.id))}
        baseHref={`/explore?decada=${decade}`}
        siblings={{
          label: t("otherDecades"),
          links: [...decades]
            .sort((a, b) => a.decade - b.decade)
            .map((bucket) => ({
              key: String(bucket.decade),
              label: t("decadeChip", { decade: bucket.decade }),
              href: exploreListHref(`/explore?decada=${bucket.decade}`, listParams, { page: 1 }),
              current: bucket.decade === decade,
            })),
        }}
      />
    );
  }
  if (familia !== undefined) {
    const [result, families] = await Promise.all([
      listAlbumsByFamily(familia, listParams.page, listOptions),
      listGenreFamilies(),
    ]);
    const family = result.family ? tGenres(`families.${result.family}`) : familia.trim();
    return (
      <FilteredAlbumList
        {...listProps}
        kicker={t("kickerFamily")}
        heading={t("familyResultsHeading", { family })}
        crumb={family}
        result={result}
        artistNames={await albumArtistNames(result.albums.map((album) => album.id))}
        baseHref={`/explore?familia=${encodeURIComponent(result.family ?? familia.trim())}`}
        siblings={{
          label: t("otherFamilies"),
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
        kicker={t("kickerGenre")}
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
        kicker={t("kickerReleases")}
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
        kicker={t("kickerReleases")}
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
    listRecentCeremonies(5),
    ensureCollectionsFresh(),
  ]);
  const railArtistNames = await albumArtistNames(
    [explore.newReleases, explore.upcoming, explore.topRated, explore.mostReviewed].flat().map((album) => album.id),
  );
  const starsFormat = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  // Cifra que ubica a cada disco en su riel, sobre la carátula: el promedio en "Mejor valorados", las reseñas
  // en "Más reseñados".
  const topRatedStats = Object.fromEntries(explore.topRated.map((album) => [album.id, `★ ${starsFormat.format(album.avgStars)}`]));
  const mostReviewedStats = Object.fromEntries(
    explore.mostReviewed.map((album) => [album.id, t("reviewCount", { count: album.reviewCount })]),
  );
  const familyTiles = (buckets: FamilyBucket[]): FamilyTile[] =>
    buckets.map((bucket) => ({
      key: bucket.key,
      label: tGenres(`families.${bucket.key}`),
      href: `/explore?familia=${bucket.key}`,
      count: bucket.count,
      countLabel: t("albumCount", { count: bucket.count, formatted: numberFormat.format(bucket.count) }),
    }));
  const moreFamilies = explore.families.filter((f) => f.tier === "more");
  // Navegación rápida: una entrada por cada sección que se renderiza (mismos datos que cada sección usa para omitirse),
  // en el orden de la página.
  const jumpItems = [
    { id: "colecciones", label: t("jump.collections"), visible: explore.collections.length > 0 },
    { id: "generos", label: t("jump.genres"), visible: explore.families.length > 0 },
    { id: "novedades", label: t("jump.newReleases"), visible: explore.newReleases.length > 0 },
    { id: "proximos", label: t("jump.upcoming"), visible: explore.upcoming.length > 0 },
    { id: "premios", label: t("jump.awards"), visible: recentCeremonies.length > 0 },
    { id: "mejor-valorados", label: t("jump.topRated"), visible: explore.topRated.length > 0 },
    { id: "mas-resenados", label: t("jump.mostReviewed"), visible: explore.mostReviewed.length > 0 },
    { id: "decadas", label: t("jump.decades"), visible: explore.decades.length > 0 },
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

      <FamilyGrid
        heading={t("genresHeading")}
        description={t("genresDescription")}
        families={familyTiles(explore.families.filter((f) => f.tier === "main"))}
        moreFamilies={familyTiles(moreFamilies)}
        moreLabel={t("moreFamilies", { count: moreFamilies.length })}
        lessLabel={t("fewerFamilies")}
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

      <AlbumRail
        layout="scroll"
        id="mas-resenados"
        authenticated={authenticated}
        heading={t("mostReviewedHeading")}
        description={t("mostReviewedDescription")}
        albums={explore.mostReviewed}
        artistNames={railArtistNames}
        stats={mostReviewedStats}
        categoryLabels={categoryLabels}
        coverLabel={coverLabel}
      />

      <DecadeHistogram
        heading={t("decadesHeading")}
        description={t("decadesDescription")}
        earlierLabel={t("decadesEarlier")}
        decades={explore.decades.map((bucket) => ({
          decade: bucket.decade,
          count: bucket.count,
          href: `/explore?decada=${bucket.decade}`,
          countLabel: numberFormat.format(bucket.count),
          ariaLabel: t("decadeBarLabel", {
            decade: bucket.decade,
            count: bucket.count,
            formatted: numberFormat.format(bucket.count),
          }),
        }))}
      />
    </main>
  );
}
