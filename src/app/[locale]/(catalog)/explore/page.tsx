import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { AlbumRail } from "@/components/discovery/AlbumRail";
import { CollectionRail } from "@/components/discovery/CollectionRail";
import { BrowseChips } from "@/components/discovery/BrowseChips";
import { FilteredAlbumList } from "@/components/discovery/FilteredAlbumList";
import { isExploreEnabled } from "@/lib/config/discovery";
import { CURATOR_USERNAME } from "@/services/discovery/constants";
import {
  getExplorePage,
  listAlbumsByDecade,
  listAlbumsByGenre,
} from "@/services/discovery/discovery";
import type { ReleaseGroupCategory } from "@/lib/api/schemas";

interface ExplorePageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ decada?: string; genero?: string; page?: string }>;
}

export async function generateMetadata({ params }: ExplorePageProps): Promise<Metadata> {
  await params;
  const t = await getTranslations("catalog.explore");
  return { title: t("pageTitle") };
}

function parsePage(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

export default async function ExplorePage({ params, searchParams }: ExplorePageProps) {
  const { locale } = await params;
  if (!isExploreEnabled()) redirect({ href: "/", locale });

  const t = await getTranslations("catalog.explore");
  const tCommon = await getTranslations("common");
  const tCat = await getTranslations("catalog.artist");
  const { decada, genero, page: rawPage } = await searchParams;

  const categoryLabels = {
    studio: tCat("categories.studio"),
    single_ep: tCat("categories.single_ep"),
    compilation: tCat("categories.compilation"),
    live_other: tCat("categories.live_other"),
  } satisfies Record<ReleaseGroupCategory, string>;
  const coverLabel = t("albumCoverLabel");

  // --- Vista filtrada: un corte a la vez, década tiene prioridad ---
  if (decada !== undefined) {
    const decade = Number(decada);
    const result = await listAlbumsByDecade(decade, parsePage(rawPage));
    return (
      <FilteredAlbumList
        heading={t("decadeResultsHeading", { decade })}
        result={result}
        baseHref={`/explore?decada=${decade}`}
        categoryLabels={categoryLabels}
        coverLabel={coverLabel}
        emptyMessage={t("emptyFiltered")}
        prevLabel={t("prevPage")}
        nextLabel={t("nextPage")}
        backLabel={t("backToExplore")}
      />
    );
  }
  if (genero !== undefined) {
    const genre = genero.trim();
    const result = await listAlbumsByGenre(genre, parsePage(rawPage));
    return (
      <FilteredAlbumList
        heading={t("genreResultsHeading", { genre })}
        result={result}
        baseHref={`/explore?genero=${encodeURIComponent(genre)}`}
        categoryLabels={categoryLabels}
        coverLabel={coverLabel}
        emptyMessage={t("emptyFiltered")}
        prevLabel={t("prevPage")}
        nextLabel={t("nextPage")}
        backLabel={t("backToExplore")}
      />
    );
  }

  // --- Portada ---
  const explore = await getExplorePage();

  return (
    <main className="flex min-h-screen w-full flex-col items-start gap-10 px-4 py-12">
      <Breadcrumbs items={[{ label: tCommon("home"), href: "/" }, { label: t("heading") }]} />
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl text-paper">{t("heading")}</h1>
        <p className="font-body text-paper-muted">{t("intro")}</p>
      </div>

      <CollectionRail
        heading={t("featuredHeading")}
        collections={explore.featured}
        curatorUsername={CURATOR_USERNAME}
        itemsLabel={(count) => t("collectionItems", { count })}
      />

      <AlbumRail
        heading={t("newReleasesHeading")}
        albums={explore.newReleases}
        categoryLabels={categoryLabels}
        coverLabel={coverLabel}
      />

      <BrowseChips
        heading={t("decadesHeading")}
        chips={explore.decades.map((bucket) => ({
          label: t("decadeChip", { decade: bucket.decade }),
          href: `/explore?decada=${bucket.decade}`,
        }))}
      />

      <BrowseChips
        heading={t("genresHeading")}
        chips={explore.genres.map((bucket) => ({
          label: bucket.tag,
          href: `/explore?genero=${encodeURIComponent(bucket.tag)}`,
        }))}
      />

      <AlbumRail
        heading={t("topRatedHeading")}
        albums={explore.topRated}
        categoryLabels={categoryLabels}
        coverLabel={coverLabel}
      />

      <AlbumRail
        heading={t("mostReviewedHeading")}
        albums={explore.mostReviewed}
        categoryLabels={categoryLabels}
        coverLabel={coverLabel}
      />
    </main>
  );
}
