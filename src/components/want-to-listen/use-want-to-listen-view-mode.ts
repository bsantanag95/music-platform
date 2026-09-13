"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_WANT_TO_LISTEN_VIEW_MODE,
  WANT_TO_LISTEN_VIEW_MODE_STORAGE_KEY,
  parseWantToListenViewMode,
  type WantToListenViewMode,
} from "./want-to-listen-view-mode";

// Preferencia global del visitante para el modo de visualización de Want to
// Listen, calcado de `useListViewMode`. Vive solo en `localStorage`; el
// primer render (y el SSR) usan el modo por defecto, y la reconciliación con
// lo guardado ocurre tras el montaje. Toda lectura/escritura va envuelta en
// try/catch — en modo privado o con el almacenamiento bloqueado el acceso
// puede lanzar.
export function useWantToListenViewMode(): readonly [
  WantToListenViewMode,
  (next: WantToListenViewMode) => void,
] {
  const [mode, setMode] = useState<WantToListenViewMode>(DEFAULT_WANT_TO_LISTEN_VIEW_MODE);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(WANT_TO_LISTEN_VIEW_MODE_STORAGE_KEY);
      const parsed = parseWantToListenViewMode(stored);
      if (parsed !== mode) setMode(parsed);
    } catch {
      // almacenamiento no disponible: se mantiene el modo por defecto
    }
    // Solo al montar: la preferencia no cambia por fuera de este hook.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = useCallback((next: WantToListenViewMode) => {
    setMode(next);
    try {
      window.localStorage.setItem(WANT_TO_LISTEN_VIEW_MODE_STORAGE_KEY, next);
    } catch {
      // no se pudo persistir: el cambio vale para esta sesión
    }
  }, []);

  return [mode, update] as const;
}
