import type { DiaryAudience, Favorite } from "@/lib/api/schemas";

// Acciones sobre los favoritos de una sección, resueltas por `FavoritesWall`.
// Compartidas por los tres modos de visualización.
export interface FavoritesRowActions {
  readOnly?: boolean;
  selectionMode?: boolean;
  selectedIds: Set<string>;
  busyId: string | null;
  bulkBusy: boolean;
  onToggleSelect: (id: string) => void;
  onAudienceChange: (favorite: Favorite, audience: DiaryAudience) => void;
  onRemove: (favorite: Favorite) => void;
}

export interface FavoritesRendererProps {
  favorites: Favorite[];
  actions: FavoritesRowActions;
}
