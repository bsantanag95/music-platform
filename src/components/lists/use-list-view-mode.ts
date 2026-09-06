"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_LIST_VIEW_MODE,
  LIST_VIEW_MODE_STORAGE_KEY,
  parseListViewMode,
  type ListViewMode,
} from "./list-view-mode";

// Preferencia global del visitante para el modo de visualización del detalle de
// lista. Vive solo en `localStorage`: no viaja al servidor ni afecta a otros
// visitantes. El primer render (y el SSR) usan el modo por defecto; la
// reconciliación con lo guardado ocurre tras el montaje. Toda lectura/escritura
// va envuelta en try/catch — en modo privado o con el almacenamiento bloqueado
// el acceso puede lanzar.
export function useListViewMode(): readonly [ListViewMode, (next: ListViewMode) => void] {
  const [mode, setMode] = useState<ListViewMode>(DEFAULT_LIST_VIEW_MODE);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LIST_VIEW_MODE_STORAGE_KEY);
      const parsed = parseListViewMode(stored);
      if (parsed !== mode) setMode(parsed);
    } catch {
      // almacenamiento no disponible: se mantiene el modo por defecto
    }
    // Solo al montar: la preferencia no cambia por fuera de este hook.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = useCallback((next: ListViewMode) => {
    setMode(next);
    try {
      window.localStorage.setItem(LIST_VIEW_MODE_STORAGE_KEY, next);
    } catch {
      // no se pudo persistir: el cambio vale para esta sesión
    }
  }, []);

  return [mode, update] as const;
}
