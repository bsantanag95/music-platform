import { getTranslations } from "next-intl/server";
import { requirePageUser } from "@/services/auth/page-auth";
import { listMyArtistJourneys } from "@/services/artist-journeys/artist-journeys";
import { listMyCaminos } from "@/services/camino/camino";
import { listTrackedLists } from "@/services/lists/saved-lists";
import { ArtistJourneyList } from "@/components/artist-journey/ArtistJourneyList";
import { MyCaminosList } from "@/components/camino/MyCaminosList";
import { TrackedCaminosList } from "@/components/camino/TrackedCaminosList";
import { ProgressSection } from "@/components/progress/ProgressSection";
import { parseFollowingFilters, parseOwnFilters, parseProgressTab } from "@/components/progress/progress-tabs";

// Panel unificado de progreso (openspec: clarify-user-menu-names, capability
// `progress-hub`): reúne, como pestañas, los recorridos de artista
// (Discografías), los Caminos propios (Mis listas) y las listas ajenas con
// seguimiento (Listas que sigo). Solo se carga la pestaña activa; cada listado
// conserva su comportamiento y no se mezclan entradas entre pestañas. Los filtros
// de la pestaña llegan en `q`, `sort` y `state`, validados según la pestaña
// (openspec: refine-progress-page-phase1, D5); la cabecera va a la izquierda en el
// mismo ancho que el resto de las secciones personales.
export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslations("camino");
  const user = await requirePageUser();
  const params = await searchParams;
  const tab = parseProgressTab(params.tab);

  let panel;
  if (tab === "following") {
    panel = (
      <TrackedCaminosList lists={await listTrackedLists(user.id)} initialFilters={parseFollowingFilters(params)} />
    );
  } else if (tab === "lists") {
    panel = <MyCaminosList caminos={await listMyCaminos(user.id)} initialFilters={parseOwnFilters(params)} />;
  } else {
    panel = (
      <ArtistJourneyList journeys={await listMyArtistJourneys(user.id)} initialFilters={parseOwnFilters(params)} />
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl text-paper">{t("hub.title")}</h1>
        <p className="font-data text-xs text-paper-muted">{t("hub.description")}</p>
      </div>
      <ProgressSection activeTab={tab}>{panel}</ProgressSection>
    </main>
  );
}
