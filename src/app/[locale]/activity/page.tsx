import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resolveSession } from "@/services/auth/sessions";
import { listCommunityActivity } from "@/services/activity/community-activity";
import { listFeed } from "@/services/feed/feed";
import { listMyRecentActivity } from "@/services/home/home";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { EmptyState } from "@/components/ui/EmptyState";
import { CommunityActivitySection } from "@/components/activity/CommunityActivitySection";
import { ActivityTabs } from "@/components/activity/ActivityTabs";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("feed");
  return { title: t("community.pageTitle") };
}

const PAGE_SIZE = 10;

// Superficie pública de actividad de la comunidad (add-community-activity-surface,
// add-community-activity-tabs). Sin sesión solo existe "Recientes" (ratings,
// comentarios y reseñas públicos) y se renderiza directo, sin pestañas — con
// una sola fuente, una barra de pestañas no aporta nada. Con sesión se suman
// "De la gente que seguís" (mismo feed que `/me/feed`) y "Tu actividad" (mismo
// rastro que "Tu rastro reciente" de Inicio) como pestañas: apiladas como
// antes, la página se volvía demasiado vertical para llegar a la tercera.
export default async function CommunityActivityPage() {
  const t = await getTranslations("feed");
  const tCommon = await getTranslations("common");
  const session = await resolveSession();
  const viewerId = session?.user.id ?? null;

  const [recent, fromFollowing, own] = await Promise.all([
    listCommunityActivity(viewerId, 1, PAGE_SIZE),
    viewerId ? listFeed(viewerId, 1, PAGE_SIZE) : Promise.resolve(null),
    viewerId ? listMyRecentActivity(viewerId, 1, PAGE_SIZE) : Promise.resolve(null),
  ]);

  const anySection =
    recent.entries.length > 0 || (fromFollowing?.entries.length ?? 0) > 0 || (own?.entries.length ?? 0) > 0;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-start gap-8 px-4 py-12">
      <Breadcrumbs items={[{ label: tCommon("home"), href: "/" }, { label: t("community.heading") }]} />
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl text-paper">{t("community.heading")}</h1>
        <p className="font-body text-paper-muted">{t("community.intro")}</p>
      </div>

      {!anySection ? (
        <EmptyState title={t("community.emptyTitle")} description={t("community.emptyDescription")} />
      ) : fromFollowing && own ? (
        <ActivityTabs
          tablistLabel={t("community.tablistLabel")}
          emptyMessage={t("community.tabEmpty")}
          tabs={[
            { key: "recent", label: t("community.recentHeading"), initial: recent },
            { key: "from-following", label: t("community.followingHeading"), initial: fromFollowing },
            { key: "own", label: t("community.ownHeading"), initial: own },
          ]}
        />
      ) : recent.entries.length > 0 ? (
        <CommunityActivitySection source="recent" headingKey="community.recentHeading" initial={recent} />
      ) : null}
    </main>
  );
}
