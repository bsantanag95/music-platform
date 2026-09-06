// Vocabulario de modos de visualización de la colección. Módulo sin "use client"
// para que lo importen tanto componentes de servidor como de cliente y las
// pruebas.

export type CollectionViewMode = "shelf" | "detailed" | "index";

export const COLLECTION_VIEW_MODES: CollectionViewMode[] = ["shelf", "detailed", "index"];

/** Modo por defecto cuando el visitante no tiene preferencia guardada. */
export const DEFAULT_COLLECTION_VIEW_MODE: CollectionViewMode = "shelf";

/** Clave de `localStorage`. Preferencia global del visitante, no por página. */
export const COLLECTION_VIEW_MODE_STORAGE_KEY = "music-platform:collection-view-mode";

export function parseCollectionViewMode(value: string | null | undefined): CollectionViewMode {
  return COLLECTION_VIEW_MODES.includes(value as CollectionViewMode)
    ? (value as CollectionViewMode)
    : DEFAULT_COLLECTION_VIEW_MODE;
}
