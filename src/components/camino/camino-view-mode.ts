// Vocabulario de modos de visualización de la pestaña "Mis Caminos", calcado
// de `artist-journey-view-mode.ts`. Módulo sin "use client" para que lo
// importen tanto componentes de servidor como de cliente y las pruebas.

export type CaminoViewMode = "detailed" | "index" | "graphic";

export const CAMINO_VIEW_MODES: CaminoViewMode[] = ["detailed", "index", "graphic"];

/** Modo por defecto cuando el visitante no tiene preferencia guardada. */
export const DEFAULT_CAMINO_VIEW_MODE: CaminoViewMode = "detailed";

/** Clave de `localStorage`. Preferencia global del visitante. */
export const CAMINO_VIEW_MODE_STORAGE_KEY = "music-platform:camino-view-mode";

export function parseCaminoViewMode(value: string | null | undefined): CaminoViewMode {
  return CAMINO_VIEW_MODES.includes(value as CaminoViewMode)
    ? (value as CaminoViewMode)
    : DEFAULT_CAMINO_VIEW_MODE;
}
