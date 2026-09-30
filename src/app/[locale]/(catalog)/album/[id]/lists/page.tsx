import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { getAlbumDetail } from "@/services/catalog/album-detail";
import { resolvePrimaryArtists, slugArtistName } from "@/services/catalog/primary-artists";
import { resolveSession } from "@/services/auth/sessions";
import { listPublicListsContainingItem } from "@/services/lists/discovery";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ItemListsSection } from "@/components/lists/ItemListsSection";
import { albumHref, albumSegment, artistHref } from "@/lib/catalog-links";
import { resolveCatalogRoute } from "@/lib/catalog-route";
import { parseCatalogSegment } from "@/lib/slug";

interface AlbumListsPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: AlbumListsPageProps): Promise<Metadata> {
  const { id } = await params;
  const parsed = parseCatalogSegment(id);
  if (!parsed) return {};
  const result = await getAlbumDetail(parsed.id);
  if (result.kind !== "ok") return {};
  const t = await getTranslations("lists");
  return { title: `${t("title")} · ${result.detail.releaseGroup.title}` };
}

// Página dedicada "Mostrar en listas" de un álbum (openspec:
// show-item-in-lists): a la que el panel acotado a 4 resultados en la página
// del álbum envía con su enlace "Ver más".
export default async function AlbumListsPage({ params }: AlbumListsPageProps) {
  const { id: segment } = await params;
  const common = await getTranslations("common");
  const t = await getTranslations("lists");
  const parsed = parseCatalogSegment(segment);
  if (!parsed) notFound();

  const result = await getAlbumDetail(parsed.id);
  if (result.kind === "not_found" || result.kind === "no_editions") notFound();

  const { releaseGroup, primaryArtist } = result.detail;
  const [artistName, locale] = await Promise.all([
    resolvePrimaryArtists({ releaseGroupIds: [releaseGroup.id] }).then(({ releaseGroups }) =>
      slugArtistName(releaseGroups.get(releaseGroup.id)),
    ),
    getLocale(),
  ]);
  resolveCatalogRoute({
    locale,
    kind: "album",
    segment,
    canonical: albumSegment(artistName, releaseGroup.title, releaseGroup.id),
    subpath: "/lists",
  });

  const session = await resolveSession();
  const target = { type: "release-group" as const, id: releaseGroup.id };
  const initial = await listPublicListsContainingItem(session?.user.id ?? null, target, 1, 20);

  const breadcrumbItems = [
    { label: common("home"), href: "/" },
    ...(primaryArtist ? [{ label: primaryArtist.name, href: artistHref(primaryArtist.name, primaryArtist.id) }] : []),
    { label: releaseGroup.title, href: albumHref(artistName, releaseGroup.title, releaseGroup.id) },
    { label: t("title") },
  ];

  return (
    <main className="flex min-h-screen flex-col items-start gap-8 px-4 py-12">
      <Breadcrumbs items={breadcrumbItems} />
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl text-paper">{t("title")}</h1>
        <p className="font-body text-paper-muted">
          {t("containingPageIntro", { title: releaseGroup.title })}
        </p>
      </header>
      <ItemListsSection target={target} initial={initial} canSave={Boolean(session?.user.id)} />
    </main>
  );
}
