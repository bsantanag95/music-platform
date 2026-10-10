import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { AlbumRail } from "@/components/discovery/AlbumRail";
import { CollectionRail } from "@/components/discovery/CollectionRail";
import { DecadeHistogram } from "@/components/discovery/DecadeHistogram";
import { FamilyGrid, type FamilyTile } from "@/components/discovery/FamilyGrid";
import { FilteredAlbumList } from "@/components/discovery/FilteredAlbumList";
import { ApiError } from "@/lib/api/errors";
import { isExploreEnabled } from "@/lib/config/discovery";
import { genreHref } from "@/lib/catalog-links";
import { getCurrentUser } from "@/services/auth/authorization";
import { CURATOR_USERNAME, MIN_RATINGS_PER_ALBUM } from "@/services/discovery/constants";
import {
  getExplorePage,
  listAlbumsByDecade,
  listAlbumsByFamily,
  listAlbumsByGenre,
  listDecades,
  listGenreFamilies,
  type FamilyBucket,
} from "@/services/discovery/discovery";
import { exploreListHref, parseExploreListParams } from "@/services/discovery/explore-params";
import { genreDisplayName, genreLocaleOf } from "@/services/genres/names";
import type { ReleaseGroupCategory } from "@/lib/api/schemas";

interface ExplorePageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ decada?: string; familia?: string; genero?: string; tipo?: string; orden?: string; page?: string }>;
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
  const { decada, familia, genero } = raw;
  const listParams = parseExploreListParams(raw);
  const listOptions = { category: listParams.category, sort: listParams.sort };
  const numberFormat = new Intl.NumberFormat(locale);

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
        baseHref={`/explore?genero=${encodeURIComponent(result.genre?.slug ?? genero.trim())}`}
        related={result.genre ? { href: genreHref(result.genre.slug), label: t("genrePageLink", { genre }) } : undefined}
      />
    );
  }

  // --- Portada ---
  const explore = await getExplorePage();
  const familyTiles = (buckets: FamilyBucket[]): FamilyTile[] =>
    buckets.map((bucket) => ({
      key: bucket.key,
      label: tGenres(`families.${bucket.key}`),
      href: `/explore?familia=${bucket.key}`,
      count: bucket.count,
      countLabel: t("collectionItems", { count: bucket.count }),
    }));
  const moreFamilies = explore.families.filter((f) => f.tier === "more");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col items-start gap-12 px-4 py-12">
      <div className="flex w-full flex-col gap-6">
        <Breadcrumbs items={[{ label: tCommon("home"), href: "/" }, { label: t("heading") }]} />
        <header className="flex max-w-2xl flex-col gap-2">
          <p className="font-data text-xs uppercase tracking-wider text-amber">{t("kicker")}</p>
          <h1 className="font-display text-4xl text-paper">{t("heading")}</h1>
          <p className="font-body text-paper-muted">{t("intro")}</p>
        </header>
      </div>

      <CollectionRail
        heading={t("featuredHeading")}
        description={t("featuredDescription")}
        collections={explore.featured}
        curatorUsername={CURATOR_USERNAME}
        itemsLabel={(count) => t("collectionItems", { count })}
      />

      <FamilyGrid
        heading={t("genresHeading")}
        description={t("genresDescription")}
        families={familyTiles(explore.families.filter((f) => f.tier === "main"))}
        moreFamilies={familyTiles(moreFamilies)}
        moreLabel={t("moreFamilies", { count: moreFamilies.length })}
      />

      <AlbumRail
        layout="scroll"
        id="novedades"
        authenticated={authenticated}
        heading={t("newReleasesHeading")}
        description={t("newReleasesDescription")}
        albums={explore.newReleases}
        categoryLabels={categoryLabels}
        coverLabel={coverLabel}
      />

      <DecadeHistogram
        heading={t("decadesHeading")}
        description={t("decadesDescription")}
        decades={explore.decades.map((bucket) => ({
          decade: bucket.decade,
          count: bucket.count,
          href: `/explore?decada=${bucket.decade}`,
          countLabel: numberFormat.format(bucket.count),
          ariaLabel: t("decadeBarLabel", { decade: bucket.decade, count: bucket.count }),
        }))}
      />

      <AlbumRail
        layout="scroll"
        id="mejor-valorados"
        authenticated={authenticated}
        heading={t("topRatedHeading")}
        description={t("topRatedDescription", { min: MIN_RATINGS_PER_ALBUM })}
        albums={explore.topRated}
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
        categoryLabels={categoryLabels}
        coverLabel={coverLabel}
      />
    </main>
  );
}
