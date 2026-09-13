import type { WantToListenEntry } from "@/lib/api/schemas";

// Acciones sobre las entradas de una sección, resueltas por `WantToListenList`.
// Sin reordenamiento: a diferencia de `user_list_item`, el orden es
// cronológico, no manual.
export interface WantToListenRowActions {
  busy: boolean;
  remove: (id: string) => void;
}

export interface WantToListenRendererProps {
  entries: WantToListenEntry[];
  actions: WantToListenRowActions;
}
