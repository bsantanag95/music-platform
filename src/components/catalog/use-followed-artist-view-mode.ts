"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_FOLLOWED_ARTIST_VIEW_MODE,
  FOLLOWED_ARTIST_VIEW_MODE_STORAGE_KEY,
  parseFollowedArtistViewMode,
  type FollowedArtistViewMode,
} from "./followed-artist-view-mode";

// Preferencia global del visitante para el modo de visualización de
// "Artistas que sigo", calcado de `useFavoriteViewMode`. Vive solo en
// `localStorage`; el primer render (y el SSR) usan el modo por defecto, y la
// reconciliación con lo guardado ocurre tras el montaje. Toda lectura/escritura
// va envuelta en try/catch — en modo privado o con el almacenamiento bloqueado
// el acceso puede lanzar.
export function useFollowedArtistViewMode(): readonly [
  FollowedArtistViewMode,
  (next: FollowedArtistViewMode) => void,
] {
  const [mode, setMode] = useState<FollowedArtistViewMode>(DEFAULT_FOLLOWED_ARTIST_VIEW_MODE);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(FOLLOWED_ARTIST_VIEW_MODE_STORAGE_KEY);
      const parsed = parseFollowedArtistViewMode(stored);
      if (parsed !== mode) setMode(parsed);
    } catch {
      // almacenamiento no disponible: se mantiene el modo por defecto
    }
    // Solo al montar: la preferencia no cambia por fuera de este hook.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = useCallback((next: FollowedArtistViewMode) => {
    setMode(next);
    try {
      window.localStorage.setItem(FOLLOWED_ARTIST_VIEW_MODE_STORAGE_KEY, next);
    } catch {
      // no se pudo persistir: el cambio vale para esta sesión
    }
  }, []);

  return [mode, update] as const;
}
