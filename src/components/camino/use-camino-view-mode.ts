"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CAMINO_VIEW_MODE_STORAGE_KEY,
  DEFAULT_CAMINO_VIEW_MODE,
  parseCaminoViewMode,
  type CaminoViewMode,
} from "./camino-view-mode";

// Preferencia global del visitante para el modo de visualización de "Mis
// Caminos", calcada de `useArtistJourneyViewMode`. Vive solo en
// `localStorage`; el primer render (y el SSR) usan el modo por defecto, y la
// reconciliación con lo guardado ocurre tras el montaje. Toda lectura/
// escritura va envuelta en try/catch — en modo privado o con el
// almacenamiento bloqueado el acceso puede lanzar.
//
// El tercer elemento, `ready`, dice si ya se leyó la preferencia: hasta entonces el listado muestra un marcador en vez de
// pintar Detallada y saltar al modo guardado (openspec: refine-progress-page-phase1, D1).
export function useCaminoViewMode(): readonly [CaminoViewMode, (next: CaminoViewMode) => void, boolean] {
  const [mode, setMode] = useState<CaminoViewMode>(DEFAULT_CAMINO_VIEW_MODE);

  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(CAMINO_VIEW_MODE_STORAGE_KEY);
      const parsed = parseCaminoViewMode(stored);
      if (parsed !== mode) setMode(parsed);
    } catch {
      // almacenamiento no disponible: se mantiene el modo por defecto
    }
    setReady(true);
    // Solo al montar: la preferencia no cambia por fuera de este hook.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = useCallback((next: CaminoViewMode) => {
    setMode(next);
    try {
      window.localStorage.setItem(CAMINO_VIEW_MODE_STORAGE_KEY, next);
    } catch {
      // no se pudo persistir: el cambio vale para esta sesión
    }
  }, []);

  return [mode, update, ready] as const;
}
