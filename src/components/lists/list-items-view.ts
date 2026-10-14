import type { ListEntityType, UserListItem } from "@/lib/api/schemas";
import type { ListQuickActions } from "./ListItemQuickActions";

// Acciones de gestión por ítem, resueltas por `ListItemsView` a partir de los
// helpers de orden y de `onReorder`/`onRemove`. `null` en modo lectura.
export interface ListItemsRowActions {
  busy: boolean;
  move: (id: string, delta: -1 | 1) => void;
  moveToEdge: (id: string, edge: "start" | "end") => void;
  remove: (id: string) => void;
}

export interface ListItemsRendererProps {
  items: UserListItem[];
  entityType: ListEntityType;
  actions: ListItemsRowActions | null;
  /** Menú de acciones por disco en la lista de álbumes de otra persona; `null` en el resto. */
  quickActions?: ListQuickActions | null;
  /** Nota por ítem (id del ítem → texto) bajo el artista: por qué está en una colección ("Cumple 70 años · 15 oct 1956"). */
  notes?: Record<string, string>;
}
