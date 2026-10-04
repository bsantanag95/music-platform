// Vocabulario de modos de visualización de "Mis valoraciones", calcado de
// `favorite-view-mode.ts`. Módulo sin "use client" para que lo importen tanto
// componentes de servidor como de cliente y las pruebas.

export type RatingViewMode = "detailed" | "index" | "graphic";

export const RATING_VIEW_MODES: RatingViewMode[] = ["detailed", "index", "graphic"];

/**
 * Modo por defecto cuando la persona no tiene preferencia guardada. A diferencia de Favoritos y
 * Want to Listen (Detallada), la biblioteca de valoraciones abre en Gráfico: es lo que la
 * distingue de esas secciones.
 */
export const DEFAULT_RATING_VIEW_MODE: RatingViewMode = "graphic";

/** Clave de `localStorage`. Preferencia global del dispositivo. */
export const RATING_VIEW_MODE_STORAGE_KEY = "music-platform:rating-view-mode";

export function parseRatingViewMode(value: string | null | undefined): RatingViewMode {
  return RATING_VIEW_MODES.includes(value as RatingViewMode)
    ? (value as RatingViewMode)
    : DEFAULT_RATING_VIEW_MODE;
}
