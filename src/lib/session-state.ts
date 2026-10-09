"use client";

import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";

// Estado de un flujo corto que sobrevive a una recarga de la pestaña (`sessionStorage`), p. ej. el
// onboarding: los álbumes elegidos viven solo en memoria hasta el cierre y recargar los perdía. Se
// hidrata después del primer render para no desajustar el HTML del servidor, y todo acceso al
// almacenamiento va en try/catch (modo privado, almacenamiento bloqueado): sin él sigue siendo
// estado normal de React.

/** Lee un valor guardado; `undefined` si no hay, no se puede leer o no pasa la validación. */
function readStored<T>(key: string, isValid: (value: unknown) => value is T): T | undefined {
  try {
    const raw = window.sessionStorage.getItem(key);
    if (raw === null) return undefined;
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function writeStored(key: string, value: unknown) {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Sin almacenamiento: el flujo sigue funcionando en memoria.
  }
}

/** Borra todas las claves que empiezan por `prefix`. */
export function clearSessionState(prefix: string) {
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const key = window.sessionStorage.key(i);
      if (key?.startsWith(prefix)) keys.push(key);
    }
    for (const key of keys) window.sessionStorage.removeItem(key);
  } catch {
    // Nada que limpiar.
  }
}

/**
 * Como `useState`, pero con copia en `sessionStorage` bajo `key`. Con `key` nulo es `useState`
 * normal. Un valor guardado que no pasa `isValid` se descarta.
 */
export function useSessionState<T>(
  key: string | null,
  initial: T,
  isValid: (value: unknown) => value is T,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (key !== null) {
      const stored = readStored(key, isValid);
      // Hidratar tras el primer render evita desajustar el HTML del servidor.
      if (stored !== undefined) setValue(stored);
    }
    setHydrated(true);
    // `isValid` es una función de módulo estable; la clave solo cambia al cambiar de usuario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (key !== null && hydrated) writeStored(key, value);
  }, [key, hydrated, value]);

  const set = useCallback<Dispatch<SetStateAction<T>>>((next) => setValue(next), []);
  return [value, set];
}

export function isArrayOf<T>(item: (value: unknown) => value is T) {
  return (value: unknown): value is T[] => Array.isArray(value) && value.every(item);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
