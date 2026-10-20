import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveSession } from "@/services/auth/sessions";
import { listDiscoverLists } from "@/services/lists/discovery";
import { discoverCaminos } from "@/services/camino/discovery";
import { CaminoDiscoveryGrid } from "@/components/camino/CaminoDiscoveryGrid";
import { listFeaturedLists, listPopularLists, listsFromFollowing } from "@/services/lists/community";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeader } from "@/components/discovery/SectionHeader";
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
// compone Destacadas → De usuarios seguidos → Populares → Recientes → Para completar (openspec:
// polish-community-lists: con sesión, lo de la gente que sigues va antes que lo general; cada lista sale una
// sola vez, en la primera sección que le toca; las listas sociales van juntas y "Para completar" cierra), y
// "explorar" (con q/type/sort), que reemplaza la composición por una única
// grilla filtrada y paginada. El toolbar está siempre visible.
export default async function CommunityListsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslations("lists");
  const tCommon = await getTranslations("common");
  const tCamino = await getTranslations("camino");
  const session = await resolveSession();
  const viewerId = session?.user.id ?? null;
  const canSave = viewerId !== null;
  const filters = parseCommunityFilters(await searchParams);

  let content;
  if (filters) {
    const initial = await listDiscoverLists(viewerId, 1, 20, toDiscoverFilters(filters));
    content = <CommunityExploreGrid initial={initial} filters={filters} canSave={canSave} />;
  } else {
    const [featured, popular, fromFollowing, recent, toComplete] = await Promise.all([
      listFeaturedLists(viewerId),
      listPopularLists(viewerId, 1, 20),
      viewerId ? listsFromFollowing(viewerId, 1, 20) : Promise.resolve(null),
      listDiscoverLists(viewerId, 1, 20),
      discoverCaminos({}, 1, 8),
    ]);

    const anySection =
      featured.lists.length > 0 ||
      popular.lists.length > 0 ||
      (fromFollowing?.lists.length ?? 0) > 0 ||
      recent.lists.length > 0 ||
      toComplete.caminos.length > 0;

    // Cada lista sale una vez, en la primera sección donde aparece (de arriba hacia abajo): antes "Discos favoritos del
    // momento" salía en De la gente que sigues, Populares y Recientes. Se cuentan las de la primera página de cada sección.
    const ids = (lists: { id: string }[]) => lists.map((list) => list.id);
    const featuredIds = ids(featured.lists);
    const followingIds = ids(fromFollowing?.lists ?? []);
    const shownBefore = {
      following: featuredIds,
      popular: [...featuredIds, ...followingIds],
      recent: [...featuredIds, ...followingIds, ...ids(popular.lists)],
    };

    content = (
      <>
        {!anySection ? (
          <EmptyState
            title={t("community.emptyTitle")}
            description={t("community.emptyDescription")}
          />
        ) : null}

        {featured.lists.length > 0 ? (
          // Sin caja propia (era una caja con tarjetas-caja dentro) ni rótulo ámbar: título y una línea
          // que dice qué reúne, como las secciones de Explorar. Una sola destacada ocupa la fila, más grande.
          <section className="flex w-full flex-col gap-4">
            <SectionHeader
              heading={t("community.featuredHeading")}
              description={t("community.featuredDescription")}
              seeAll={{ href: "/explore/collections", label: t("community.seeCollections") }}
            />
            <ListsGrid cols={featured.lists.length === 1 ? 1 : 2}>
              {featured.lists.map((list) => (
                <CommunityListCard key={list.id} list={list} canSave={canSave} large={featured.lists.length === 1} />
              ))}
            </ListsGrid>
          </section>
        ) : null}

        {fromFollowing && fromFollowing.lists.length > 0 ? (
          <CommunityListSection
            source="from-following"
            descriptionKey="community.followingDescription"
            headingKey="community.followingHeading"
            initial={fromFollowing}
            canSave={canSave}
            cols={2}
            dense
            excludeIds={shownBefore.following}
          />
        ) : null}

        {popular.lists.length > 0 ? (
          <CommunityListSection
            source="popular"
            descriptionKey="community.popularDescription"
            headingKey="community.popularHeading"
            initial={popular}
            canSave={canSave}
            cols={3}
            dense
            excludeIds={shownBefore.popular}
          />
        ) : null}

        {recent.lists.length > 0 ? (
          <CommunityListSection
            source="recent"
            descriptionKey="community.recentDescription"
            headingKey="community.recentHeading"
            initial={recent}
            canSave={canSave}
            cols={3}
            dense
            excludeIds={shownBefore.recent}
          />
        ) : null}

        {toComplete.caminos.length > 0 ? (
          // Descubrimiento de listas para completar (openspec: clarify-user-menu-names): sale de la
          // barra general y se alcanza desde aquí; mismo orden que `/caminos`, con la tarjeta compacta de esta página.
          // Va al final: es otro tipo de objeto (progreso, no listas sociales) y entre Populares y Recientes cortaba la
          // lectura de las listas de la comunidad.
          <section className="flex w-full flex-col gap-4">
            <SectionHeader
              heading={tCamino("hub.toComplete")}
              description={tCamino("hub.toCompleteDescription")}
              seeAll={{ href: "/caminos", label: tCamino("hub.seeAll") }}
            />
            <CaminoDiscoveryGrid caminos={toComplete.caminos} dense />
          </section>
        ) : null}
      </>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col items-start gap-8 px-4 py-12">
      <Breadcrumbs items={[{ label: tCommon("home"), href: "/" }, { label: t("community.heading") }]} />
      {/* Solo miga de pan y título (como Explorar): la introducción enumeraba las secciones de abajo. Con sesión,
          "Crear lista" a la derecha del título abre el formulario de nueva lista de `/me/lists`. */}
      <div className="-mt-4 flex w-full items-center justify-between gap-4">
        <h1 className="font-display text-3xl text-paper sm:text-4xl">{t("community.heading")}</h1>
        {canSave ? (
          <Link
            href="/me/lists?new=1"
            className="inline-flex shrink-0 items-center justify-center rounded border border-ink-border bg-ink-surface px-4 py-2 font-display text-sm font-medium text-paper transition-colors hover:border-amber"
          >
            {t("createList")}
          </Link>
        ) : null}
      </div>

      <Suspense fallback={null}>
        <CommunityListsToolbar />
      </Suspense>

      {canSave ? null : (
        // Sin sesión las tarjetas no ofrecen Guardar/Seguir y nada invita a entrar: una línea, sin botón.
        <p className="-mt-4 font-body text-sm text-paper-muted">
          <Link href="/auth/login" className="text-amber underline-offset-2 hover:underline">
            {t("community.signInAction")}
          </Link>{" "}
          {t("community.signInRest")}
        </p>
      )}

      {content}
    </main>
  );
}
