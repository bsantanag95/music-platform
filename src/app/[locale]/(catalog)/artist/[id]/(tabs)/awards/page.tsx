import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArtistAwards } from "@/components/artist/ArtistAwards";
import { artistSegment } from "@/lib/catalog-links";
import { resolveCatalogRoute } from "@/lib/catalog-route";
import { parseCatalogSegment } from "@/lib/slug";
import { getArtistAwards } from "@/services/awards/artist-awards";
import { loadArtist } from "../../artist-data";

// Pestaña Premios (openspec: refine-artist-page-phase3, capability `artist-awards-tab`). Sin nominaciones la pestaña no
// existe: la URL directa responde 404.

interface ArtistAwardsPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ArtistAwardsPageProps): Promise<Metadata> {
  const { id } = await params;
  const parsed = parseCatalogSegment(id);
  if (!parsed) return {};
  const artist = await loadArtist(parsed.id);
  if (!artist) return {};
  const t = await getTranslations("catalog.artist.tabs");
  return { title: `${t("awards")} · ${artist.name}` };
}

export default async function ArtistAwardsPage({ params }: ArtistAwardsPageProps) {
  const { id: segment } = await params;
  const parsed = parseCatalogSegment(segment);
  if (!parsed) notFound();
  const artist = await loadArtist(parsed.id);
  if (!artist) notFound();
  resolveCatalogRoute({
    locale: await getLocale(),
    kind: "artist",
    segment,
    canonical: artistSegment(artist.name, artist.id),
    subpath: "/awards",
  });
  const awards = await getArtistAwards(artist.id);
  if (awards.ceremonies.length === 0) notFound();
  return <ArtistAwards awards={awards} artistName={artist.name} />;
}
