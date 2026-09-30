import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { AlbumCredits } from "@/components/album/AlbumCredits";
import { resolveCatalogRoute } from "@/lib/catalog-route";
import { parseCatalogSegment } from "@/lib/slug";
import { loadAlbumDetail, loadAlbumPersonnel, loadAlbumSegment } from "../../album-data";

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
  const parsed = parseCatalogSegment(id);
  if (!parsed) return {};
  const result = await loadAlbumDetail(parsed.id);
  if (result.kind !== "ok") return {};
  const t = await getTranslations("catalog.album.tabs");
  return { title: `${t("credits")} · ${result.detail.releaseGroup.title}` };
}

export default async function AlbumCreditsPage({ params, searchParams }: AlbumCreditsPageProps) {
  const { id: segment } = await params;
  const parsed = parseCatalogSegment(segment);
  if (!parsed) notFound();
  const query = (await searchParams) ?? {};
  const result = await loadAlbumDetail(parsed.id);
  if (result.kind !== "ok") return null;

  resolveCatalogRoute({
    locale: await getLocale(),
    kind: "album",
    segment,
    canonical: await loadAlbumSegment(result.detail.releaseGroup.id, result.detail.releaseGroup.title),
    subpath: "/credits",
    searchParams: query,
  });

  const personnel = await loadAlbumPersonnel(result.detail.releaseGroup.id);
  if (!personnel) notFound();

  const multiDisc = new Set(result.detail.tracks.map((t) => t.discNumber)).size > 1;
  const { view } = query;
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
      releaseMbid={personnel.releaseMbid}
    />
  );
}
