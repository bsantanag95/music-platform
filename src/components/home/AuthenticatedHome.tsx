import { getTranslations } from "next-intl/server";
import { CommunityActivity } from "@/components/home/CommunityActivity";
import { PublicLists } from "@/components/home/PublicLists";
import { FeedPreview } from "@/components/home/FeedPreview";
import { SignedInHero } from "@/components/home/SignedInHero";
import type { OwnRating } from "@/components/home/LastTouchCard";
import { RecentListensShelf } from "@/components/home/RecentListensShelf";
import { HomeSectionHeading } from "@/components/home/HomeSectionHeading";
import { selectHomeFeedCards } from "@/components/home/home-feed-cards";
import { ResumeList } from "@/components/home/ResumeList";
import { HomeReleases } from "@/components/home/HomeReleases";
import { PopularComments } from "@/components/home/PopularComments";
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
// Tarjetas de la comunidad cuando ocupa el lugar del feed: las mismas siete que la portada sin sesión.
const COMMUNITY_CARD_LIMIT = 7;

interface AuthenticatedHomeProps {
  user: { id: string; username: string; displayName: string | null };
  /** El onboarding de dos puertas (`/welcome`) está pendiente para este usuario. */
  onboardingPending?: boolean;
  /** El email del usuario está verificado. */
  emailVerified?: boolean;
}

// Inicio del usuario con sesión: cabecera (saludo, «¿Qué escuchaste hoy?», accesos y «Última vez»;
// openspec: redesign-signed-in-home-phase1); en el contenedor ancho, «Lo último que escuchaste» y «De
// quienes sigues» en tarjetas —o la comunidad en tarjetas si no sigue a nadie— (redesign-signed-in-home-phase2);
// debajo, retomar lista y los bloques de descubrimiento (listas públicas, comentarios populares,
// lanzamientos), que cambian en la Fase 3. Ver docs/05-features/home.md.
export async function AuthenticatedHome({ user, onboardingPending, emailVerified }: AuthenticatedHomeProps) {
  const tHome = await getTranslations("home");

  // Descubrimiento: bloques secundarios (van más abajo que el contenido
  // propio), en el mismo layout compacto que el Inicio anónimo — top-N corto.
  const previewLimit = 6;

  const [following, recentActivity, recentListens, resumeList, communityActivity, publicLists, popularComments, homeReleases, personalReleases, , yearInvitation] =
    await Promise.all([
      listFollowing(user.id, 1, 1),
      listMyRecentActivity(user.id, 1, LAST_TOUCH_SCAN),
      listMyRecentListens(user.id),
      getMostRecentEditedList(user.id),
      // Sin seguidos, la comunidad ocupa el lugar del feed en tarjetas: se pide con el límite de las tarjetas.
      listCommunityActivity(user.id, 1, COMMUNITY_CARD_LIMIT).then((page) => page.entries),
      listPublicLists(user.id, previewLimit),
      listPopularComments(undefined, user.id),
      listHomeReleases(),
      listPersonalHomeReleases(user.id),
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
      />

      {yearInvitation ? (
        <YearInvitationCard username={user.username} year={yearInvitation.year} inProgress={yearInvitation.inProgress} />
      ) : null}

      <div className="flex w-full max-w-[88rem] flex-col gap-16 sm:px-4 lg:gap-24 xl:px-8">
        <RecentListensShelf listens={recentListens} />

        {feedSelection ? (
          <FeedPreview selection={feedSelection} />
        ) : (
          // Sin seguidos: lo que se escucha en la comunidad en el lugar del feed, con la invitación a
          // seguir gente; no se repite más abajo.
          <section aria-labelledby="home-community-first" className="flex flex-col gap-6">
            <HomeSectionHeading
              id="home-community-first"
              title={tHome("communityFirstTitle")}
              description={tHome("communityFirstDescription")}
              seeAll={{ href: "/users", label: tHome("communityFirstFindPeople") }}
            />
            <CommunityActivity entries={communityActivity} layout="cards" label={tHome("communityFirstTitle")} />
          </section>
        )}
      </div>

      <ResumeList list={resumeList} />

      <div className="grid w-full max-w-3xl gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-start">
        {hasFollows ? <CommunityActivity entries={communityActivity.slice(0, previewLimit)} /> : null}
        <PublicLists entries={publicLists} />
      </div>

      <PopularComments comments={popularComments} />

      <HomeReleases releases={homeReleases} personalReleases={personalReleases} />

      {communityActivity.length === 0 && publicLists.length === 0 && (
        <p className="max-w-md text-center font-body text-sm text-paper-muted">
          {tHome("noCommunityContentYet")}
        </p>
      )}
    </main>
  );
}
