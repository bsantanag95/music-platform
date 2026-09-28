import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { GroupLineupView, LINEUP_VIEWS, PersonLineupView, type LineupView } from "@/components/artist/ArtistLineup";
import { lineupTabOf } from "@/components/artist/lineup-fact";
import { isValidUuid } from "@/lib/validation";
import { scheduleLineupMembersSync } from "@/services/catalog/artist-lineup-sync";
import { loadArtist, loadLineup } from "../../artist-data";

// Pestaña Integrantes de un grupo o Bandas de una persona (openspec: add-artist-members-tab,
// capability `artist-lineup-view`). Sin nada que listar la pestaña no existe: la URL directa
// responde 404. La sub-vista vive en `?view=`; un valor desconocido muestra Completa.

interface ArtistMembersPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ view?: string | string[] }>;
}

function isView(value: unknown): value is LineupView {
  return typeof value === "string" && (LINEUP_VIEWS as readonly string[]).includes(value);
}

export async function generateMetadata({ params }: ArtistMembersPageProps): Promise<Metadata> {
  const { id } = await params;
  if (!isValidUuid(id)) return {};
  const [artist, lineup] = await Promise.all([loadArtist(id), loadLineup(id)]);
  const tab = lineupTabOf(lineup);
  if (!artist || !tab) return {};
  const t = await getTranslations("catalog.artist.tabs");
  return { title: `${t(tab)} · ${artist.name}` };
}

export default async function ArtistMembersPage({ params, searchParams }: ArtistMembersPageProps) {
  const { id } = await params;
  if (!isValidUuid(id)) notFound();
  const lineup = await loadLineup(id);
  if (!lineup || !lineupTabOf(lineup)) notFound();
  const query = (await searchParams) ?? {};

  if (lineup.kind === "group") {
    // Otras bandas y fecha de muerte de los integrantes, en segundo plano (design D5).
    scheduleLineupMembersSync(id);
    return <GroupLineupView artistId={id} lineup={lineup} view={isView(query.view) ? query.view : "all"} />;
  }
  if (lineup.supportersCurrent.length + lineup.supportersPast.length > 0) scheduleLineupMembersSync(id);
  return <PersonLineupView lineup={lineup} />;
}
