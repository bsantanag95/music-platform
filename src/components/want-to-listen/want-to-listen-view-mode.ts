// Vocabulario de modos de visualización de Want to Listen, calcado de
// `list-view-mode.ts`. Módulo sin "use client" para que lo importen tanto
// componentes de servidor como de cliente y las pruebas.

export type WantToListenViewMode = "detailed" | "index" | "graphic";

export const WANT_TO_LISTEN_VIEW_MODES: WantToListenViewMode[] = ["detailed", "index", "graphic"];

/** Modo por defecto cuando el visitante no tiene preferencia guardada. */
export const DEFAULT_WANT_TO_LISTEN_VIEW_MODE: WantToListenViewMode = "detailed";

/** Clave de `localStorage`. Preferencia global del visitante. */
export const WANT_TO_LISTEN_VIEW_MODE_STORAGE_KEY = "music-platform:want-to-listen-view-mode";

export function parseWantToListenViewMode(value: string | null | undefined): WantToListenViewMode {
  return WANT_TO_LISTEN_VIEW_MODES.includes(value as WantToListenViewMode)
    ? (value as WantToListenViewMode)
    : DEFAULT_WANT_TO_LISTEN_VIEW_MODE;
}
