import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AlbumCredits } from "@/components/album/AlbumCredits";
import { isValidUuid } from "@/lib/validation";
import { loadAlbumDetail, loadAlbumPersonnel } from "../../album-data";

// Pestaña Créditos (openspec: redesign-album-page): créditos de personal del disco en
// cuatro niveles, o por canción con `?view=songs`. Sin créditos la pestaña no existe: la URL
// directa responde 404.

interface AlbumCreditsPageProps {
  params: Promise<{ id: string }>;
  /** `?view=songs` elige la vista por canción (openspec: album-credits-by-song, D5). */
  searchParams?: Promise<{ view?: string | string[] }>;
}

export async function generateMetadata({ params }: AlbumCreditsPageProps): Promise<Metadata> {
  const { id } = await params;
  if (!isValidUuid(id)) return {};
  const result = await loadAlbumDetail(id);
  if (result.kind !== "ok") return {};
  const t = await getTranslations("catalog.album.tabs");
  return { title: `${t("credits")} · ${result.detail.releaseGroup.title}` };
}

export default async function AlbumCreditsPage({ params, searchParams }: AlbumCreditsPageProps) {
  const { id } = await params;
  if (!isValidUuid(id)) notFound();
  const result = await loadAlbumDetail(id);
  if (result.kind !== "ok") return null;

  const personnel = await loadAlbumPersonnel(result.detail.releaseGroup.id);
  if (!personnel) notFound();

  const multiDisc = new Set(result.detail.tracks.map((t) => t.discNumber)).size > 1;
  const { view } = (await searchParams) ?? {};
  return (
    <AlbumCredits
      levels={personnel.levels}
      leadKind={personnel.leadKind}
      multiDisc={multiDisc}
      tracks={result.detail.tracks.map(({ recordingId, title, discNumber, position }) => ({
        recordingId,
        title,
        discNumber,
        position,
      }))}
      byTrack={personnel.byTrack}
      songwriters={personnel.songwriters}
      view={view === "songs" ? "songs" : "people"}
      releaseGroupId={result.detail.releaseGroup.id}
    />
  );
}
