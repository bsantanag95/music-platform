import type { ReactNode } from "react";
import type { QuickAction } from "./types";

// Glifos de las acciones del diálogo "Añadir" (trazo simple, `currentColor`, mismo
// patrón que `QuickLinkIcons`). Decorativos: cada chip lleva siempre su texto.

function Glyph({ children, className }: { children: ReactNode; className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

const PATHS: Record<QuickAction, ReactNode> = {
  // Auriculares
  listen: (
    <>
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M21 19a2 2 0 0 1-2 2h-1v-6h3zM3 19a2 2 0 0 0 2 2h1v-6H3z" />
    </>
  ),
  // Estrella
  rate: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z" />,
  // Corazón
  favorite: (
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" />
  ),
  // Reloj
  pending: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  // Vinilo
  collection: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  // Hitos en fila (mismo motivo que "Recorridos" en Inicio)
  journey: (
    <>
      <circle cx="5" cy="12" r="2.5" />
      <circle cx="19" cy="12" r="2.5" />
      <path d="M7.5 12h2M14.5 12h2" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  // Lista con un "+": agregar a una lista existente
  addToList: (
    <>
      <path d="M4 6h11M4 12h11M4 18h7" />
      <path d="M17 15v6M14 18h6" />
    </>
  ),
  // Lista nueva
  newList: (
    <>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <path d="M3 6h.01M3 12h.01M3 18h.01" />
    </>
  ),
  // Ruta entre dos puntos (mismo motivo que "Caminos" en Inicio)
  newCamino: (
    <>
      <circle cx="6" cy="19" r="2.5" />
      <path d="M8.5 19H16a3.5 3.5 0 0 0 0-7H8a3.5 3.5 0 0 1 0-7h7.5" />
      <circle cx="18" cy="5" r="2.5" />
    </>
  ),
};

export function QuickActionIcon({ action, className = "size-3.5" }: { action: QuickAction; className?: string }) {
  return <Glyph className={className}>{PATHS[action]}</Glyph>;
}
