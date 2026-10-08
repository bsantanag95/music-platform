import type { WantToListenEntry } from "@/lib/api/schemas";
import type { JourneyStatus } from "./use-journey-statuses";

// Acciones sobre las entradas de una sección, resueltas por `WantToListenList`.
// Sin reordenamiento: a diferencia de `user_list_item`, el orden es
// cronológico, no manual.
export interface WantToListenRowActions {
  busy: boolean;
  remove: (id: string) => void;
  /** Estado de recorrido de un artista, resuelto por lote (`useJourneyStatuses`). */
  journeyStatus: (artistId: string) => JourneyStatus;
  journeyAdded: (artistId: string) => void;
  journeyError: (artistId: string) => void;
}

export interface WantToListenRendererProps {
  entries: WantToListenEntry[];
  actions: WantToListenRowActions;
}
