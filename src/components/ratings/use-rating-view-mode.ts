"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_RATING_VIEW_MODE,
  RATING_VIEW_MODE_STORAGE_KEY,
  parseRatingViewMode,
  type RatingViewMode,
} from "./rating-view-mode";

// Preferencia global del modo de visualización de "Mis valoraciones", calcada de
// `useFavoriteViewMode`. Vive solo en `localStorage`; el primer render (y el SSR) usan el
// modo por defecto y la reconciliación con lo guardado ocurre tras el montaje. Toda
// lectura/escritura va envuelta en try/catch — en modo privado o con el almacenamiento
// bloqueado el acceso puede lanzar.
//
// El tercer elemento, `ready`, dice si ya se leyó la preferencia: hasta entonces `mode` es el
// defecto y no la elección de la persona, así que quien renderiza el listado debe esperar (con un
// marcador) en vez de pintar el defecto y saltar después al modo guardado.
export function useRatingViewMode(): readonly [RatingViewMode, (next: RatingViewMode) => void, boolean] {
  const [mode, setMode] = useState<RatingViewMode>(DEFAULT_RATING_VIEW_MODE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(RATING_VIEW_MODE_STORAGE_KEY);
      const parsed = parseRatingViewMode(stored);
      if (parsed !== mode) setMode(parsed);
    } catch {
      // almacenamiento no disponible: se mantiene el modo por defecto
    }
    setReady(true);
    // Solo al montar: la preferencia no cambia por fuera de este hook.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = useCallback((next: RatingViewMode) => {
    setMode(next);
    try {
      window.localStorage.setItem(RATING_VIEW_MODE_STORAGE_KEY, next);
    } catch {
      // no se pudo persistir: el cambio vale para esta sesión
    }
  }, []);

  return [mode, update, ready] as const;
}
