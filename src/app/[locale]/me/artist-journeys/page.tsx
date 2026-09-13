import { getTranslations } from "next-intl/server";
import { requirePageUser } from "@/services/auth/page-auth";
import { listMyArtistJourneys } from "@/services/artist-journeys/artist-journeys";
import { ArtistJourneyList } from "@/components/artist-journey/ArtistJourneyList";

// Punto de entrada desde el menú de usuario (`user-menu-items.ts`, id
// `artistJourneys`). Solo lectura: gestionar cada recorrido sigue ocurriendo
// en la página del artista correspondiente.
export default async function ArtistJourneysPage() {
  const t = await getTranslations("artistJourney");
  const user = await requirePageUser();
  const journeys = await listMyArtistJourneys(user.id);

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-12">
      <h1 className="font-display text-2xl text-paper">{t("myJourneysTitle")}</h1>
      <ArtistJourneyList journeys={journeys} />
    </main>
  );
}
