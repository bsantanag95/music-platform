import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requirePageUser } from "@/services/auth/page-auth";
import { listAllFollowedArtists } from "@/services/social/artist-following";
import { FollowedArtistList } from "@/components/catalog/FollowedArtistList";
import { FOLLOWED_ARTIST_SORTS, type FollowedArtistSort } from "@/components/catalog/followed-artist-filters";
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

  // Filtros de la URL (D4): un orden desconocido se ignora.
  const q = typeof params.q === "string" ? params.q : "";
  const sortParam = typeof params.sort === "string" ? params.sort : "";
  const sort = (FOLLOWED_ARTIST_SORTS as readonly string[]).includes(sortParam)
    ? (sortParam as FollowedArtistSort)
    : undefined;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:py-12">
      <Breadcrumbs items={[{ label: tCommon("home"), href: "/" }, { label: t("artistsFollowedTitle") }]} />
      <header className="-mt-2 flex flex-col gap-1 sm:-mt-4">
        <h1 className="font-display text-3xl text-paper">{t("artistsFollowedTitle")}</h1>
        {artists.length > 0 ? (
          <p className="font-body text-sm text-paper-muted">
            {t("artistsFollowed.count", { count: artists.length })}
          </p>
        ) : null}
      </header>
      <FollowedArtistList initial={artists} initialFilters={{ q, sort }} />
    </main>
  );
}
