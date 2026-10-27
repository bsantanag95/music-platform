"use client";

import { useCallback, useEffect, useState } from "react";

export type ProgressFilterValues = Record<string, string>;

function writeToUrl(values: ProgressFilterValues, defaults: ProgressFilterValues) {
  const params = new URLSearchParams(window.location.search);
  for (const [key, value] of Object.entries(values)) {
    const trimmed = value.trim();
    if (trimmed && trimmed !== defaults[key]) params.set(key, trimmed);
    else params.delete(key);
  }
  const query = params.toString();
  const next = `${window.location.pathname}${query ? `?${query}` : ""}`;
  if (next !== `${window.location.pathname}${window.location.search}`) {
    window.history.replaceState(window.history.state, "", next);
  }
}

// Filtros locales de un listado de /me/progress (búsqueda, orden y estado) reflejados en la URL con `replaceState`, sin
// crear historial y conservando `tab`; solo se escribe lo que difiere del defecto (openspec: refine-progress-page-phase1,
// D5). La página valida los parámetros y los pasa como `initial`; el filtrado sigue siendo local.
export function useProgressFilters<T extends ProgressFilterValues>(defaults: T, initial?: Partial<T>) {
  const [values, setValues] = useState<T>(() => ({ ...defaults, ...initial }));

  useEffect(() => {
    writeToUrl(values, defaults);
    // `defaults` es una constante del módulo que llama: solo importa el cambio de valores.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values]);

  const set = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues((current) => (current[key] === value ? current : { ...current, [key]: value }));
  }, []);

  return [values, set] as const;
}
