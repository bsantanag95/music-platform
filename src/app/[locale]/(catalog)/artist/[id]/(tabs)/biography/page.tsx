import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArtistBiography } from "@/components/artist/ArtistBiography";
import { artistSegment } from "@/lib/catalog-links";
import { resolveCatalogRoute } from "@/lib/catalog-route";
import { parseCatalogSegment } from "@/lib/slug";
import type { ProfileLocale } from "@/services/catalog/artist-profile-read";
import { loadArtist, loadProfile } from "../../artist-data";

// Pestaña Biografía (openspec: redesign-artist-page, capability `artist-biography`). Sin
// resumen de Wikipedia en ningún idioma la pestaña no existe: la URL directa responde 404.

interface ArtistBiographyPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ArtistBiographyPageProps): Promise<Metadata> {
  const { id } = await params;
  const parsed = parseCatalogSegment(id);
  if (!parsed) return {};
  const artist = await loadArtist(parsed.id);
  if (!artist) return {};
  const t = await getTranslations("catalog.artist.tabs");
  return { title: `${t("biography")} · ${artist.name}` };
}

export default async function ArtistBiographyPage({ params }: ArtistBiographyPageProps) {
  const { id: segment } = await params;
  const parsed = parseCatalogSegment(segment);
  if (!parsed) notFound();
  const locale = (await getLocale()) as ProfileLocale;
  const [artist, profile] = await Promise.all([loadArtist(parsed.id), loadProfile(parsed.id, locale)]);
  if (!artist) notFound();
  resolveCatalogRoute({
    locale,
    kind: "artist",
    segment,
    canonical: artistSegment(artist.name, artist.id),
    subpath: "/biography",
  });
  if (!profile?.summary) notFound();
  return <ArtistBiography summary={profile.summary} />;
}
