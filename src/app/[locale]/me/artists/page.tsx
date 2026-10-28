import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requirePageUser } from "@/services/auth/page-auth";
import { listAllFollowedArtists } from "@/services/social/artist-following";
import { FollowedArtistList } from "@/components/catalog/FollowedArtistList";
import {
  FOLLOWED_ARTIST_SEGMENTS,
  FOLLOWED_ARTIST_SORTS,
  type FollowedArtistSegment,
  type FollowedArtistSort,
} from "@/components/catalog/followed-artist-filters";
import { FollowArtistButton } from "@/components/catalog/FollowArtistButton";
import { FollowedArtistReleasesRail } from "@/components/catalog/FollowedArtistReleasesRail";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("users");
  return { title: t("artistsFollowedTitle") };
}

export default async function FollowedArtistsPage({ searchParams }: { searchParams: SearchParams }) {
  const t = await getTranslations("users");
  const tCommon = await getTranslations("common");
  const user = await requirePageUser();
  const params = await searchParams;
  // Todos, no los primeros 50: la búsqueda y el orden son en memoria (refine-artists-page-phase1, D1).
  const artists = await listAllFollowedArtists(user.id);

  // Filtros de la URL (D4): un orden o segmento desconocido se ignora.
  const q = typeof params.q === "string" ? params.q : "";
  const sortParam = typeof params.sort === "string" ? params.sort : "";
  const sort = (FOLLOWED_ARTIST_SORTS as readonly string[]).includes(sortParam)
    ? (sortParam as FollowedArtistSort)
    : undefined;
  const segmentParam = typeof params.segment === "string" ? params.segment : "";
  const segment = (FOLLOWED_ARTIST_SEGMENTS as readonly string[]).includes(segmentParam)
    ? (segmentParam as FollowedArtistSegment)
    : undefined;

  // Con alguna novedad, riel "Próximos lanzamientos" desde `lg`; sin ninguna, la página conserva su ancho
  // (redesign-artists-rows, D5).
  const hasRail = artists.some((artist) => artist.news);

  return (
    <main
      className={`mx-auto flex min-h-screen w-full ${hasRail ? "max-w-6xl" : "max-w-4xl"} flex-col gap-6 px-4 py-8 sm:py-12`}
    >
      <Breadcrumbs items={[{ label: tCommon("home"), href: "/" }, { label: t("artistsFollowedTitle") }]} />
      <header className="-mt-2 flex items-start justify-between gap-4 sm:-mt-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="font-display text-3xl text-paper">{t("artistsFollowedTitle")}</h1>
          {artists.length > 0 ? (
            <p className="font-body text-sm text-paper-muted">
              {t("artistsFollowed.count", { count: artists.length })}
            </p>
          ) : null}
        </div>
        {/* Seguir sin salir de la página (redesign-artists-toolbar, D1). */}
        <FollowArtistButton />
      </header>
      <div
        className={`grid w-full grid-cols-1 gap-10 ${hasRail ? "lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-12" : ""}`}
      >
        <div className="min-w-0">
          <FollowedArtistList initial={artists} initialFilters={{ q, sort, segment }} />
        </div>
        {hasRail ? <FollowedArtistReleasesRail artists={artists} /> : null}
      </div>
    </main>
  );
}
