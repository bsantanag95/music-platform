// Vocabulario de modos de visualización de "Artistas que sigo", calcado de
// `favorite-view-mode.ts`. Solo dos modos (a diferencia del trío
// Detallada/Índice/Gráfico de Favoritos/Quiero Escuchar): acá cada fila solo
// tiene foto + nombre + botón de seguir, así que "Detallada" sería
// indistinguible de "Índice" — no vale la pena el tercer modo. Módulo sin
// "use client" para que lo importen tanto componentes de servidor como de
// cliente y las pruebas.

export type FollowedArtistViewMode = "index" | "graphic";

export const FOLLOWED_ARTIST_VIEW_MODES: FollowedArtistViewMode[] = ["index", "graphic"];

/** Modo por defecto cuando el visitante no tiene preferencia guardada. */
export const DEFAULT_FOLLOWED_ARTIST_VIEW_MODE: FollowedArtistViewMode = "index";

/** Clave de `localStorage`. Preferencia global del visitante. */
export const FOLLOWED_ARTIST_VIEW_MODE_STORAGE_KEY = "music-platform:followed-artist-view-mode";

export function parseFollowedArtistViewMode(
  value: string | null | undefined,
): FollowedArtistViewMode {
  return FOLLOWED_ARTIST_VIEW_MODES.includes(value as FollowedArtistViewMode)
    ? (value as FollowedArtistViewMode)
    : DEFAULT_FOLLOWED_ARTIST_VIEW_MODE;
}
