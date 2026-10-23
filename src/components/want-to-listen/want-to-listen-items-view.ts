import type { WantToListenEntry } from "@/lib/api/schemas";
import type { JourneyStatus } from "./use-journey-statuses";

// Acciones sobre las entradas de una sección, resueltas por `WantToListenList`.
// Sin reordenamiento: a diferencia de `user_list_item`, el orden es
// cronológico, no manual.
export interface WantToListenRowActions {
  busy: boolean;
  /** Entrada cuya acción (quitar o registrar la escucha) falló; su renderer muestra el aviso bajo ella. */
  errorId: string | null;
  /** Registra la escucha: la entrada sale de Pendientes (openspec: redesign-want-to-listen-views). */
  listened: (id: string) => void;
  remove: (id: string) => void;
  /** Entrada con el panel "Añadir a una lista" abierto bajo ella. */
  listOpenId: string | null;
  openList: (id: string) => void;
  closeList: () => void;
  /** Estado de recorrido de un artista, resuelto por lote (`useJourneyStatuses`). */
  journeyStatus: (artistId: string) => JourneyStatus;
  activateJourney: (artistId: string) => void;
}

export interface WantToListenRendererProps {
  entries: WantToListenEntry[];
  actions: WantToListenRowActions;
  /** Entradas cuya carátula se carga con prioridad (las primeras de la página). */
  priorityIds: ReadonlySet<string>;
}
