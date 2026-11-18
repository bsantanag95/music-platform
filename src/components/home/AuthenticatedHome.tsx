import { getTranslations } from "next-intl/server";
import { CommunityActivity } from "@/components/home/CommunityActivity";
import { PublicLists } from "@/components/home/PublicLists";
import { FeedPreview } from "@/components/home/FeedPreview";
import { OnboardingPrompt } from "@/components/home/OnboardingPrompt";
import { SignedInHero } from "@/components/home/SignedInHero";
import type { OwnRating } from "@/components/home/LastTouchCard";
import { RecentSelfActivity } from "@/components/home/RecentSelfActivity";
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
  listPopularComments,
  listPublicLists,
} from "@/services/home/home";
import { listCommunityActivity } from "@/services/activity/community-activity";
import { getOwnRatingRow, knownSocialTarget } from "@/services/social";
import type { FeedComment, FeedListenEntry, FeedRating, FeedReview } from "@/services/feed/feed";

// Carga inicial de los bloques con scroll infinito ("Tu feed", "Tu rastro
// reciente"): página 1 resuelta en el servidor; el resto lo pagina
// ScrollablePreviewList contra /api/me/feed y /api/me/recent-activity.
const PREVIEW_PAGE_SIZE = 10;

interface AuthenticatedHomeProps {
  user: { id: string; username: string; displayName: string | null };
  /** El onboarding de dos puertas (`/welcome`) está pendiente para este usuario. */
  onboardingPending?: boolean;
  /** El email del usuario está verificado. */
  emailVerified?: boolean;
}

// Inicio del usuario con sesión: cabecera (saludo, «¿Qué escuchaste hoy?», accesos y «Última vez»;
// openspec: redesign-signed-in-home-phase1) + contenido propio (feed de seguidos u
// onboarding, rastro reciente, retomar lista) arriba, y los bloques de
// descubrimiento (actividad de la comunidad, listas públicas, comentarios
// populares, lanzamientos) debajo. Ver docs/05-features/home.md.
export async function AuthenticatedHome({ user, onboardingPending, emailVerified }: AuthenticatedHomeProps) {
  const tHome = await getTranslations("home");

  // Descubrimiento: bloques secundarios (van más abajo que el contenido
  // propio), en el mismo layout compacto que el Inicio anónimo — top-N corto.
  const previewLimit = 6;

  const [following, recentActivity, resumeList, communityActivity, publicLists, popularComments, homeReleases, personalReleases, , yearInvitation] =
    await Promise.all([
      listFollowing(user.id, 1, 1),
      listMyRecentActivity(user.id, 1, PREVIEW_PAGE_SIZE),
      getMostRecentEditedList(user.id),
      listCommunityActivity(user.id, 1, previewLimit).then((page) => page.entries),
      listPublicLists(user.id, previewLimit),
      listPopularComments(undefined, user.id),
      listHomeReleases(),
      listPersonalHomeReleases(user.id),
      ensureReleaseCalendarFresh(),
      // Invitación de diciembre a "Tu año en discos" (add-year-in-discs-phase3).
      yearInvitationForRequest(user.id),
    ]);

  const hasFollows = following.users.length > 0;
  const feedPreview = hasFollows
    ? await listFeed(user.id, 1, PREVIEW_PAGE_SIZE)
    : { entries: [], hasNext: false };

  // "Última vez" necesita un objetivo de catálogo enlazable (carátula +
  // título): ni "seguir a un usuario" ni "seguir a un artista" tienen uno, así
  // que se los salta para este recorte puntual sin afectar "Tu rastro
  // reciente" (que sí los muestra). Lista blanca: los kinds sin `target`
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

      {hasFollows ? (
        <FeedPreview initialEntries={feedPreview.entries} initialHasNext={feedPreview.hasNext} />
      ) : (
        <OnboardingPrompt />
      )}

      <RecentSelfActivity
        initialEntries={recentActivity.entries}
        initialHasNext={recentActivity.hasNext}
      />
      <ResumeList list={resumeList} />

      <div className="grid w-full max-w-3xl gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-start">
        <CommunityActivity entries={communityActivity} />
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
