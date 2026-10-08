"use client";

import { createContext, useContext } from "react";
import type { QueryClient } from "@tanstack/react-query";

// Aviso de "algo cambió" de los paneles del diálogo de acciones rápidas. El diálogo vive en el
// Header, por encima de cualquier página: lo que se guarda desde ahí (escucha, valoración, marca,
// copia, lista, Camino…) no pasa por el componente que lo muestra, así que nadie más se entera.
// Fuera del diálogo (p. ej. `AddToListPanel` en la página de un álbum) el aviso no hace nada.
export const QuickActionsChangeContext = createContext<() => void>(() => {});

export function useNotifyQuickActionChange(): () => void {
  return useContext(QuickActionsChangeContext);
}

// El Header vive fuera de `<Providers>` (no hay `QueryClientProvider` en su árbol), así que el
// diálogo no invalida las queries directamente: emite este evento y `Providers` lo escucha.
export const OWN_DATA_CHANGED_EVENT = "quick-actions:own-data-changed";

export function emitOwnDataChanged(): void {
  window.dispatchEvent(new Event(OWN_DATA_CHANGED_EVENT));
}

// Series de TanStack Query con datos propios que una acción rápida puede alterar. Casi todas usan
// `staleTime: Infinity` con la página 1 sembrada por el servidor, así que sin invalidar no se
// enteran nunca (y la página siguiente, paginada por offset, repetiría entradas).
const OWN_DATA_PREFIXES = [
  ["home"],
  ["feed"],
  ["diary"],
  ["activity"],
  ["ratings"],
  ["favorites"],
  ["collection"],
  ["lists"],
  ["caminos"],
] as const;

export function invalidateOwnData(queryClient: QueryClient): void {
  for (const queryKey of OWN_DATA_PREFIXES) {
    void queryClient.invalidateQueries({ queryKey });
  }
}
