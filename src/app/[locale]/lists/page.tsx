import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resolveSession } from "@/services/auth/sessions";
import { listDiscoverLists } from "@/services/lists/discovery";
import { listFeaturedLists, listPopularLists, listsFromFollowing } from "@/services/lists/community";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListsGrid } from "@/components/lists/lists-shared";
import { CommunityListCard } from "@/components/lists/CommunityListCard";
import { CommunityListSection } from "@/components/lists/CommunityListSection";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("lists");
  return { title: t("community.pageTitle") };
}

// Superficie pública de descubrimiento de listas de la comunidad (cambio
// add-community-lists-surface). Accesible con y sin sesión; compone Destacadas →
// Populares → De usuarios seguidos (solo con sesión) → Recientes, y omite las
// secciones sin contenido.
export default async function CommunityListsPage() {
  const t = await getTranslations("lists");
  const tCommon = await getTranslations("common");
  const session = await resolveSession();
  const viewerId = session?.user.id ?? null;
  const canSave = viewerId !== null;

  const [featured, popular, fromFollowing, recent] = await Promise.all([
    listFeaturedLists(viewerId),
    listPopularLists(viewerId, 1, 20),
    viewerId ? listsFromFollowing(viewerId, 1, 20) : Promise.resolve(null),
    listDiscoverLists(viewerId, 1, 20),
  ]);

  const anySection =
    featured.lists.length > 0 ||
    popular.lists.length > 0 ||
    (fromFollowing?.lists.length ?? 0) > 0 ||
    recent.lists.length > 0;

  return (
    <main className="flex min-h-screen w-full flex-col items-start gap-10 px-4 py-12">
      <Breadcrumbs items={[{ label: tCommon("home"), href: "/" }, { label: t("community.heading") }]} />
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl text-paper">{t("community.heading")}</h1>
        <p className="font-body text-paper-muted">{t("community.intro")}</p>
      </div>

      {!anySection ? (
        <EmptyState
          title={t("community.emptyTitle")}
          description={t("community.emptyDescription")}
        />
      ) : null}

      {featured.lists.length > 0 ? (
        <section className="flex w-full flex-col gap-4">
          <h2 className="font-display text-xl text-paper">{t("community.featuredHeading")}</h2>
          <ListsGrid>
            {featured.lists.map((list) => (
              <CommunityListCard key={list.id} list={list} canSave={canSave} />
            ))}
          </ListsGrid>
        </section>
      ) : null}

      {popular.lists.length > 0 ? (
        <CommunityListSection
          source="popular"
          headingKey="community.popularHeading"
          initial={popular}
          canSave={canSave}
        />
      ) : null}

      {fromFollowing && fromFollowing.lists.length > 0 ? (
        <CommunityListSection
          source="from-following"
          headingKey="community.followingHeading"
          initial={fromFollowing}
          canSave={canSave}
        />
      ) : null}

      {recent.lists.length > 0 ? (
        <CommunityListSection
          source="recent"
          headingKey="community.recentHeading"
          initial={recent}
          canSave={canSave}
        />
      ) : null}
    </main>
  );
}
