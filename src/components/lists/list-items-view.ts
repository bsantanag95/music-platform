import type { ListEntityType, UserListItem } from "@/lib/api/schemas";

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
}
