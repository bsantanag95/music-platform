import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getArtistById } from "@/services/catalog/ingest-artist";
import { resolveSession } from "@/services/auth/sessions";
import { listPublicListsContainingItem } from "@/services/lists/discovery";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ItemListsSection } from "@/components/lists/ItemListsSection";
import { isValidUuid } from "@/lib/validation";

interface ArtistListsPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ArtistListsPageProps): Promise<Metadata> {
  const { id } = await params;
  if (!isValidUuid(id)) return {};
  const artist = await getArtistById(id);
  if (!artist) return {};
  const t = await getTranslations("lists");
  return { title: `${t("title")} · ${artist.name}` };
}

// Página dedicada "Mostrar en listas" de un artista (openspec:
// show-item-in-lists): a la que el panel acotado a 4 resultados en el perfil
// del artista envía con su enlace "Ver más".
export default async function ArtistListsPage({ params }: ArtistListsPageProps) {
  const { id } = await params;
  const common = await getTranslations("common");
  const t = await getTranslations("lists");
  if (!isValidUuid(id)) notFound();

  const artist = await getArtistById(id);
  if (!artist) notFound();

  const session = await resolveSession();
  const target = { type: "artist" as const, id: artist.id };
  const initial = await listPublicListsContainingItem(session?.user.id ?? null, target, 1, 20);

  const breadcrumbItems = [
    { label: common("home"), href: "/" },
    { label: artist.name, href: `/artist/${artist.id}` },
    { label: t("title") },
  ];

  return (
    <main className="flex min-h-screen flex-col items-start gap-8 px-4 py-12">
      <Breadcrumbs items={breadcrumbItems} />
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl text-paper">{t("title")}</h1>
        <p className="font-body text-paper-muted">{t("containingPageIntro", { title: artist.name })}</p>
      </header>
      <ItemListsSection target={target} initial={initial} canSave={Boolean(session?.user.id)} />
    </main>
  );
}
