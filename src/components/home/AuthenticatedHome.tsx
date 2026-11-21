import { getLocale, getTranslations } from "next-intl/server";
import { CommunityActivity } from "@/components/home/CommunityActivity";
import { PublicLists } from "@/components/home/PublicLists";
import { FeedPreview } from "@/components/home/FeedPreview";
import { SignedInHero } from "@/components/home/SignedInHero";
import type { OwnRating } from "@/components/home/LastTouchCard";
import { RecentListensShelf } from "@/components/home/RecentListensShelf";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { selectHomeFeedCards } from "@/components/home/home-feed-cards";
import { ResumeList } from "@/components/home/ResumeList";
import { HomeReleases } from "@/components/home/HomeReleases";
import { PopularComments } from "@/components/home/PopularComments";
import { PeopleCard } from "@/components/home/PeopleCard";
import { CollectionMosaic } from "@/components/home/CollectionMosaic";
import { albumCategoryLabels, topRatedStats } from "@/components/home/top-rated";
import { AlbumRail } from "@/components/discovery/AlbumRail";
import { albumArtistNames, listFeaturedCollections, listTopRated } from "@/services/discovery/discovery";
import { CURATOR_USERNAME } from "@/services/discovery/constants";
import { isExploreEnabled } from "@/lib/config/discovery";
import { YearInvitationCard } from "@/components/laminas/YearInvitationCard";
import { yearInvitationForRequest } from "@/lib/year-invitation-request";
import { listFollowing } from "@/services/social/following";
import { listFeed } from "@/services/feed/feed";
import {
  getMostRecentEditedList,
  ensureReleaseCalendarFresh,
  listHomeReleases,
  listPersonalHomeReleases,
  listMyRecentActivity,
  listMyBackdropAlbums,
  listMyRecentListens,
  listPopularComments,
  listPublicLists,
} from "@/services/home/home";
import { listCommunityActivity } from "@/services/activity/community-activity";
import { getOwnRatingRow, knownSocialTarget } from "@/services/social";
import type { FeedComment, FeedListenEntry, FeedRating, FeedReview } from "@/services/feed/feed";

// Entradas de tu rastro que se leen para «Última vez» (la primera con objetivo de catálogo).
const LAST_TOUCH_SCAN = 10;
// Página del feed para llenar las tarjetas de «De quienes sigues»: los eventos de poco valor no ocupan
// tarjeta, así que se pide más de lo que se muestra (openspec: redesign-signed-in-home-phase2).
const FEED_CARDS_SCAN = 30;
// Tarjetas de la comunidad (arriba sin seguidos, abajo con seguidos): las mismas siete que la portada.
const COMMUNITY_CARD_LIMIT = 7;
// Listas públicas en su panel lateral, como en la portada.
const PUBLIC_LIST_LIMIT = 6;

interface AuthenticatedHomeProps {
  user: { id: string; username: string; displayName: string | null };
  /** El onboarding de dos puertas (`/welcome`) está pendiente para este usuario. */
  onboardingPending?: boolean;
  /** El email del usuario está verificado. */
  emailVerified?: boolean;
}

// Inicio del usuario con sesión (rediseño en tres fases, ver docs/05-features/home.md): cabecera con el
// saludo, «¿Qué escuchaste hoy?», accesos y «Última vez» (redesign-signed-in-home-phase1); en el contenedor
// ancho, «Lo último que escuchaste» con la fila de retomar lista y «De quienes sigues» en tarjetas —o la
// comunidad en tarjetas si no sigue a nadie— (phase2); y lanzamientos como horario, colecciones curadas,
// «Mejor valorados» solo para una cuenta sin actividad y «La comunidad» sin la actividad propia (phase3).
export async function AuthenticatedHome({ user, onboardingPending, emailVerified }: AuthenticatedHomeProps) {
  const [tHome, tCat, locale] = await Promise.all([
    getTranslations("home"),
    getTranslations("catalog.artist"),
    getLocale(),
  ]);
  const exploreEnabled = isExploreEnabled();

  const [following, recentActivity, recentListens, backdropAlbums, resumeList, communityActivity, publicLists, popularComments, homeReleases, personalReleases, featuredCollections, , yearInvitation] =
    await Promise.all([
      listFollowing(user.id, 1, 1),
      listMyRecentActivity(user.id, 1, LAST_TOUCH_SCAN),
      listMyRecentListens(user.id),
      // Fondo de la cabecera con tus álbumes (personalize-signed-in-hero-backdrop).
      listMyBackdropAlbums(user.id),
      getMostRecentEditedList(user.id),
      // Sin la actividad propia: Inicio ya la muestra en sus bloques (redesign-signed-in-home-phase3).
      listCommunityActivity(user.id, 1, COMMUNITY_CARD_LIMIT, { excludeViewer: true }).then((page) => page.entries),
      listPublicLists(user.id, PUBLIC_LIST_LIMIT),
      listPopularComments(undefined, user.id),
      listHomeReleases(),
      listPersonalHomeReleases(user.id),
      // Solo con /explore habilitada: sus listas curadas enlazan a rutas que, apagado, redirigen a Inicio.
      exploreEnabled ? listFeaturedCollections() : Promise.resolve([]),
      ensureReleaseCalendarFresh(),
      // Invitación de diciembre a "Tu año en discos" (add-year-in-discs-phase3).
      yearInvitationForRequest(user.id),
    ]);

  const hasFollows = following.users.length > 0;
  const feedSelection = hasFollows
    ? selectHomeFeedCards((await listFeed(user.id, 1, FEED_CARDS_SCAN)).entries)
    : null;

  // "Última vez" necesita un objetivo de catálogo enlazable (carátula +
  // título): ni "seguir a un usuario" ni "seguir a un artista" tienen uno, así
  // que se los salta para este recorte puntual sin afectar al rastro
  // completo de `/me/diary` (que sí los muestra). Lista blanca: los kinds sin `target`
  // (camino, list, favorite, etc.) rompían el panel al ser el más reciente.
  const lastTouch =
    recentActivity.entries.find(
      (entry): entry is FeedListenEntry | FeedRating | FeedComment | FeedReview =>
        entry.kind === "listen" ||
        entry.kind === "rating" ||
        entry.kind === "comment" ||
        entry.kind === "review",
    ) ?? null;

  // «Mejor valorados» solo para una cuenta sin actividad (misma condición que la bienvenida de la cabecera):
  // le da discos por donde empezar; con uso ya tiene su estante y su feed.
  const isNewAccount = lastTouch === null;
  const topRated = isNewAccount ? await listTopRated() : [];
  const topRatedArtists = topRated.length > 0 ? await albumArtistNames(topRated.map((album) => album.id)) : {};

  // Tu valoración del objetivo de «Última vez», en forma de fila: si la entrada ya es una
  // valoración trae sus datos; si no, una consulta por el índice único (usuario, objetivo).
  let ownRating: OwnRating | null = null;
  if (lastTouch?.kind === "rating") {
    ownRating = { stars: lastTouch.stars, detailedScore: lastTouch.detailedScore };
  } else if (lastTouch) {
    const row = await getOwnRatingRow(knownSocialTarget(lastTouch.target.type, lastTouch.target.id), user.id);
    ownRating = row ? { stars: String(row.stars), detailedScore: row.detailedScore } : null;
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-12 overflow-x-clip px-4 py-12">
      <SignedInHero
        name={user.displayName ?? `@${user.username}`}
        username={user.username}
        lastTouch={lastTouch}
        ownRating={ownRating}
        onboardingPending={onboardingPending ?? false}
        emailVerified={emailVerified ?? false}
        backdropAlbums={backdropAlbums}
      />

      {yearInvitation ? (
        <YearInvitationCard username={user.username} year={yearInvitation.year} inProgress={yearInvitation.inProgress} />
      ) : null}

      <div className="flex w-full max-w-[88rem] flex-col gap-16 sm:px-4 lg:gap-24 xl:px-8">
        {recentListens.length > 0 ? (
          <RecentListensShelf listens={recentListens} footer={<ResumeList list={resumeList} variant="row" />} />
        ) : (
          <ResumeList list={resumeList} />
        )}

        {feedSelection ? (
          <FeedPreview selection={feedSelection} />
        ) : (
          // Sin seguidos: lo que se escucha en la comunidad en el lugar del feed, con la invitación a
          // seguir gente; no se repite más abajo.
          <section aria-labelledby="home-community-first" className="flex flex-col gap-6">
            <SectionHeading
              id="home-community-first"
              title={tHome("communityFirstTitle")}
              description={tHome("communityFirstDescription")}
              seeAll={{ href: "/users", label: tHome("communityFirstFindPeople") }}
            />
            <CommunityActivity entries={communityActivity} layout="cards" label={tHome("communityFirstTitle")} />
          </section>
        )}

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
              categoryLabels={albumCategoryLabels(tCat)}
              coverLabel={tHome("albumCoverLabel")}
              layout="scroll"
              headerless
              artistNames={topRatedArtists}
              stats={topRatedStats(topRated, locale)}
            />
          </section>
        ) : null}

        <HomeReleases releases={homeReleases} personalReleases={personalReleases} />

        {featuredCollections.length > 0 ? (
          <section aria-labelledby="home-collections" className="flex flex-col gap-6">
            <SectionHeading
              id="home-collections"
              title={tHome("collectionsSignedInTitle")}
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

        {/* La comunidad como en la portada: con seguidos, la actividad en tarjetas (2/3) y los paneles al
            costado; sin seguidos las tarjetas ya están arriba y quedan solo los paneles. */}
        <section aria-labelledby="home-community" className="flex flex-col gap-6">
          <SectionHeading
            id="home-community"
            title={tHome("communityActivityTitle")}
            description={tHome("communityActivitySubtitle")}
            seeAll={{ href: "/activity", label: tHome("feedPreviewSeeAll") }}
          />
          {hasFollows && communityActivity.length > 0 ? (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
              <CommunityActivity entries={communityActivity} layout="cards" label={tHome("communityActivityTitle")} />
              <div className="flex flex-col gap-6">
                <PopularComments comments={popularComments} variant="panel" />
                <PublicLists entries={publicLists} variant="panel" />
                <PeopleCard />
              </div>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
              <PopularComments comments={popularComments} variant="panel" />
              <PublicLists entries={publicLists} variant="panel" />
              <PeopleCard />
            </div>
          )}
          {communityActivity.length === 0 && publicLists.length === 0 ? (
            <p className="font-body text-sm text-paper-muted">{tHome("noCommunityContentYet")}</p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
