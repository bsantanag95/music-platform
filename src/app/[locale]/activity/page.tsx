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
import { ActivityContextRail } from "@/components/activity/ActivityContextRail";
import { listTrendingConversations } from "@/services/activity/trending-conversations";
import { kindFromParam, tabFromParam, type ActivitySource } from "@/components/activity/activity-tab-param";
import type { CommunityActivityKind } from "@/lib/api/schemas";
import { withClientMessages } from "@/i18n/client-messages";

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
async function CommunityActivityPage({ searchParams }: { searchParams: SearchParams }) {
  const t = await getTranslations("feed");
  const tCommon = await getTranslations("common");
  const session = await resolveSession();
  const viewerId = session?.user.id ?? null;
  const { tab: tabParam, kind: kindParam } = await searchParams;
  // Sin sesión no hay pestañas: `tab` se ignora.
  const active: ActivitySource = viewerId ? tabFromParam(typeof tabParam === "string" ? tabParam : null) : "recent";
  // Filtro de tipo de la pestaña activa; uno que no aplica a esa pestaña se ignora.
  const kind = kindFromParam(active, typeof kindParam === "string" ? kindParam : null);

  // Solo la pestaña activa trae su primera página completa; de las otras basta saber si tienen algo (una entrada)
  // para decidir el estado vacío global. Antes se pedían las tres páginas aunque nunca se abrieran. El filtro solo se
  // aplica a la página completa de la pestaña activa: las otras se piden sin filtro.
  const sizeFor = (source: ActivitySource) => (source === active ? PAGE_SIZE : 1);
  const kindFor = (source: ActivitySource) => (source === active ? kind : undefined);
  const [recent, fromFollowing, own, followedAuthors, conversations] = await Promise.all([
    listCommunityActivity(viewerId, 1, sizeFor("recent"), {
      kind: kindFor("recent") as CommunityActivityKind | undefined,
    }),
    viewerId
      ? listFeed(viewerId, 1, sizeFor("from-following"), { kind: kindFor("from-following") })
      : Promise.resolve(null),
    viewerId ? listMyRecentActivity(viewerId, 1, sizeFor("own")) : Promise.resolve(null),
    viewerId ? listFeedAuthors(viewerId) : Promise.resolve(null),
    listTrendingConversations(viewerId),
  ]);

  // Con un filtro activo la pestaña puede venir vacía aunque haya actividad: no es el caso de "nada que mostrar", el
  // panel ya ofrece "Ver todo".
  const anySection =
    kind !== undefined ||
    recent.entries.length > 0 ||
    (fromFollowing?.entries.length ?? 0) > 0 ||
    (own?.entries.length ?? 0) > 0;

  // Cada panel vacío con una salida (D9): a Explorar, o a descubrir personas si "Siguiendo" está vacío. Distingue
  // "no sigue a nadie" de "la gente que sigue no publicó nada".
  const followsAnyone = (followedAuthors?.length ?? 0) > 0;
  const explore = { label: t("community.empty.exploreAction"), href: "/explore" };
  const discover = { label: t("community.empty.discoverAction"), href: "/users" };

  // Riel de contexto (fase 3, D10): desde `lg` a la derecha del feed, que conserva su ancho de lectura (`max-w-3xl`);
  // por debajo, después de la lista.
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col items-start gap-6 px-4 py-8 sm:gap-8 sm:py-12">
      <Breadcrumbs items={[{ label: tCommon("home"), href: "/" }, { label: t("community.heading") }]} />
      <header className="-mt-2 flex flex-col gap-1 sm:-mt-4">
        <h1 className="font-display text-3xl text-paper">{t("community.heading")}</h1>
        <p className="font-body text-sm text-paper-muted">{t("community.subtitle")}</p>
      </header>

      <div className="grid w-full grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-12">
        <div className="w-full min-w-0 max-w-3xl">
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
                  initialKind: active === "recent" ? kind : undefined,
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
                  initialKind: active === "from-following" ? kind : undefined,
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
          ) : recent.entries.length > 0 || kind ? (
            <CommunityActivitySection
              source="recent"
              headingKey="community.recentHeading"
              initial={recent}
              initialKind={kind}
            />
          ) : null}
        </div>
        <div className="lg:sticky lg:top-24 lg:self-start">
          <ActivityContextRail conversations={conversations} followingCount={followedAuthors?.length ?? null} />
        </div>
      </div>
    </main>
  );
}

export default withClientMessages("activity/page", CommunityActivityPage);
