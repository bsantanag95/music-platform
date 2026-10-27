import { requirePageUser } from "@/services/auth/page-auth";
import { listMyArtistJourneys } from "@/services/artist-journeys/artist-journeys";
import { listMyCaminos } from "@/services/camino/camino";
import { listTrackedLists } from "@/services/lists/saved-lists";
import { countProgressTabs } from "@/services/progress/progress-counts";
import { ArtistJourneyList } from "@/components/artist-journey/ArtistJourneyList";
import { MyCaminosList } from "@/components/camino/MyCaminosList";
import { TrackedCaminosList } from "@/components/camino/TrackedCaminosList";
import { ProgressSection } from "@/components/progress/ProgressSection";
import {
  parseFollowingFilters,
  parseOwnFilters,
  parseProgressTab,
  type ProgressTab,
} from "@/components/progress/progress-tabs";

type RawParams = Record<string, string | string[] | undefined>;

async function loadPanel(tab: ProgressTab, userId: string, params: RawParams) {
  if (tab === "following") {
    return <TrackedCaminosList lists={await listTrackedLists(userId)} initialFilters={parseFollowingFilters(params)} />;
  }
  if (tab === "lists") {
    return <MyCaminosList caminos={await listMyCaminos(userId)} initialFilters={parseOwnFilters(params)} />;
  }
  return <ArtistJourneyList journeys={await listMyArtistJourneys(userId)} initialFilters={parseOwnFilters(params)} />;
}

// Panel unificado de progreso (openspec: clarify-user-menu-names, capability
// `progress-hub`): reúne, como pestañas, los recorridos de artista
// (Discografías), los Caminos propios (Listas para completar) y las listas ajenas con
// seguimiento (Listas que sigo). Solo se carga la pestaña activa; cada listado
// conserva su comportamiento y no se mezclan entradas entre pestañas. Los filtros
// de la pestaña llegan en `q`, `sort` y `state`, validados según la pestaña
// (openspec: refine-progress-page-phase1, D5). La cabecera con la acción de la pestaña
// vive en `ProgressSection`, y los totales de las tres pestañas se cuentan aparte
// (openspec: redesign-progress-toolbar, D3).
export default async function ProgressPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const user = await requirePageUser();
  const params = await searchParams;
  const tab = parseProgressTab(params.tab);
  const [panel, totals] = await Promise.all([loadPanel(tab, user.id, params), countProgressTabs(user.id)]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-10">
      <ProgressSection activeTab={tab} initialTotals={totals}>
        {panel}
      </ProgressSection>
    </main>
  );
}
