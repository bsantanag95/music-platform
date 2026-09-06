// Vocabulario de modos de visualización del detalle de una lista. Módulo sin
// "use client" para que lo importen tanto componentes de servidor como de
// cliente y las pruebas.

export type ListViewMode = "detailed" | "index" | "graphic";

export const LIST_VIEW_MODES: ListViewMode[] = ["detailed", "index", "graphic"];

/** Modo por defecto cuando el visitante no tiene preferencia guardada. */
export const DEFAULT_LIST_VIEW_MODE: ListViewMode = "detailed";

/** Clave de `localStorage`. Preferencia global del visitante, no por lista. */
export const LIST_VIEW_MODE_STORAGE_KEY = "music-platform:list-view-mode";

export function parseListViewMode(value: string | null | undefined): ListViewMode {
  return LIST_VIEW_MODES.includes(value as ListViewMode)
    ? (value as ListViewMode)
    : DEFAULT_LIST_VIEW_MODE;
}
