import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArtistBiography } from "@/components/artist/ArtistBiography";
import { isValidUuid } from "@/lib/validation";
import type { ProfileLocale } from "@/services/catalog/artist-profile-read";
import { loadArtist, loadProfile } from "../../artist-data";

// Pestaña Biografía (openspec: redesign-artist-page, capability `artist-biography`). Sin
// resumen de Wikipedia en ningún idioma la pestaña no existe: la URL directa responde 404.

interface ArtistBiographyPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ArtistBiographyPageProps): Promise<Metadata> {
  const { id } = await params;
  if (!isValidUuid(id)) return {};
  const artist = await loadArtist(id);
  if (!artist) return {};
  const t = await getTranslations("catalog.artist.tabs");
  return { title: `${t("biography")} · ${artist.name}` };
}

export default async function ArtistBiographyPage({ params }: ArtistBiographyPageProps) {
  const { id } = await params;
  if (!isValidUuid(id)) notFound();
  const locale = (await getLocale()) as ProfileLocale;
  const profile = await loadProfile(id, locale);
  if (!profile?.summary) notFound();
  return <ArtistBiography summary={profile.summary} />;
}
