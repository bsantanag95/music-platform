import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { GenrePageView } from "@/components/genres/GenrePageView";
import { localeHref } from "@/lib/catalog-links";
import { getCurrentUser } from "@/services/auth/authorization";
import { listAlbumsByGenre } from "@/services/discovery/discovery";
import { genreDisplayName, genreLocaleOf } from "@/services/genres/names";
import { findStyleGenreBySlug } from "@/services/genres/read";
import { getGenrePage } from "@/services/genres/page";
import type { ReleaseGroupCategory } from "@/lib/api/schemas";

interface GenrePageProps {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

function parsePage(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

export async function generateMetadata({ params }: GenrePageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const genre = await findStyleGenreBySlug(slug);
  if (!genre) return {};
  const t = await getTranslations("catalog.genres.page");
  return { title: t("pageTitle", { genre: genreDisplayName(genre, genreLocaleOf(locale)) }) };
}

// Página de un género (openspec: show-genres, capability `genre-pages`): relaciones, artistas y
// álbumes del género y de sus subgéneros. El slug es el guardado en la taxonomía (ADR 0023): sin
// id; un slug con mayúsculas redirige (308) al canónico y uno desconocido o que no es un estilo
// visible da 404.
export default async function GenrePage({ params, searchParams }: GenrePageProps) {
  const { locale, slug } = await params;
  const { page: rawPage } = await searchParams;
  const decoded = decodeURIComponent(slug);
  if (decoded !== decoded.toLowerCase()) {
    permanentRedirect(localeHref(locale, `/genre/${encodeURIComponent(decoded.toLowerCase())}`));
  }

  const data = await getGenrePage(decoded);
  if (!data) notFound();
  const page = parsePage(rawPage);
  const albums = await listAlbumsByGenre(data.genre.slug, page);

  const t = await getTranslations("catalog.explore");
  const tCommon = await getTranslations("common");
  const tCat = await getTranslations("catalog.artist");
  const categoryLabels = {
    studio: tCat("categories.studio"),
    single_ep: tCat("categories.single_ep"),
    compilation: tCat("categories.compilation"),
    live_other: tCat("categories.live_other"),
  } satisfies Record<ReleaseGroupCategory, string>;
  const authenticated = (await getCurrentUser()) !== null;

  return (
    <GenrePageView
      name={genreDisplayName(data.genre, genreLocaleOf(locale))}
      families={data.families}
      parents={data.parents}
      subgenres={data.children}
      related={data.related}
      artists={data.artists}
      albums={albums.albums}
      page={albums.page}
      hasNext={albums.hasNext}
      baseHref={`/genre/${data.genre.slug}`}
      categoryLabels={categoryLabels}
      coverLabel={t("albumCoverLabel")}
      authenticated={authenticated}
      labels={{ home: tCommon("home"), explore: t("navLabel"), prev: t("prevPage"), next: t("nextPage") }}
    />
  );
}
