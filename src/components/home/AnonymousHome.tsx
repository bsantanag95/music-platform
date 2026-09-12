import { CommunityActivity } from "@/components/home/CommunityActivity";
import { PublicLists } from "@/components/home/PublicLists";
import { AnonHero } from "@/components/home/AnonHero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { HomeReleases } from "@/components/home/HomeReleases";
import { PopularComments } from "@/components/home/PopularComments";
import { AnonCta } from "@/components/home/AnonCta";
import { CollectionRail } from "@/components/discovery/CollectionRail";
import { AlbumRail } from "@/components/discovery/AlbumRail";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import {
  listHomeReleases,
  listPopularComments,
  listPublicLists,
  listRecentCoverArt,
} from "@/services/home/home";
import { listCommunityActivity } from "@/services/activity/community-activity";
import { listFeaturedCollections, listTopRated } from "@/services/discovery/discovery";
import { CURATOR_USERNAME } from "@/services/discovery/constants";
import { isExploreEnabled } from "@/lib/config/discovery";
import type { ReleaseGroupCategory } from "@/lib/api/schemas";

// Inicio del visitante anónimo: hero visual + propuesta de valor (el álbum como
// obra) + un bloque editorial de álbumes que asoma /explore, con los bloques de
// la comunidad como prueba social debajo, el carrusel de funcionalidades y el
// CTA de registro. Ver docs/05-features/home.md.
export async function AnonymousHome() {
  const [t, tHome, tCat] = await Promise.all([
    getTranslations("common"),
    getTranslations("home"),
    getTranslations("catalog.artist"),
  ]);
  // Prueba social, no contenido central: top-N más corto y layout compacto.
  const previewLimit = 6;
  const exploreEnabled = isExploreEnabled();

  const [
    communityActivity,
    publicLists,
    recentCoverArt,
    popularComments,
    homeReleases,
    topRated,
    featuredCollections,
  ] = await Promise.all([
    listCommunityActivity(null, 1, previewLimit).then((page) => page.entries),
    listPublicLists(null, previewLimit),
    listRecentCoverArt(),
    listPopularComments(),
    listHomeReleases(),
    listTopRated(),
    // Solo cuando /explore está habilitada: sus listas curadas enlazan a rutas
    // que, con el flag apagado, redirigen a Inicio.
    exploreEnabled ? listFeaturedCollections() : Promise.resolve([]),
  ]);

  const heroCovers = Array.from(
    new Set([
      ...recentCoverArt,
      ...communityActivity
        .map((entry) => entry.target.coverThumbUrl)
        .filter((url): url is string => Boolean(url)),
    ]),
  );

  const categoryLabels = {
    studio: tCat("categories.studio"),
    single_ep: tCat("categories.single_ep"),
    compilation: tCat("categories.compilation"),
    live_other: tCat("categories.live_other"),
  } satisfies Record<ReleaseGroupCategory, string>;

  return (
    <main className="flex min-h-screen flex-col items-center gap-12 overflow-x-clip px-4 py-12">
      <AnonHero covers={heroCovers} />

      {/* Bloque editorial de álbumes: la obra primero, la prueba social después.
          Cada riel colapsa por su cuenta; si ambos vienen vacíos no hay bloque. */}
      {(featuredCollections.length > 0 || topRated.length > 0) && (
        <div className="flex w-full max-w-3xl flex-col gap-10">
          <CollectionRail
            heading={tHome("featuredAlbumsHeading")}
            collections={featuredCollections}
            curatorUsername={CURATOR_USERNAME}
            itemsLabel={(count) => tHome("collectionItems", { count })}
          />
          <AlbumRail
            heading={tHome("communityTopRatedHeading")}
            albums={topRated}
            categoryLabels={categoryLabels}
            coverLabel={tHome("albumCoverLabel")}
          />
        </div>
      )}

      <div className="grid w-full max-w-3xl gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <CommunityActivity entries={communityActivity} />
        <PublicLists entries={publicLists} />
      </div>

      <Link
        href="/users"
        className="rounded-md border border-ink-border px-4 py-2 font-data text-sm text-paper transition-colors hover:border-amber hover:text-amber"
      >
        {t("users")}
      </Link>

      <PopularComments comments={popularComments} />

      <HomeReleases releases={homeReleases} />

      <HowItWorks />
      <AnonCta />
    </main>
  );
}
