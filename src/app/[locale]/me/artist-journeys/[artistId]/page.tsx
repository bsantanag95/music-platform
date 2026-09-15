import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requirePageUser } from "@/services/auth/page-auth";
import { getArtistById } from "@/services/catalog/ingest-artist";
import { getArtistJourneyDetail } from "@/services/artist-journeys/artist-journeys";
import { isValidUuid } from "@/lib/validation";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ArtistJourneyManager } from "@/components/artist-journey/ArtistJourneyManager";
import type { ReleaseGroupCategory } from "@/lib/api/schemas";

interface ArtistJourneyManagePageProps {
  params: Promise<{ artistId: string }>;
}

// Página de gestión (openspec: add-artist-journey-management-page): único
// lugar donde se edita la selección de un recorrido (antes un modal en la
// página del artista) y donde viven archivar/desarchivar/borrar. Requiere un
// recorrido ya activo — 404 si el usuario nunca activó uno sobre este
// artista (activar sigue ocurriendo desde la página del artista).
export default async function ArtistJourneyManagePage({ params }: ArtistJourneyManagePageProps) {
  const { artistId } = await params;
  if (!isValidUuid(artistId)) notFound();

  const user = await requirePageUser();
  const [t, tCommon, tCatalog, artistRow, journey] = await Promise.all([
    getTranslations("artistJourney"),
    getTranslations("common"),
    getTranslations("catalog"),
    getArtistById(artistId),
    getArtistJourneyDetail(user.id, artistId),
  ]);
  if (!artistRow || !journey) notFound();

  const categoryLabels = {
    studio: tCatalog("artist.categories.studio"),
    single_ep: tCatalog("artist.categories.single_ep"),
    compilation: tCatalog("artist.categories.compilation"),
    live_other: tCatalog("artist.categories.live_other"),
  } satisfies Record<ReleaseGroupCategory, string>;

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-12">
      <div className="w-full max-w-3xl">
        <Breadcrumbs
          items={[
            { label: tCommon("home"), href: "/" },
            { label: t("myJourneysTitle"), href: "/me/artist-journeys" },
            { label: artistRow.name },
          ]}
        />
      </div>
      <ArtistJourneyManager
        artistId={artistId}
        artistName={artistRow.name}
        artistPhotoUrl={artistRow.photoUrl}
        initialJourney={journey}
        categoryLabels={categoryLabels}
      />
    </main>
  );
}
