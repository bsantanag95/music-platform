import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveSession } from "@/services/auth/sessions";
import { listDiscoverLists } from "@/services/lists/discovery";
import { discoverCaminos } from "@/services/camino/discovery";
import { listFeaturedLists, listPopularLists, listsFromFollowing } from "@/services/lists/community";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeader } from "@/components/discovery/SectionHeader";
import { ListsGrid } from "@/components/lists/lists-shared";
import { CommunityListCard } from "@/components/lists/CommunityListCard";
import { CommunityListSection } from "@/components/lists/CommunityListSection";
import { CommunityListsToolbar } from "@/components/lists/CommunityListsToolbar";
import { CommunityExploreGrid } from "@/components/lists/CommunityExploreGrid";
import { ListsContextRail } from "@/components/lists/ListsContextRail";
import { getMostRecentEditedList } from "@/services/home/home";
import { parseCommunityFilters, toDiscoverFilters } from "@/components/lists/community-filters";
import { withClientMessages } from "@/i18n/client-messages";

/** "Para completar" en el riel: hasta 4 (antes 8 como sección de la vitrina). */
const RAIL_TO_COMPLETE = 4;

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
async function CommunityListsPage({
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
  let rail = null;
  if (filters) {
    const initial = await listDiscoverLists(viewerId, 1, 20, toDiscoverFilters(filters));
    content = <CommunityExploreGrid initial={initial} filters={filters} canSave={canSave} />;
  } else {
    const [featured, popular, fromFollowing, recent, toComplete, resume] = await Promise.all([
      listFeaturedLists(viewerId),
      listPopularLists(viewerId, 1, 20),
      viewerId ? listsFromFollowing(viewerId, 1, 20) : Promise.resolve(null),
      listDiscoverLists(viewerId, 1, 20),
      discoverCaminos({}, 1, RAIL_TO_COMPLETE),
      viewerId ? getMostRecentEditedList(viewerId) : Promise.resolve(null),
    ]);

    // "Para completar" vive en el riel (D9): ya no cuenta como sección de la vitrina.
    const anySection =
      featured.lists.length > 0 ||
      popular.lists.length > 0 ||
      (fromFollowing?.lists.length ?? 0) > 0 ||
      recent.lists.length > 0;

    rail = <ListsContextRail viewer={viewerId ? { resume } : null} toComplete={toComplete.caminos} />;

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
          // Con una salida (D10): crear la primera lista, o iniciar sesión para crearla.
          <EmptyState
            title={t("community.emptyTitle")}
            description={t("community.emptyDescription")}
            action={
              <Link
                href={canSave ? "/me/lists?new=1" : "/auth/login"}
                className="inline-flex items-center justify-center rounded border border-ink-border bg-ink px-4 py-2 font-display text-sm font-medium text-paper transition-colors hover:border-amber"
              >
                {canSave ? t("community.emptyAction") : t("community.emptySignedOutAction")}
              </Link>
            }
          />
        ) : null}

        {featured.lists.length > 0 ? (
          // Sin caja propia (era una caja con tarjetas-caja dentro) ni rótulo ámbar: título y una línea
          // que dice qué reúne, como las secciones de Explorar. Una sola destacada ocupa la fila, más grande.
          <section className="flex w-full flex-col gap-5">
            <SectionHeader
              heading={t("community.featuredHeading")}
              description={t("community.featuredDescription")}
              seeAll={{ href: "/explore/collections", label: t("community.seeCollections") }}
              size="page"
            />
            {/* Una sola destacada es una portada ancha (D7); con dos o más, la misma estantería que las demás secciones. */}
            <ListsGrid cols={featured.lists.length === 1 ? 1 : "shelf"}>
              {featured.lists.map((list) => (
                <CommunityListCard
                  key={list.id}
                  list={list}
                  canSave={canSave}
                  large={featured.lists.length === 1}
                  layout={featured.lists.length === 1 ? "row" : "shelf"}
                />
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
            cols="shelf"
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
            cols="shelf"
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
            cols="shelf"
            excludeIds={shownBefore.recent}
          />
        ) : null}

      </>
    );
  }

  return (
    // Mismo contenedor ancho y escala que Inicio y Explorar (openspec: redesign-lists-phase1).
    <main className="mx-auto flex min-h-screen w-full max-w-[88rem] flex-col items-start gap-10 px-4 pb-16 pt-10 sm:px-8 xl:px-12">
      {/* Miga de pan, título y una frase de entrada que dice qué hay, sin enumerar las secciones. Con sesión, "Crear lista"
          a la derecha del título abre el formulario de nueva lista de `/me/lists`. */}
      <div className="flex w-full flex-col gap-3">
        <Breadcrumbs items={[{ label: tCommon("home"), href: "/" }, { label: t("community.heading") }]} />
        <div className="flex w-full flex-wrap items-end justify-between gap-4">
          <h1 className="font-display text-[clamp(2.5rem,5vw,4rem)] font-bold leading-[0.95] tracking-[-0.035em] text-paper">
            {t("community.heading")}
          </h1>
        {canSave ? (
          <Link
            href="/me/lists?new=1"
            className="inline-flex shrink-0 items-center justify-center rounded border border-ink-border bg-ink-surface px-4 py-2 font-display text-sm font-medium text-paper transition-colors hover:border-amber"
          >
            {t("createList")}
          </Link>
        ) : null}
        </div>
        <p className="max-w-[54ch] font-body text-lg text-paper-muted">{t("community.intro")}</p>
      </div>

      <Suspense fallback={null}>
        <CommunityListsToolbar />
      </Suspense>

      {/* Sin sesión, la invitación a entrar está en el riel (D9), no en una línea bajo el toolbar. En explorar no hay riel:
          la grilla ocupa todo el ancho. */}
      {rail ? (
        <div className="grid w-full grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-12">
          <div className="flex min-w-0 flex-col gap-16 lg:gap-20">{content}</div>
          <div className="lg:sticky lg:top-24 lg:self-start">{rail}</div>
        </div>
      ) : (
        content
      )}
    </main>
  );
}

export default withClientMessages("lists/page", CommunityListsPage);
