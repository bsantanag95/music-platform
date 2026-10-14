import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { CollectionRail } from "@/components/discovery/CollectionRail";
import { SectionHeader } from "@/components/discovery/SectionHeader";
import { isExploreEnabled } from "@/lib/config/discovery";
import { COLLECTION_FAMILIES, isCollectionFamily, type CollectionFamily } from "@/services/discovery/collections/families";
import { CURATOR_USERNAME } from "@/services/discovery/constants";
import { listCollectionArchive, listCollectionsHub } from "@/services/discovery/discovery";

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

function archiveHref(family: CollectionFamily | undefined, page: number): string {
  const query = new URLSearchParams();
  if (family) query.set("familia", family);
  if (page > 1) query.set("pagina", String(page));
  const text = query.toString();
  return `${BASE}${text ? `?${text}` : ""}#anteriores`;
}

// Página de colecciones (openspec: split-explore-collections, ADR 0036): la selección editorial vigente, las
// automáticas vigentes por familia y el archivo de las que ya salieron del riel. Sin personalización: la misma
// composición para todas las personas.
export default async function CollectionsPage({ params, searchParams }: CollectionsPageProps) {
  const { locale } = await params;
  if (!isExploreEnabled()) redirect({ href: "/", locale });

  const t = await getTranslations("catalog.explore");
  const tHub = await getTranslations("catalog.explore.collectionsHub");
  const tCommon = await getTranslations("common");
  const raw = await searchParams;
  const family = isCollectionFamily(raw.familia) ? raw.familia : undefined;
  const page = Math.max(1, Number.parseInt(raw.pagina ?? "1", 10) || 1);

  const [hub, archive] = await Promise.all([listCollectionsHub(), listCollectionArchive({ family, page })]);
  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const itemsLabel = (count: number) => t("collectionItems", { count });
  const familyLabel = (value: CollectionFamily) => t(`collectionFamilies.${value}`);

  // Un solo bloque de vigentes, agrupado por familia: las curadas a mano y las generadas conviven en el grupo
  // de su familia, sin rótulo que las distinga (ADR 0038).
  const currentByFamily = COLLECTION_FAMILIES.map((value) => ({
    family: value,
    collections: hub.collections.filter((collection) => collection.family === value),
  })).filter((group) => group.collections.length > 0);

  const chip =
    "inline-flex shrink-0 items-center rounded-full border px-3 py-1 font-data text-xs transition-colors focus-visible:border-amber";
  const chipOff = `${chip} border-ink-border text-paper-muted hover:border-amber hover:text-paper`;
  const chipOn = `${chip} border-amber text-paper`;
  const pageLink =
    "inline-flex items-center gap-1 rounded-full border border-ink-border px-4 py-2 font-data text-xs text-paper-muted transition-colors hover:border-amber hover:text-paper";
  const pageDisabled =
    "inline-flex items-center gap-1 rounded-full border border-ink-border px-4 py-2 font-data text-xs text-paper-muted opacity-40";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col items-start gap-12 px-4 py-12">
      <div className="flex w-full flex-col gap-4">
        <Breadcrumbs
          items={[
            { label: tCommon("home"), href: "/" },
            { label: t("heading"), href: "/explore" },
            { label: tHub("heading") },
          ]}
        />
        <h1 className="font-display text-3xl text-paper">{tHub("heading")}</h1>
        <p className="max-w-2xl font-body text-paper-muted">{tHub("description")}</p>
      </div>

      {currentByFamily.length > 0 ? (
        <div id="vigentes" className="flex w-full scroll-mt-24 flex-col gap-8">
          <SectionHeader heading={tHub("currentHeading")} description={tHub("currentDescription")} />
          {currentByFamily.map((group) => (
            <CollectionRail
              key={group.family}
              id={`familia-${group.family}`}
              heading={familyLabel(group.family)}
              collections={group.collections}
              curatorUsername={CURATOR_USERNAME}
              itemsLabel={itemsLabel}
            />
          ))}
        </div>
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
        emptyMessage={family ? tHub("archiveEmptyFamily") : tHub("archiveEmpty")}
        toolbar={
          <nav aria-label={tHub("familyFilterLabel")} className="flex flex-wrap gap-1.5">
            <Link
              href={archiveHref(undefined, 1)}
              aria-current={family === undefined ? "page" : undefined}
              className={family === undefined ? chipOn : chipOff}
            >
              {tHub("allFamilies")}
            </Link>
            {COLLECTION_FAMILIES.map((value) => (
              <Link
                key={value}
                href={archiveHref(value, 1)}
                aria-current={family === value ? "page" : undefined}
                className={family === value ? chipOn : chipOff}
              >
                {familyLabel(value)}
              </Link>
            ))}
          </nav>
        }
      />

      {page > 1 || archive.hasNext ? (
        <nav aria-label={t("paginationLabel")} className="flex w-full items-center justify-center gap-3 pt-2">
          {page > 1 ? (
            <Link href={archiveHref(family, page - 1)} rel="prev" className={pageLink}>
              {t("prevPage")}
            </Link>
          ) : (
            <span aria-disabled="true" className={pageDisabled}>
              {t("prevPage")}
            </span>
          )}
          <span className="font-data text-xs tabular-nums text-paper-muted">{t("pageIndicator", { page })}</span>
          {archive.hasNext ? (
            <Link href={archiveHref(family, page + 1)} rel="next" className={pageLink}>
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
