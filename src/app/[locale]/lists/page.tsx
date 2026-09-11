import { Suspense } from "react";
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
import { CommunityListsToolbar } from "@/components/lists/CommunityListsToolbar";
import { CommunityExploreGrid } from "@/components/lists/CommunityExploreGrid";
import { parseCommunityFilters, toDiscoverFilters } from "@/components/lists/community-filters";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("lists");
  return { title: t("community.pageTitle") };
}

// Superficie pública de descubrimiento de listas de la comunidad. Tiene dos
// estados (cambio rework-public-lists-surface): "vitrina" (sin filtros), que
// compone Destacadas → Populares → De usuarios seguidos → Recientes, y
// "explorar" (con q/type/sort), que reemplaza la composición por una única
// grilla filtrada y paginada. El toolbar está siempre visible.
export default async function CommunityListsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslations("lists");
  const tCommon = await getTranslations("common");
  const session = await resolveSession();
  const viewerId = session?.user.id ?? null;
  const canSave = viewerId !== null;
  const filters = parseCommunityFilters(await searchParams);

  let content;
  if (filters) {
    const initial = await listDiscoverLists(viewerId, 1, 20, toDiscoverFilters(filters));
    content = <CommunityExploreGrid initial={initial} filters={filters} canSave={canSave} />;
  } else {
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

    content = (
      <>
        {!anySection ? (
          <EmptyState
            title={t("community.emptyTitle")}
            description={t("community.emptyDescription")}
          />
        ) : null}

        {featured.lists.length > 0 ? (
          <section className="flex w-full flex-col gap-4 rounded-lg border border-ink-border bg-ink-surface p-6">
            <div className="flex flex-col gap-1">
              <p className="font-data text-xs uppercase tracking-wide text-amber">
                {t("community.featuredEyebrow")}
              </p>
              <h2 className="font-display text-xl text-paper">{t("community.featuredHeading")}</h2>
            </div>
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
            cols={3}
            dense
          />
        ) : null}

        {fromFollowing && fromFollowing.lists.length > 0 ? (
          <CommunityListSection
            source="from-following"
            headingKey="community.followingHeading"
            initial={fromFollowing}
            canSave={canSave}
            cols={1}
            dense
          />
        ) : null}

        {recent.lists.length > 0 ? (
          <CommunityListSection
            source="recent"
            headingKey="community.recentHeading"
            initial={recent}
            canSave={canSave}
            cols={3}
            dense
          />
        ) : null}
      </>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col items-start gap-8 px-4 py-12">
      <Breadcrumbs items={[{ label: tCommon("home"), href: "/" }, { label: t("community.heading") }]} />
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl text-paper">{t("community.heading")}</h1>
        <p className="font-body text-paper-muted">{t("community.intro")}</p>
      </div>

      <Suspense fallback={null}>
        <CommunityListsToolbar />
      </Suspense>

      {content}
    </main>
  );
}
