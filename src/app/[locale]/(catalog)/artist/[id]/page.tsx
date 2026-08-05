import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getArtistById } from "@/services/catalog/ingest-artist";
import { findOrIngestDiscography } from "@/services/catalog/ingest-discography";
import { ArtistHeader } from "@/components/catalog/ArtistHeader";
import { AlbumGrid } from "@/components/catalog/AlbumGrid";
import type { ReleaseGroupRow } from "@/db/schema";
import type { Artist, ReleaseGroup, ReleaseGroupCategory } from "@/lib/api/schemas";

interface ArtistPageProps {
  params: Promise<{ id: string }>;
}

// `generateMetadata` y `page` resuelven el mismo artista en el mismo request.
// `React.cache` deduplica la consulta (getArtistById → DB, y enriquecimiento
// contra MusicBrainz solo ocurre una vez aunque la primera llamada lo deje
// en un tipo distinto de 'unknown').
const getArtistCached = cache(async (id: string) => getArtistById(id));

// Genera el <title> con el nombre del artista (dato de MusicBrainz, no se
// traduce). El resto de la página usa las etiquetas del namespace `artist`.
export async function generateMetadata({ params }: ArtistPageProps): Promise<Metadata> {
  const { id } = await params;
  const artist = await getArtistCached(id);
  return artist ? { title: artist.name } : {};
}

export default async function ArtistPage({ params }: ArtistPageProps) {
  const { id } = await params;
  const t = await getTranslations("catalog");

  // `getArtistById` enriquece artistas stub (`type='unknown'`) contra
  // MusicBrainz antes de devolverlos; si el id no existe devuelve null.
  const artist = await getArtistCached(id);
  if (!artist) notFound();

  const releaseGroups = await findOrIngestDiscography(artist);

  const typeLabel = t(`artist.typeLabels.${artist.type as Artist["type"]}`);
  const categoryLabels = {
    studio: t("artist.categories.studio"),
    single_ep: t("artist.categories.single_ep"),
    compilation: t("artist.categories.compilation"),
    live_other: t("artist.categories.live_other"),
  } satisfies Record<ReleaseGroupCategory, string>;

  // Los servicios devuelven filas de la base; el perfil las mapea al
  // contrato del frontend (createdAt como ISO string, categoría acotada
  // al enum que el CHECK de la tabla ya garantiza).
  const albums: ReleaseGroup[] = releaseGroups.map((rg: ReleaseGroupRow) => ({
    id: rg.id,
    mbid: rg.mbid,
    title: rg.title,
    category: rg.category as ReleaseGroupCategory,
    createdAt: rg.createdAt.toISOString(),
  }));

  return (
    <main className="flex min-h-screen flex-col items-start gap-8 px-4 py-12">
      <ArtistHeader
        artist={artist}
        typeLabel={typeLabel}
        noPhotoAlt={t("artist.noPhotoAlt")}
      />
      <AlbumGrid
        releaseGroups={albums}
        categoryLabels={categoryLabels}
        discographyHeading={t("artist.discographyHeading")}
        coverLabel={t("artist.albumCoverLabel")}
      />
    </main>
  );
}