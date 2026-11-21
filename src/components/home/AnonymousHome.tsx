import { CommunityActivity } from "@/components/home/CommunityActivity";
import { PublicLists } from "@/components/home/PublicLists";
import { AnonHero } from "@/components/home/AnonHero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { HomeReleases } from "@/components/home/HomeReleases";
import { PopularComments } from "@/components/home/PopularComments";
import { AnonCta } from "@/components/home/AnonCta";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { CollectionMosaic } from "@/components/home/CollectionMosaic";
import { PeopleCard } from "@/components/home/PeopleCard";
import { AlbumRail } from "@/components/discovery/AlbumRail";
import { getLocale, getTranslations } from "next-intl/server";
import {
  ensureReleaseCalendarFresh,
  listHomeReleases,
  listPopularComments,
  listPublicLists,
} from "@/services/home/home";
import { listCommunityActivity } from "@/services/activity/community-activity";
import { albumArtistNames, listFeaturedCollections, listTopRated } from "@/services/discovery/discovery";
import { CURATOR_USERNAME } from "@/services/discovery/constants";
import { isExploreEnabled } from "@/lib/config/discovery";
import { albumCategoryLabels, topRatedStats } from "@/components/home/top-rated";

/** Entradas de actividad en tarjetas: la primera va a lo ancho y las otras seis llenan tres filas de dos. */
export const ACTIVITY_CARD_LIMIT = 7;
/** Listas públicas en el panel lateral: prueba social, no contenido central. */
export const PUBLIC_LIST_LIMIT = 6;

// Inicio del visitante anónimo: hero (Fase 1) y, debajo, el cuerpo en el mismo contenedor ancho
// (openspec: redesign-anon-home-phase2, dirección «C · Disquería»): colecciones en mosaico y el riel de
// mejor valorados —la obra primero—, la comunidad en dos columnas como prueba social, y luego
// lanzamientos como horario, funciones y el cierre (Fase 3). Cada sección usa
// `SectionHeading`. Ver docs/05-features/home.md.
export async function AnonymousHome() {
  const [tHome, tCat, locale] = await Promise.all([
    getTranslations("home"),
    getTranslations("catalog.artist"),
    getLocale(),
  ]);
  const exploreEnabled = isExploreEnabled();

  const [
    communityActivity,
    publicLists,
    popularComments,
    homeReleases,
    topRated,
    featuredCollections,
  ] = await Promise.all([
    listCommunityActivity(null, 1, ACTIVITY_CARD_LIMIT).then((page) => page.entries),
    listPublicLists(null, PUBLIC_LIST_LIMIT),
    listPopularComments(),
    listHomeReleases(),
    listTopRated(),
    // Solo cuando /explore está habilitada: sus listas curadas enlazan a rutas
    // que, con el flag apagado, redirigen a Inicio.
    exploreEnabled ? listFeaturedCollections() : Promise.resolve([]),
    // Si el calendario de lanzamientos está vencido, se refresca después de responder.
    ensureReleaseCalendarFresh(),
  ]);

  const categoryLabels = albumCategoryLabels(tCat);

  // El riel de mejor valorados muestra el artista y el promedio de estrellas (lo que ordena el
  // ranking), como en /explore.
  const topRatedArtists = topRated.length > 0 ? await albumArtistNames(topRated.map((album) => album.id)) : {};
  const topRatedRailStats = topRatedStats(topRated, locale);

  const totalComments =
    popularComments.artist.length + popularComments["release-group"].length + popularComments.recording.length;
  const hasSideContent = totalComments > 0 || publicLists.length > 0;

  return (
    <main className="flex min-h-screen flex-col items-center gap-12 overflow-x-clip px-4 py-12">
      <AnonHero />

      <div className="flex w-full max-w-[88rem] flex-col gap-16 sm:px-4 lg:gap-24 xl:px-8">
        {/* La obra primero: cada parte colapsa por su cuenta. */}
        {featuredCollections.length > 0 ? (
          <section aria-labelledby="home-collections" className="flex flex-col gap-6">
            <SectionHeading
              id="home-collections"
              title={tHome("featuredAlbumsHeading")}
              description={tHome("featuredAlbumsDescription")}
              seeAll={{ href: "/explore/collections", label: tHome("collectionsSeeAll") }}
            />
            <CollectionMosaic
              collections={featuredCollections}
              curatorUsername={CURATOR_USERNAME}
              itemsLabel={(count) => tHome("collectionItems", { count })}
              labelledBy="home-collections"
            />
          </section>
        ) : null}

        {topRated.length > 0 ? (
          <section aria-labelledby="home-top-rated" className="flex flex-col gap-6">
            <SectionHeading
              id="home-top-rated"
              title={tHome("communityTopRatedHeading")}
              description={tHome("topRatedDescription")}
              seeAll={exploreEnabled ? { href: "/explore", label: tHome("topRatedSeeAll") } : undefined}
            />
            <AlbumRail
              heading={tHome("communityTopRatedHeading")}
              albums={topRated}
              categoryLabels={categoryLabels}
              coverLabel={tHome("albumCoverLabel")}
              layout="scroll"
              headerless
              artistNames={topRatedArtists}
              stats={topRatedRailStats}
            />
          </section>
        ) : null}

        {/* Prueba social: la actividad en la columna principal; comentarios y listas al costado. El
            acceso a personas va siempre, aunque la comunidad venga vacía. */}
        <section aria-labelledby="home-community" className="flex flex-col gap-6">
          <SectionHeading
            id="home-community"
            title={tHome("communityActivityTitle")}
            description={tHome("communityActivitySubtitle")}
            seeAll={communityActivity.length > 0 ? { href: "/activity", label: tHome("feedPreviewSeeAll") } : undefined}
          />
          <div
            className={`grid gap-6 ${
              communityActivity.length > 0 ? "lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start" : ""
            }`}
          >
            <CommunityActivity
              entries={communityActivity}
              layout="cards"
              label={tHome("communityActivityTitle")}
            />
            <div
              className={
                communityActivity.length > 0 || !hasSideContent
                  ? "flex flex-col gap-6"
                  : "grid gap-6 lg:grid-cols-2 lg:items-start"
              }
            >
              <PopularComments comments={popularComments} variant="panel" />
              <PublicLists entries={publicLists} variant="panel" />
              <PeopleCard />
            </div>
          </div>
        </section>

        {/* Cierre de la página (redesign-anon-home-phase3): lanzamientos como horario, las funciones a la
            vista y el panel final. */}
        <HomeReleases releases={homeReleases} />
        <HowItWorks />
        <AnonCta exploreEnabled={exploreEnabled} />
      </div>
    </main>
  );
}
