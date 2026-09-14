"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ARTIST_JOURNEY_VIEW_MODE_STORAGE_KEY,
  DEFAULT_ARTIST_JOURNEY_VIEW_MODE,
  parseArtistJourneyViewMode,
  type ArtistJourneyViewMode,
} from "./artist-journey-view-mode";

// Preferencia global del visitante para el modo de visualización del listado
// de recorridos, calcada de `useWantToListenViewMode`. Vive solo en
// `localStorage`; el primer render (y el SSR) usan el modo por defecto, y la
// reconciliación con lo guardado ocurre tras el montaje. Toda lectura/
// escritura va envuelta en try/catch — en modo privado o con el
// almacenamiento bloqueado el acceso puede lanzar.
export function useArtistJourneyViewMode(): readonly [
  ArtistJourneyViewMode,
  (next: ArtistJourneyViewMode) => void,
] {
  const [mode, setMode] = useState<ArtistJourneyViewMode>(DEFAULT_ARTIST_JOURNEY_VIEW_MODE);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(ARTIST_JOURNEY_VIEW_MODE_STORAGE_KEY);
      const parsed = parseArtistJourneyViewMode(stored);
      if (parsed !== mode) setMode(parsed);
    } catch {
      // almacenamiento no disponible: se mantiene el modo por defecto
    }
    // Solo al montar: la preferencia no cambia por fuera de este hook.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = useCallback((next: ArtistJourneyViewMode) => {
    setMode(next);
    try {
      window.localStorage.setItem(ARTIST_JOURNEY_VIEW_MODE_STORAGE_KEY, next);
    } catch {
      // no se pudo persistir: el cambio vale para esta sesión
    }
  }, []);

  return [mode, update] as const;
}
