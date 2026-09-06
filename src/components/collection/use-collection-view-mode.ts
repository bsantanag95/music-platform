"use client";

import { useCallback, useEffect, useState } from "react";
import {
  COLLECTION_VIEW_MODE_STORAGE_KEY,
  DEFAULT_COLLECTION_VIEW_MODE,
  parseCollectionViewMode,
  type CollectionViewMode,
} from "./collection-view-mode";

// Preferencia global del visitante para el modo de visualización de la
// colección. Vive solo en `localStorage`: no viaja al servidor ni afecta a otros
// visitantes. El primer render (y el SSR) usan el modo por defecto; la
// reconciliación con lo guardado ocurre tras el montaje. Toda lectura/escritura
// va envuelta en try/catch — en modo privado o con el almacenamiento bloqueado
// el acceso puede lanzar.
export function useCollectionViewMode(): readonly [
  CollectionViewMode,
  (next: CollectionViewMode) => void,
] {
  const [mode, setMode] = useState<CollectionViewMode>(DEFAULT_COLLECTION_VIEW_MODE);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(COLLECTION_VIEW_MODE_STORAGE_KEY);
      const parsed = parseCollectionViewMode(stored);
      if (parsed !== mode) setMode(parsed);
    } catch {
      // almacenamiento no disponible: se mantiene el modo por defecto
    }
    // Solo al montar: la preferencia no cambia por fuera de este hook.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = useCallback((next: CollectionViewMode) => {
    setMode(next);
    try {
      window.localStorage.setItem(COLLECTION_VIEW_MODE_STORAGE_KEY, next);
    } catch {
      // no se pudo persistir: el cambio vale para esta sesión
    }
  }, []);

  return [mode, update] as const;
}
