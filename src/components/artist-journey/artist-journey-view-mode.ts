// Vocabulario de modos de visualización del listado de recorridos, calcado de
// `want-to-listen-view-mode.ts`. Módulo sin "use client" para que lo importen
// tanto componentes de servidor como de cliente y las pruebas.

export type ArtistJourneyViewMode = "detailed" | "index" | "graphic";

export const ARTIST_JOURNEY_VIEW_MODES: ArtistJourneyViewMode[] = ["detailed", "index", "graphic"];

/** Modo por defecto cuando el visitante no tiene preferencia guardada. */
export const DEFAULT_ARTIST_JOURNEY_VIEW_MODE: ArtistJourneyViewMode = "detailed";

/** Clave de `localStorage`. Preferencia global del visitante. */
export const ARTIST_JOURNEY_VIEW_MODE_STORAGE_KEY = "music-platform:artist-journey-view-mode";

export function parseArtistJourneyViewMode(value: string | null | undefined): ArtistJourneyViewMode {
  return ARTIST_JOURNEY_VIEW_MODES.includes(value as ArtistJourneyViewMode)
    ? (value as ArtistJourneyViewMode)
    : DEFAULT_ARTIST_JOURNEY_VIEW_MODE;
}
