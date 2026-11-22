import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveSession } from "@/services/auth/sessions";
import { listDiscoverLists } from "@/services/lists/discovery";
import { getUserListDetail } from "@/services/lists/lists";
import { discoverCaminos } from "@/services/camino/discovery";
import { listFeaturedLists, listPopularLists, listsFromFollowing } from "@/services/lists/community";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { SectionHeader } from "@/components/discovery/SectionHeader";
import { FeaturedExhibit } from "@/components/lists/FeaturedExhibit";
import { CommunityListsToolbar } from "@/components/lists/CommunityListsToolbar";
import { ListsReader, type InitialPreview, type ReaderTab } from "@/components/lists/ListsReader";
import { ListsBand, ListsSignUpBand } from "@/components/lists/ListsSignUpBand";
import { ListsYourLine } from "@/components/lists/ListsYourLine";
import { getMostRecentEditedList } from "@/services/home/home";
import { parseCommunityFilters, toDiscoverFilters } from "@/components/lists/community-filters";
import { withClientMessages } from "@/i18n/client-messages";

/** "Para completar" como pestaña del lector: hasta 8 (openspec: redesign-lists-phase2). */
const READER_TO_COMPLETE = 8;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("lists");
  return { title: t("community.pageTitle") };
}

/** Elementos de la primera lista para la vista previa, resueltos en el servidor; `null` si no se puede (o no hay lista). */
async function previewFor(
  first: { id: string; ownerUsername: string; previewable: boolean } | null,
  viewerId: string | null,
): Promise<InitialPreview | null> {
  if (!first || !first.previewable) return null;
  try {
    const detail = await getUserListDetail(first.ownerUsername, first.id, viewerId);
    return { id: first.id, items: detail.items };
  } catch {
    // La vista previa la volverá a pedir el cliente; la página no falla por ella.
    return null;
  }
}

// Superficie pública de descubrimiento de listas de la comunidad (rework-public-lists-surface, redesign-lists-phase2). Dos
// estados: "vitrina" (sin filtros), con Destacadas y el lector (pestañas De la gente que sigues → Populares → Recientes →
// Para completar, con la vista previa de la lista elegida desde `lg`) y, sin sesión, la banda para crear una cuenta; y
// "explorar" (con q/type/sort), el mismo lector con una única lista de resultados. Sin riel lateral: "Tus listas" es una
// línea bajo la frase de entrada. El toolbar está siempre visible.
async function CommunityListsPage({
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
  const resume = viewerId ? await getMostRecentEditedList(viewerId) : null;

  let content;
  if (filters) {
    const initial = await listDiscoverLists(viewerId, 1, 20, toDiscoverFilters(filters));
    const first = initial.lists[0];
    const initialPreview = await previewFor(
      first ? { id: first.id, ownerUsername: first.owner.username, previewable: true } : null,
      viewerId,
    );
    content = (
      <ListsReader
        // Cambiar de filtros reinicia la lista elegida.
        key={JSON.stringify(filters)}
        mode="explore"
        initial={initial}
        filters={filters}
        canSave={canSave}
        initialPreview={initialPreview}
      />
    );
  } else {
    const [featured, popular, fromFollowing, recent, toComplete] = await Promise.all([
      listFeaturedLists(viewerId),
      listPopularLists(viewerId, 1, 20),
      viewerId ? listsFromFollowing(viewerId, 1, 20) : Promise.resolve(null),
      listDiscoverLists(viewerId, 1, 20),
      discoverCaminos({}, 1, READER_TO_COMPLETE),
    ]);

    // Lo que ya está en Destacadas no se repite en las pestañas; entre pestañas sí puede repetirse, porque solo se ve una.
    const featuredIds = featured.lists.map((list) => list.id);
    const visible = <T extends { id: string }>(lists: T[]): T[] => lists.filter((list) => !featuredIds.includes(list.id));
    const tabs: ReaderTab[] = [];
    if (fromFollowing && visible(fromFollowing.lists).length > 0) {
      tabs.push({ key: "from-following", label: t("community.followingHeading"), initial: fromFollowing, excludeIds: featuredIds });
    }
    if (visible(popular.lists).length > 0) {
      tabs.push({ key: "popular", label: t("community.popularHeading"), initial: popular, excludeIds: featuredIds });
    }
    if (visible(recent.lists).length > 0) {
      tabs.push({ key: "recent", label: t("community.recentHeading"), initial: recent, excludeIds: featuredIds });
    }
    if (toComplete.caminos.length > 0) {
      tabs.push({
        key: "to-complete",
        label: tCamino("hub.toComplete"),
        caminos: toComplete.caminos,
        seeAll: { href: "/caminos", label: tCamino("hub.seeAll") },
      });
    }

    const firstTab = tabs[0];
    const firstList =
      firstTab === undefined
        ? null
        : firstTab.key === "to-complete"
          ? (firstTab.caminos[0] ?? null)
          : (visible(firstTab.initial.lists)[0] ?? null);
    const initialPreview = await previewFor(
      firstList === null || firstTab === undefined
        ? null
        : {
            id: firstList.id,
            ownerUsername: firstList.owner.username,
            // Un recorrido propio de "Para completar" no es una lista: no tiene elementos que mostrar.
            previewable: !("kind" in firstList) || firstList.kind === "standard",
          },
      viewerId,
    );

    const anyContent = featured.lists.length > 0 || tabs.some((tab) => tab.key !== "to-complete");
    // Elementos de la primera destacada para su exhibidor (redesign-lists-phase3); sin ellos se muestra igual.
    const firstFeatured = featured.lists[0];
    const exhibitItems = firstFeatured
      ? await getUserListDetail(firstFeatured.owner.username, firstFeatured.id, viewerId)
          .then((detail) => detail.items)
          .catch(() => null)
      : null;
    // Fundas de la banda sin sesión: una carátula de cada una de las primeras listas que tengan alguna.
    const bandCovers = [
      ...featured.lists,
      ...tabs.flatMap((tab): { coverThumbs: string[] }[] => (tab.key === "to-complete" ? tab.caminos : tab.initial.lists)),
    ]
      .map((list) => list.coverThumbs[0])
      .filter((cover): cover is string => Boolean(cover))
      .slice(0, 3);

    content = (
      <>
        {!anyContent ? (
          // Con una salida (D10): crear la primera lista, o iniciar sesión para crearla. Misma forma que la banda.
          <ListsBand
            headingId="lists-empty-heading"
            title={t("community.emptyTitle")}
            description={t("community.emptyDescription")}
            primary={
              canSave
                ? { href: "/me/lists?new=1", label: t("community.emptyAction") }
                : { href: "/auth/login", label: t("community.emptySignedOutAction") }
            }
          />
        ) : null}

        {firstFeatured ? (
          // El exhibidor de la primera destacada y, debajo, las demás en compacto (redesign-lists-phase3).
          <section className="flex w-full flex-col gap-5">
            <SectionHeader
              heading={t("community.featuredHeading")}
              description={t("community.featuredDescription")}
              seeAll={{ href: "/explore/collections", label: t("community.seeCollections") }}
              size="page"
            />
            <FeaturedExhibit list={firstFeatured} items={exhibitItems} canSave={canSave} />
            {featured.lists.length > 1 ? (
              <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {featured.lists.slice(1).map((list) => (
                  <li key={list.id}>
                    <FeaturedExhibit list={list} canSave={canSave} compact />
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}

        {tabs.length > 0 ? (
          <ListsReader mode="showcase" tabs={tabs} tabsLabel={t("community.reader.tabsLabel")} canSave={canSave} initialPreview={initialPreview} />
        ) : null}

        {!canSave && anyContent ? <ListsSignUpBand covers={bandCovers} /> : null}
      </>
    );
  }

  return (
    // Mismo contenedor ancho y escala que Inicio y Explorar (openspec: redesign-lists-phase1).
    <main className="mx-auto flex min-h-screen w-full max-w-[88rem] flex-col items-start gap-10 px-4 pb-16 pt-10 sm:px-8 xl:px-12">
      {/* Miga de pan, título, una frase de entrada que dice qué hay y, con sesión, "Tus listas" (redesign-lists-phase2). Con
          sesión, "Crear lista" a la derecha del título abre el formulario de nueva lista de `/me/lists`. */}
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
        {canSave ? <ListsYourLine resume={resume} /> : null}
      </div>

      <Suspense fallback={null}>
        <CommunityListsToolbar />
      </Suspense>

      <div className="flex w-full flex-col gap-16 lg:gap-20">{content}</div>
    </main>
  );
}

export default withClientMessages("lists/page", CommunityListsPage);
