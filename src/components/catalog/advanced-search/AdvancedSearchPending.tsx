"use client";

import { createContext, useContext, useTransition, type ReactNode, type TransitionStartFunction } from "react";

// Estado de un envío de la búsqueda avanzada en curso (openspec: speed-up-search). Una búsqueda
// nueva cambia solo la URL de la misma página: Next no vuelve a mostrar `loading.tsx` y, sin esto,
// la página queda igual hasta que llega la nueva y parece que no pasó nada. El proveedor envuelve
// el formulario y los resultados para que el envío deshabilite el botón y atenúe lo anterior sin
// convertir la página en componente cliente.

type Pending = readonly [isPending: boolean, startTransition: TransitionStartFunction];

const PendingContext = createContext<Pending | null>(null);

export function AdvancedSearchPendingProvider({ children }: { children: ReactNode }) {
  const transition = useTransition();
  return <PendingContext.Provider value={transition}>{children}</PendingContext.Provider>;
}

/** La transición compartida; fuera del proveedor (tests, otro uso), una propia. */
export function useAdvancedSearchTransition(): Pending {
  const own = useTransition();
  return useContext(PendingContext) ?? own;
}

/** Resultados anteriores: atenuados y `aria-busy` mientras llega la búsqueda nueva. */
export function PendingResults({ label, children }: { label: string; children: ReactNode }) {
  const [isPending] = useAdvancedSearchTransition();
  return (
    <section
      aria-label={label}
      aria-busy={isPending || undefined}
      className={`flex w-full flex-col gap-6 transition-opacity ${isPending ? "pointer-events-none opacity-50" : ""}`}
    >
      {children}
    </section>
  );
}
