"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_FAVORITE_VIEW_MODE,
  FAVORITE_VIEW_MODE_STORAGE_KEY,
  parseFavoriteViewMode,
  type FavoriteViewMode,
} from "./favorite-view-mode";

// Preferencia global del visitante para el modo de visualización de
// Favoritos, calcado de `useWantToListenViewMode`. Vive solo en
// `localStorage`; el primer render (y el SSR) usan el modo por defecto, y la
// reconciliación con lo guardado ocurre tras el montaje. Toda lectura/escritura
// va envuelta en try/catch — en modo privado o con el almacenamiento bloqueado
// el acceso puede lanzar.
export function useFavoriteViewMode(): readonly [
  FavoriteViewMode,
  (next: FavoriteViewMode) => void,
] {
  const [mode, setMode] = useState<FavoriteViewMode>(DEFAULT_FAVORITE_VIEW_MODE);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(FAVORITE_VIEW_MODE_STORAGE_KEY);
      const parsed = parseFavoriteViewMode(stored);
      if (parsed !== mode) setMode(parsed);
    } catch {
      // almacenamiento no disponible: se mantiene el modo por defecto
    }
    // Solo al montar: la preferencia no cambia por fuera de este hook.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = useCallback((next: FavoriteViewMode) => {
    setMode(next);
    try {
      window.localStorage.setItem(FAVORITE_VIEW_MODE_STORAGE_KEY, next);
    } catch {
      // no se pudo persistir: el cambio vale para esta sesión
    }
  }, []);

  return [mode, update] as const;
}
