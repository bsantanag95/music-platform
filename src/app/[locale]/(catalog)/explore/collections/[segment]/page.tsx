import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListDetailHeader } from "@/components/lists/ListDetailHeader";
import { ListItemsView } from "@/components/lists/ListItemsView";
import { collectionSegment } from "@/lib/catalog-links";
import { resolveCatalogRoute } from "@/lib/catalog-route";
import { isExploreEnabled } from "@/lib/config/discovery";
import { parseCatalogSegment } from "@/lib/slug";
import { resolveSession } from "@/services/auth/sessions";
import { findGeneratedCollection } from "@/services/discovery/collections/generated";
import { PLATFORM_OWNER_NAME, collectionTitle, titleLocaleOf } from "@/services/discovery/collections/titles";
import { CURATOR_DISPLAY_NAME, CURATOR_USERNAME } from "@/services/discovery/constants";
import { countsByListId } from "@/services/journeys/progress";
import { getUserListDetail } from "@/services/lists/lists";
import { saveCountsFor, savedStateFor } from "@/services/lists/saved-lists";

interface CollectionDetailPageProps {
  params: Promise<{ locale: string; segment: string }>;
}

export async function generateMetadata({ params }: CollectionDetailPageProps): Promise<Metadata> {
  const { locale, segment } = await params;
  const parsed = parseCatalogSegment(segment);
  const collection = parsed ? await findGeneratedCollection(parsed.id) : null;
  if (!collection) return {};
  return { title: collectionTitle(collection.templateKey, collection.periodKey, locale, collection.storedTitle) };
}

// Detalle de una colección generada (openspec: localize-collection-titles, ADR 0037). Vive bajo Explorar y no bajo la
// cuenta curadora: la URL lleva el slug del título del idioma activo y el dueño se muestra como la plataforma. Las
// listas de personas y las colecciones curadas siguen en `/users/<usuario>/lists/<lista>`.
export default async function CollectionDetailPage({ params }: CollectionDetailPageProps) {
  const { locale, segment } = await params;
  if (!isExploreEnabled()) redirect({ href: "/", locale });

  const parsed = parseCatalogSegment(segment);
  if (!parsed) notFound();
  const collection = await findGeneratedCollection(parsed.id);
  if (!collection) notFound();

  const title = collectionTitle(collection.templateKey, collection.periodKey, locale, collection.storedTitle);
  resolveCatalogRoute({ locale, kind: "collection", segment, canonical: collectionSegment(title, parsed.id) });

  const session = await resolveSession();
  const viewerId = session?.user.id ?? null;

  let list;
  try {
    list = await getUserListDetail(CURATOR_USERNAME, parsed.id, viewerId);
  } catch {
    notFound();
  }

  const t = await getTranslations("lists");
  const tExplore = await getTranslations("catalog.explore");
  const tCommon = await getTranslations("common");
  const savedState = viewerId ? (await savedStateFor(viewerId, [parsed.id])).get(parsed.id) : undefined;
  const saveCount = (await saveCountsFor([parsed.id])).get(parsed.id) ?? 0;
  const trackingProgress =
    viewerId && savedState?.tracking && list.entityType === "release-group"
      ? ((await countsByListId(viewerId, [parsed.id])).get(parsed.id) ?? { selected: 0, listened: 0 })
      : null;

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-12">
      <div className="flex w-full max-w-3xl flex-col gap-6">
        <Breadcrumbs
          items={[
            { label: tCommon("home"), href: "/" },
            { label: tExplore("heading"), href: "/explore" },
            { label: tExplore("collectionsHub.heading"), href: "/explore/collections" },
            { label: title },
          ]}
        />
        <ListDetailHeader
          list={{ ...list, title }}
          canManage={false}
          owner={{ username: CURATOR_USERNAME, displayName: CURATOR_DISPLAY_NAME }}
          ownerLabel={PLATFORM_OWNER_NAME[titleLocaleOf(locale)]}
          saved={savedState?.saved ?? false}
          following={savedState?.following ?? false}
          canSave={Boolean(viewerId)}
          saveCount={saveCount}
          tracking={savedState?.tracking ?? false}
          trackingProgress={
            trackingProgress
              ? { selectedCount: trackingProgress.selected, listenedCount: trackingProgress.listened }
              : null
          }
        />

        {list.items.length === 0 ? (
          <EmptyState title={t("noItems")} description={t("readEmptyItems")} />
        ) : (
          <ListItemsView items={list.items} entityType={list.entityType} viewerAuthenticated={Boolean(viewerId)} />
        )}
      </div>
    </main>
  );
}
