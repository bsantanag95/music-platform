import { getTranslations } from "next-intl/server";
import { requirePageUser } from "@/services/auth/page-auth";
import { listMyArtistJourneys } from "@/services/artist-journeys/artist-journeys";
import { listMyCaminos } from "@/services/camino/camino";
import { listTrackedLists } from "@/services/lists/saved-lists";
import { ArtistJourneyList } from "@/components/artist-journey/ArtistJourneyList";
import { MyCaminosList } from "@/components/camino/MyCaminosList";
import { TrackedCaminosList } from "@/components/camino/TrackedCaminosList";
import { ProgressSection } from "@/components/progress/ProgressSection";
import { parseProgressTab } from "@/components/progress/progress-tabs";

// Panel unificado de progreso (openspec: clarify-user-menu-names, capability
// `progress-hub`): reúne, como pestañas, los recorridos de artista
// (Discografías), los Caminos propios (Mis listas) y las listas ajenas con
// seguimiento (Listas que sigo). Solo se carga la pestaña activa; cada listado
// conserva su comportamiento y no se mezclan entradas entre pestañas.
export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const t = await getTranslations("camino");
  const user = await requirePageUser();
  const tab = parseProgressTab((await searchParams).tab);

  let panel;
  if (tab === "following") {
    panel = <TrackedCaminosList lists={await listTrackedLists(user.id)} />;
  } else if (tab === "lists") {
    panel = <MyCaminosList caminos={await listMyCaminos(user.id)} />;
  } else {
    panel = <ArtistJourneyList journeys={await listMyArtistJourneys(user.id)} />;
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-12">
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="font-display text-2xl text-paper">{t("hub.title")}</h1>
        <p className="font-data text-xs text-paper-muted">{t("hub.description")}</p>
      </div>
      <ProgressSection activeTab={tab}>{panel}</ProgressSection>
    </main>
  );
}
