"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ListenEntry } from "@/lib/api/schemas";

// Puente entre la lista del diario y su riel (openspec: redesign-diary-page, D10).
// La página es un server component y los dos son hermanos, así que no comparten
// estado por props: la lista, dueña de los filtros y de la caché, registra cómo
// aplicar una fecha y cómo recibir una escucha recién creada; el riel los usa
// para «Ir a» y «Anotar». La lista además publica la fecha activa para que el
// riel marque el atajo elegido.
interface DiaryHandlers {
  setDate: (year: string, month: string) => void;
  addEntry: (entry: ListenEntry) => void;
}

interface DiaryBridgeValue {
  /** Valor del control de Fecha activo en la lista: `""`, `"2026"` o `"2026-9"`. */
  activeDate: string;
  publishDate: (value: string) => void;
  register: (handlers: DiaryHandlers) => () => void;
  setDate: (year: string, month: string) => void;
  addEntry: (entry: ListenEntry) => void;
}

const DiaryBridgeContext = createContext<DiaryBridgeValue | null>(null);

export function DiaryBridgeProvider({ children }: { children: ReactNode }) {
  const handlers = useRef<DiaryHandlers | null>(null);
  const [activeDate, setActiveDate] = useState("");

  const register = useCallback((next: DiaryHandlers) => {
    handlers.current = next;
    return () => {
      if (handlers.current === next) handlers.current = null;
    };
  }, []);
  const setDate = useCallback((year: string, month: string) => handlers.current?.setDate(year, month), []);
  const addEntry = useCallback((entry: ListenEntry) => handlers.current?.addEntry(entry), []);

  const value = useMemo(
    () => ({ activeDate, publishDate: setActiveDate, register, setDate, addEntry }),
    [activeDate, register, setDate, addEntry],
  );
  return <DiaryBridgeContext.Provider value={value}>{children}</DiaryBridgeContext.Provider>;
}

export function useDiaryBridge(): DiaryBridgeValue | null {
  return useContext(DiaryBridgeContext);
}

/** Lado de la lista: registra sus manejadores y publica la fecha activa. Sin proveedor no hace nada. */
export function useDiaryBridgeRegistration(handlers: DiaryHandlers, activeDate: string) {
  const bridge = useDiaryBridge();
  const latest = useRef(handlers);
  useEffect(() => {
    latest.current = handlers;
  });

  useEffect(() => {
    if (!bridge) return;
    return bridge.register({
      setDate: (year, month) => latest.current.setDate(year, month),
      addEntry: (entry) => latest.current.addEntry(entry),
    });
    // `register` es estable; `bridge` cambia con `activeDate` y no hace falta re-registrar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bridge?.register]);

  const publish = bridge?.publishDate;
  useEffect(() => {
    publish?.(activeDate);
  }, [publish, activeDate]);
}
