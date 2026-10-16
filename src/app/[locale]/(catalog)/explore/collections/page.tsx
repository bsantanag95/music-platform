import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { CollectionFamilyFilter, type FamilyFilterOption } from "@/components/discovery/CollectionFamilyFilter";
import { CollectionRail } from "@/components/discovery/CollectionRail";
import { collectionLinkOf, collectionTitleOf } from "@/components/discovery/collection-links";
import { renderRef, type ContextTranslator } from "@/components/discovery/collection-context-render";
import { FeaturedCollection } from "@/components/discovery/FeaturedCollection";
import { SectionHeader } from "@/components/discovery/SectionHeader";
import { isExploreEnabled } from "@/lib/config/discovery";
import { isCollectionFamily, type CollectionFamily } from "@/services/discovery/collections/families";
import { listCollectionSummaries } from "@/services/discovery/collections/summaries";
import { CURATOR_USERNAME } from "@/services/discovery/constants";
import { listCollectionArchive, listCollectionFamilies, listCollectionsHub } from "@/services/discovery/discovery";

interface CollectionsPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ familia?: string; pagina?: string }>;
}

export async function generateMetadata({ params }: CollectionsPageProps): Promise<Metadata> {
  await params;
  const t = await getTranslations("catalog.explore.collectionsHub");
  return { title: t("pageTitle") };
}

const BASE = "/explore/collections";
const TEXT_LINK = "text-paper underline decoration-ink-border underline-offset-4 hover:text-amber";

/** Dirección de la vista: filtro y página del archivo. El filtro cambia vigentes y archivo; la página, solo el archivo. */
function viewHref(family: CollectionFamily | undefined, page = 1, anchor = ""): string {
  const query = new URLSearchParams();
  if (family) query.set("familia", family);
  if (page > 1) query.set("pagina", String(page));
  const text = query.toString();
  return `${BASE}${text ? `?${text}` : ""}${anchor}`;
}

// Página de colecciones (openspec: redesign-collections-hub, ADR 0040): una colección destacada, una sola rejilla con
// el resto de las vigentes y el archivo de las que ya salieron del riel. El tipo es un filtro que se aplica a vigentes
// y archivo, no la estructura de la página. Sin personalización: la misma composición para todas las personas.
export default async function CollectionsPage({ params, searchParams }: CollectionsPageProps) {
  const { locale } = await params;
  if (!isExploreEnabled()) redirect({ href: "/", locale });

  const t = await getTranslations("catalog.explore");
  const tHub = await getTranslations("catalog.explore.collectionsHub");
  const tCommon = await getTranslations("common");
  const tContext = (await getTranslations("catalog.explore.collectionContext")) as unknown as ContextTranslator;
  const raw = await searchParams;
  const family = isCollectionFamily(raw.familia) ? raw.familia : undefined;
  const page = Math.max(1, Number.parseInt(raw.pagina ?? "1", 10) || 1);

  const [hub, archive, families] = await Promise.all([
    listCollectionsHub(),
    listCollectionArchive({ family, page }),
    listCollectionFamilies(),
  ]);
  const itemsLabel = (count: number) => t("collectionItems", { count });
  const familyLabel = (value: CollectionFamily) => t(`collectionFamilies.${value}`);
  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  // Con filtro, solo esa familia y sin destacada (la persona ya eligió qué mirar); sin filtro, la primera del orden
  // editorial —el mismo del riel de `/explore`— abre la página y el resto va en una sola rejilla.
  const current = family ? hub.collections.filter((collection) => collection.family === family) : hub.collections;
  const featured = family ? undefined : current[0];
  const rest = featured ? current.slice(1) : current;

  const summaries = await listCollectionSummaries(current);
  const contextFor = (collection: { id: string }) => {
    const message = summaries.get(collection.id);
    return message ? (renderRef(message, tContext, locale) ?? undefined) : undefined;
  };

  const filterOptions: FamilyFilterOption[] = [
    { value: null, label: tHub("allFamilies"), href: viewHref(undefined) },
    ...families.map((value) => ({ value, label: familyLabel(value), href: viewHref(value) })),
  ];
  const pageLink =
    "inline-flex items-center gap-1 rounded-full border border-ink-border px-4 py-2 font-data text-xs text-paper-muted transition-colors hover:border-amber hover:text-paper";
  const pageDisabled =
    "inline-flex items-center gap-1 rounded-full border border-ink-border px-4 py-2 font-data text-xs text-paper-muted opacity-40";
  const archiveHref = (target: number) => viewHref(family, target, "#anteriores");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col items-start gap-10 px-4 py-12">
      <div className="flex w-full flex-col gap-4">
        <Breadcrumbs
          items={[
            { label: tCommon("home"), href: "/" },
            { label: t("heading"), href: "/explore" },
            { label: tHub("heading") },
          ]}
        />
        <h1 className="font-display text-3xl text-paper">{tHub("heading")}</h1>
        <p className="max-w-2xl font-body text-paper-muted">
          {tHub.rich("description", {
            lists: (chunks) => (
              <Link href="/lists" className={TEXT_LINK}>
                {chunks}
              </Link>
            ),
          })}
        </p>
        <CollectionFamilyFilter label={tHub("familyFilterLabel")} options={filterOptions} active={family} />
      </div>

      {current.length > 0 ? (
        <section id="vigentes" aria-labelledby="vigentes-heading" className="flex w-full scroll-mt-24 flex-col gap-5">
          <SectionHeader heading={tHub("currentHeading")} headingId="vigentes-heading" />
          {featured ? (
            <FeaturedCollection
              href={collectionLinkOf(featured, locale, CURATOR_USERNAME)}
              title={collectionTitleOf(featured, locale)}
              description={featured.description}
              context={contextFor(featured)}
              coverThumbs={featured.coverThumbs}
              familyLabel={familyLabel(featured.family)}
              itemsLabel={itemsLabel(featured.itemCount)}
              openLabel={tHub("openCollection")}
            />
          ) : null}
          {rest.length > 0 ? (
            <CollectionRail
              id="vigentes-rejilla"
              heading={tHub("currentHeading")}
              collections={rest}
              curatorUsername={CURATOR_USERNAME}
              itemsLabel={itemsLabel}
              familyLabel={familyLabel}
              contextFor={contextFor}
              bare
            />
          ) : null}
        </section>
      ) : null}

      <CollectionRail
        id="anteriores"
        heading={tHub("archiveHeading")}
        description={tHub("archiveDescription")}
        collections={archive.collections}
        curatorUsername={CURATOR_USERNAME}
        itemsLabel={itemsLabel}
        familyLabel={familyLabel}
        noteFor={(collection) => tHub("endedOn", { date: dateFormat.format(new Date(collection.endedAt)) })}
        compact
        emptyMessage={
          family ? (
            <>
              {tHub("archiveEmptyFamily")}{" "}
              <Link href={viewHref(undefined)} className={TEXT_LINK}>
                {tHub("archiveEmptyAll")}
              </Link>
            </>
          ) : undefined
        }
      />

      {page > 1 || archive.hasNext ? (
        <nav aria-label={t("paginationLabel")} className="flex w-full items-center justify-center gap-3 pt-2">
          {page > 1 ? (
            <Link href={archiveHref(page - 1)} rel="prev" className={pageLink}>
              {t("prevPage")}
            </Link>
          ) : (
            <span aria-disabled="true" className={pageDisabled}>
              {t("prevPage")}
            </span>
          )}
          <span className="font-data text-xs tabular-nums text-paper-muted">{t("pageIndicator", { page })}</span>
          {archive.hasNext ? (
            <Link href={archiveHref(page + 1)} rel="next" className={pageLink}>
              {t("nextPage")}
            </Link>
          ) : (
            <span aria-disabled="true" className={pageDisabled}>
              {t("nextPage")}
            </span>
          )}
        </nav>
      ) : null}
    </main>
  );
}
