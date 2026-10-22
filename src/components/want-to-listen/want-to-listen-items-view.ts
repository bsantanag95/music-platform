import type { WantToListenEntry } from "@/lib/api/schemas";
import type { JourneyStatus } from "./use-journey-statuses";

// Acciones sobre las entradas de una sección, resueltas por `WantToListenList`.
// Sin reordenamiento: a diferencia de `user_list_item`, el orden es
// cronológico, no manual.
export interface WantToListenRowActions {
  busy: boolean;
  /** Entrada cuyo quitado falló; su renderer muestra el aviso bajo ella. */
  errorId: string | null;
  remove: (id: string) => void;
  /** Estado de recorrido de un artista, resuelto por lote (`useJourneyStatuses`). */
  journeyStatus: (artistId: string) => JourneyStatus;
  journeyAdded: (artistId: string) => void;
  journeyError: (artistId: string) => void;
}

export interface WantToListenRendererProps {
  entries: WantToListenEntry[];
  actions: WantToListenRowActions;
  /** Entradas cuya carátula se carga con prioridad (las primeras de la página). */
  priorityIds: ReadonlySet<string>;
}
