import type { DiaryAudience, Favorite } from "@/lib/api/schemas";

// Acciones sobre los favoritos de una sección, resueltas por `FavoritesWall`.
// Compartidas por los tres modos de visualización.
export interface FavoritesRowActions {
  readOnly?: boolean;
  selectionMode?: boolean;
  selectedIds: Set<string>;
  busyId: string | null;
  /** Ficha cuyo último cambio de audiencia o quitar falló: muestra el aviso de error junto a ella. */
  errorId: string | null;
  bulkBusy: boolean;
  onToggleSelect: (id: string) => void;
  onAudienceChange: (favorite: Favorite, audience: DiaryAudience) => void;
  onRemove: (favorite: Favorite) => void;
}

export interface FavoritesRendererProps {
  favorites: Favorite[];
  actions: FavoritesRowActions;
  /** Ids de los favoritos cuya carátula se carga con prioridad (los de arriba, sin scroll). */
  priorityIds?: ReadonlySet<string>;
}
