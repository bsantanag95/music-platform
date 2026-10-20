import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resolveSession } from "@/services/auth/sessions";
import { listCommunityActivity } from "@/services/activity/community-activity";
import { listFeed, listFeedAuthors } from "@/services/feed/feed";
import { listMyRecentActivity } from "@/services/home/home";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { EmptyState } from "@/components/ui/EmptyState";
import { CommunityActivitySection } from "@/components/activity/CommunityActivitySection";
import { ActivityTabs } from "@/components/activity/ActivityTabs";
import { tabFromParam, type ActivitySource } from "@/components/activity/activity-tab-param";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("feed");
  return { title: t("community.pageTitle") };
}

const PAGE_SIZE = 10;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// Superficie pública de actividad de la comunidad (add-community-activity-surface,
// add-community-activity-tabs, redesign-activity-page). Sin sesión solo existe "Recientes" (ratings, comentarios y
// reseñas públicos) y se renderiza directo, sin pestañas — con una sola fuente, una barra de pestañas no aporta nada.
// Con sesión se suman "Siguiendo" (mismo feed que `/me/feed`) y "Tú" (mismo rastro que "Tu rastro reciente" de
// Inicio) como pestañas, y la pestaña activa llega en `?tab=`.
export default async function CommunityActivityPage({ searchParams }: { searchParams: SearchParams }) {
  const t = await getTranslations("feed");
  const tCommon = await getTranslations("common");
  const session = await resolveSession();
  const viewerId = session?.user.id ?? null;
  const tabParam = (await searchParams).tab;
  // Sin sesión no hay pestañas: `tab` se ignora.
  const active: ActivitySource = viewerId ? tabFromParam(typeof tabParam === "string" ? tabParam : null) : "recent";

  // Solo la pestaña activa trae su primera página completa; de las otras basta saber si tienen algo (una entrada)
  // para decidir el estado vacío global. Antes se pedían las tres páginas aunque nunca se abrieran.
  const sizeFor = (source: ActivitySource) => (source === active ? PAGE_SIZE : 1);
  const [recent, fromFollowing, own, followedAuthors] = await Promise.all([
    listCommunityActivity(viewerId, 1, sizeFor("recent")),
    viewerId ? listFeed(viewerId, 1, sizeFor("from-following")) : Promise.resolve(null),
    viewerId ? listMyRecentActivity(viewerId, 1, sizeFor("own")) : Promise.resolve(null),
    viewerId ? listFeedAuthors(viewerId) : Promise.resolve(null),
  ]);

  const anySection =
    recent.entries.length > 0 || (fromFollowing?.entries.length ?? 0) > 0 || (own?.entries.length ?? 0) > 0;

  // Cada panel vacío con una salida (D9): a Explorar, o a descubrir personas si "Siguiendo" está vacío. Distingue
  // "no sigue a nadie" de "la gente que sigue no publicó nada".
  const followsAnyone = (followedAuthors?.length ?? 0) > 0;
  const explore = { label: t("community.empty.exploreAction"), href: "/explore" };
  const discover = { label: t("community.empty.discoverAction"), href: "/users" };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-start gap-6 px-4 py-8 sm:gap-8 sm:py-12">
      <Breadcrumbs items={[{ label: tCommon("home"), href: "/" }, { label: t("community.heading") }]} />
      <header className="-mt-2 flex flex-col gap-1 sm:-mt-4">
        <h1 className="font-display text-3xl text-paper">{t("community.heading")}</h1>
        <p className="font-body text-sm text-paper-muted">{t("community.subtitle")}</p>
      </header>

      {!anySection ? (
        <EmptyState title={t("community.emptyTitle")} description={t("community.emptyDescription")} />
      ) : fromFollowing && own ? (
        <ActivityTabs
          tablistLabel={t("community.tablistLabel")}
          tabs={[
            {
              key: "recent",
              label: t("community.recentHeading"),
              initial: active === "recent" ? recent : undefined,
              empty: {
                title: t("community.empty.recentTitle"),
                description: t("community.empty.recentDescription"),
                action: explore,
              },
            },
            {
              key: "from-following",
              label: t("community.followingHeading"),
              initial: active === "from-following" ? fromFollowing : undefined,
              empty: followsAnyone
                ? {
                    title: t("community.empty.followingQuietTitle"),
                    description: t("community.empty.followingQuietDescription"),
                    action: discover,
                  }
                : {
                    title: t("community.empty.followingNoneTitle"),
                    description: t("community.empty.followingNoneDescription"),
                    action: discover,
                  },
            },
            {
              key: "own",
              label: t("community.ownHeading"),
              initial: active === "own" ? own : undefined,
              empty: {
                title: t("community.empty.ownTitle"),
                description: t("community.empty.ownDescription"),
                action: explore,
              },
            },
          ]}
        />
      ) : recent.entries.length > 0 ? (
        <CommunityActivitySection source="recent" headingKey="community.recentHeading" initial={recent} />
      ) : null}
    </main>
  );
}
