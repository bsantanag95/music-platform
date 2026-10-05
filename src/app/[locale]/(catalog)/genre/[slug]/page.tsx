import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { GenreAbout } from "@/components/genres/page/GenreAbout";
import { GenreHeader } from "@/components/genres/page/GenreHeader";
import { GenreMoveButton } from "@/components/genres/page/GenreMoveButton";
import {
  GenreAlbumsSection,
  GenreArtistsPreviewSection,
  GenreArtistsSection,
  GenreDecadesSection,
  GenreEssentialsSection,
  GenreFootprintSection,
  GenreListsPreviewSection,
  GenreListsSection,
  GenreNewReleasesSection,
  GenreReviewsSection,
} from "@/components/genres/page/GenrePageSections";
import { GenreStatsLine } from "@/components/genres/page/GenreStatsLine";
import { GenreTabs } from "@/components/genres/page/GenreTabs";
import { GenreTree } from "@/components/genres/page/GenreTree";
import { Skeleton } from "@/components/ui/Skeleton";
import type { ReleaseGroupCategory } from "@/lib/api/schemas";
import { localeHref } from "@/lib/catalog-links";
import { getCurrentUser } from "@/services/auth/authorization";
import { getGenreAbout } from "@/services/genres/about";
import { scheduleGenreAboutSync } from "@/services/genres/about-schedule";
import { genreDisplayName, genreLocaleOf } from "@/services/genres/names";
import { getGenrePage } from "@/services/genres/page";
import { getMovedByCount, isGenreInIdentity } from "@/services/genres/personal";
import { parseGenreParams, type RawSearchParams } from "@/services/genres/page-params";
import { findStyleGenreBySlug } from "@/services/genres/read";
import { getGenreStats } from "@/services/genres/stats";

interface GenrePageProps {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<RawSearchParams>;
}

export async function generateMetadata({ params }: GenrePageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const genre = await findStyleGenreBySlug(slug);
  if (!genre) return {};
  const t = await getTranslations("catalog.genres.page");
  return { title: t("pageTitle", { genre: genreDisplayName(genre, genreLocaleOf(locale)) }) };
}

function RailFallback({ label }: { label: string }) {
  return <Skeleton className="h-56 w-full" ariaLabel={label} />;
}

// Página de un género (openspec: show-genres y redesign-genre-page, capabilities `genre-pages`,
// `genre-page-overview` y `genre-page-catalog`): cabecera fija y pestañas por `?tab=` (Resumen,
// Álbumes, Artistas, Listas). El slug es el guardado en la taxonomía (ADR 0023): sin id; un slug con
// mayúsculas redirige (308) al canónico y uno desconocido o que no es un estilo visible da 404. Los
// parámetros inválidos nunca rompen la página: caen al predeterminado.
export default async function GenrePage({ params, searchParams }: GenrePageProps) {
  const { locale, slug } = await params;
  const decoded = decodeURIComponent(slug);
  if (decoded !== decoded.toLowerCase()) {
    permanentRedirect(localeHref(locale, `/genre/${encodeURIComponent(decoded.toLowerCase())}`));
  }

  const data = await getGenrePage(decoded, genreLocaleOf(locale));
  if (!data) notFound();
  const query = parseGenreParams(await searchParams);

  const user = await getCurrentUser();
  // El texto de Wikipedia se sincroniza después de responder (ADR 0027): la primera visita sale sin él.
  scheduleGenreAboutSync(data.genre);
  const [stats, about, movedBy, declared, tExplore, tCat, tPage] = await Promise.all([
    getGenreStats(data.genre.id),
    getGenreAbout(data.genre.id, genreLocaleOf(locale)),
    getMovedByCount(data.genre.slug),
    user ? isGenreInIdentity(user.id, data.genre.slug) : Promise.resolve(false),
    getTranslations("catalog.explore"),
    getTranslations("catalog.artist"),
    getTranslations("catalog.genres.page"),
  ]);
  const authenticated = user !== null;
  const hasMusic = stats.albumCount > 0 || stats.artistCount > 0;
  const categoryLabels = {
    studio: tCat("categories.studio"),
    single_ep: tCat("categories.single_ep"),
    compilation: tCat("categories.compilation"),
    live_other: tCat("categories.live_other"),
  } satisfies Record<ReleaseGroupCategory, string>;
  const context = {
    data,
    params: query,
    categoryLabels,
    coverLabel: tExplore("albumCoverLabel"),
    authenticated,
    readerId: user?.id ?? null,
  };
  const name = genreDisplayName(data.genre, genreLocaleOf(locale));
  const fallbackLabel = tPage("loading");

  const tree = <GenreTree name={name} parents={data.parents} subgenres={data.children} related={data.related} />;

  return (
    <main className="flex min-h-screen w-full flex-col items-start gap-6 px-4 py-12">
      <GenreHeader
        name={name}
        families={data.families}
        stats={<GenreStatsLine stats={stats} movedBy={movedBy} />}
        actions={authenticated ? <GenreMoveButton slug={data.genre.slug} initialDeclared={declared} /> : undefined}
      />

      {!hasMusic ? (
        <>
          {tree}
          <p className="font-body text-paper-muted">{tPage("empty")}</p>
        </>
      ) : (
        <>
          <GenreTabs slug={data.genre.slug} params={query} />
          {query.tab === "albums" && (
            <Suspense fallback={<RailFallback label={fallbackLabel} />}>
              <GenreAlbumsSection {...context} locale={locale} />
            </Suspense>
          )}
          {query.tab === "artists" && (
            <Suspense fallback={<RailFallback label={fallbackLabel} />}>
              <GenreArtistsSection data={data} params={query} />
            </Suspense>
          )}
          {query.tab === "lists" && (
            <Suspense fallback={<RailFallback label={fallbackLabel} />}>
              <GenreListsSection {...context} />
            </Suspense>
          )}
          {query.tab === "overview" && (
            <div className="grid w-full gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <div className="flex min-w-0 flex-col gap-8">
                <GenreAbout about={about} />
                <Suspense fallback={<RailFallback label={fallbackLabel} />}>
                  <GenreEssentialsSection {...context} />
                </Suspense>
                <Suspense fallback={<RailFallback label={fallbackLabel} />}>
                  <GenreNewReleasesSection {...context} />
                </Suspense>
                <Suspense fallback={<RailFallback label={fallbackLabel} />}>
                  <GenreArtistsPreviewSection data={data} params={query} />
                </Suspense>
                <Suspense fallback={<RailFallback label={fallbackLabel} />}>
                  <GenreListsPreviewSection {...context} />
                </Suspense>
                <Suspense fallback={<RailFallback label={fallbackLabel} />}>
                  <GenreReviewsSection {...context} />
                </Suspense>
              </div>
              <aside className="flex flex-col gap-4">
                {authenticated && (
                  <Suspense fallback={null}>
                    <GenreFootprintSection {...context} />
                  </Suspense>
                )}
                {tree}
                <Suspense fallback={null}>
                  <GenreDecadesSection data={data} params={query} />
                </Suspense>
              </aside>
            </div>
          )}
        </>
      )}
    </main>
  );
}
