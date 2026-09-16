// Vocabulario de modos de visualización de Favoritos, calcado de
// `want-to-listen-view-mode.ts`. Módulo sin "use client" para que lo importen
// tanto componentes de servidor como de cliente y las pruebas.

export type FavoriteViewMode = "detailed" | "index" | "graphic";

export const FAVORITE_VIEW_MODES: FavoriteViewMode[] = ["detailed", "index", "graphic"];

/** Modo por defecto cuando el visitante no tiene preferencia guardada. */
export const DEFAULT_FAVORITE_VIEW_MODE: FavoriteViewMode = "detailed";

/** Clave de `localStorage`. Preferencia global del visitante. */
export const FAVORITE_VIEW_MODE_STORAGE_KEY = "music-platform:favorite-view-mode";

export function parseFavoriteViewMode(value: string | null | undefined): FavoriteViewMode {
  return FAVORITE_VIEW_MODES.includes(value as FavoriteViewMode)
    ? (value as FavoriteViewMode)
    : DEFAULT_FAVORITE_VIEW_MODE;
}
