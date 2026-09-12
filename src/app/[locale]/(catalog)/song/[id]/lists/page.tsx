import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getRecordingDetail } from "@/services/catalog/recording-detail";
import { resolveSession } from "@/services/auth/sessions";
import { listPublicListsContainingItem } from "@/services/lists/discovery";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ItemListsSection } from "@/components/lists/ItemListsSection";
import { isValidUuid } from "@/lib/validation";

interface SongListsPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: SongListsPageProps): Promise<Metadata> {
  const { id } = await params;
  if (!isValidUuid(id)) return {};
  const result = await getRecordingDetail(id);
  if (result.kind !== "ok") return {};
  const t = await getTranslations("lists");
  return { title: `${t("title")} · ${result.detail.recording.title}` };
}

// Página dedicada "Mostrar en listas" de una canción (openspec:
// show-item-in-lists): a la que el panel acotado a 4 resultados en la página
// de la canción envía con su enlace "Ver más". Mínima a propósito — solo lo
// necesario para el breadcrumb y el título, igual que el resto de sub-páginas
// del catálogo.
export default async function SongListsPage({ params }: SongListsPageProps) {
  const { id } = await params;
  const common = await getTranslations("common");
  const t = await getTranslations("lists");
  if (!isValidUuid(id)) notFound();

  const result = await getRecordingDetail(id);
  if (result.kind === "not_found") notFound();

  const { recording, primaryArtist } = result.detail;
  const session = await resolveSession();
  const target = { type: "recording" as const, id: recording.id };
  const initial = await listPublicListsContainingItem(session?.user.id ?? null, target, 1, 20);

  const breadcrumbItems = [
    { label: common("home"), href: "/" },
    ...(primaryArtist ? [{ label: primaryArtist.name, href: `/artist/${primaryArtist.id}` }] : []),
    { label: recording.title, href: `/song/${recording.id}` },
    { label: t("title") },
  ];

  return (
    <main className="flex min-h-screen flex-col items-start gap-8 px-4 py-12">
      <Breadcrumbs items={breadcrumbItems} />
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl text-paper">{t("title")}</h1>
        <p className="font-body text-paper-muted">
          {t("containingPageIntro", { title: recording.title })}
        </p>
      </header>
      <ItemListsSection target={target} initial={initial} canSave={Boolean(session?.user.id)} />
    </main>
  );
}
