import { getTranslations } from "next-intl/server";
import { CommunityActivity } from "@/components/home/CommunityActivity";
import { PublicLists } from "@/components/home/PublicLists";
import { FeedPreview } from "@/components/home/FeedPreview";
import { OnboardingPrompt } from "@/components/home/OnboardingPrompt";
import { QuickLinks } from "@/components/home/QuickLinks";
import { Greeting } from "@/components/home/Greeting";
import { RecentSelfActivity } from "@/components/home/RecentSelfActivity";
import { ResumeList } from "@/components/home/ResumeList";
import { HomeReleases } from "@/components/home/HomeReleases";
import { PopularComments } from "@/components/home/PopularComments";
import { listFollowing } from "@/services/social/following";
import { listFeed } from "@/services/feed/feed";
import {
  getMostRecentEditedList,
  listCommunityActivity,
  listHomeReleases,
  listMyRecentActivity,
  listPopularComments,
  listPublicLists,
} from "@/services/home/home";

// Carga inicial de los bloques con scroll infinito ("Tu feed", "Tu rastro
// reciente"): página 1 resuelta en el servidor; el resto lo pagina
// ScrollablePreviewList contra /api/me/feed y /api/me/recent-activity.
const PREVIEW_PAGE_SIZE = 10;

interface AuthenticatedHomeProps {
  user: { id: string; username: string; displayName: string | null };
}

// Inicio del usuario con sesión: saludo + contenido propio (feed de seguidos u
// onboarding, rastro reciente, retomar lista) arriba, y los bloques de
// descubrimiento (actividad de la comunidad, listas públicas, comentarios
// populares, lanzamientos) debajo. Ver docs/05-features/home.md.
export async function AuthenticatedHome({ user }: AuthenticatedHomeProps) {
  const [t, tHome] = await Promise.all([
    getTranslations("common"),
    getTranslations("home"),
  ]);

  // Descubrimiento: bloques secundarios (van más abajo que el contenido
  // propio), en el mismo layout compacto que el Inicio anónimo — top-N corto.
  const previewLimit = 6;

  const [following, recentActivity, resumeList, communityActivity, publicLists, popularComments, homeReleases] =
    await Promise.all([
      listFollowing(user.id, 1, 1),
      listMyRecentActivity(user.id, 1, PREVIEW_PAGE_SIZE),
      getMostRecentEditedList(user.id),
      listCommunityActivity(user.id, previewLimit),
      listPublicLists(user.id, previewLimit),
      listPopularComments(),
      listHomeReleases(),
    ]);

  const hasFollows = following.users.length > 0;
  const feedPreview = hasFollows
    ? await listFeed(user.id, 1, PREVIEW_PAGE_SIZE)
    : { entries: [], hasNext: false };

  return (
    <main className="flex min-h-screen flex-col items-center gap-12 overflow-x-clip px-4 py-12">
      <h1 className="sr-only">{t("appName")}</h1>

      <div className="flex w-full max-w-3xl flex-col gap-4">
        <Greeting name={user.displayName ?? `@${user.username}`} />
        <QuickLinks />
      </div>

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

      <div className="grid w-full max-w-3xl gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <CommunityActivity entries={communityActivity} />
        <PublicLists entries={publicLists} />
      </div>

      <PopularComments comments={popularComments} />

      <HomeReleases releases={homeReleases} />

      {communityActivity.length === 0 && publicLists.length === 0 && (
        <p className="max-w-md text-center font-body text-sm text-paper-muted">
          {tHome("noCommunityContentYet")}
        </p>
      )}
    </main>
  );
}
