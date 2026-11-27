import type { ReactNode } from "react";

// Distribución de la búsqueda rápida (openspec: redesign-search-phase1, design D1). Arriba, a todo el ancho, las
// pestañas con la cifra. Desde `lg`, los resultados ocupan 8 de 12 columnas y la columna lateral (filtros, «Acotar»)
// las 4 restantes, fija bajo el Header. Por debajo de `lg` hay una sola columna y la lateral va antes que los
// resultados (orden del DOM), así los filtros no quedan al final de 25 filas. Un solo render, sin duplicar enlaces.
// Sin lateral, los resultados conservan sus 8 columnas: es el sitio que la fase 2 llena con «x en otros tipos».
export function ResultsLayout({
  summary,
  aside,
  children,
}: {
  summary: ReactNode;
  /** Contenido de la columna lateral; `null` si el tipo no tiene nada que mostrar ahí. */
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid w-full grid-cols-1 gap-y-6 lg:grid-cols-12 lg:gap-x-12 lg:gap-y-8 xl:gap-x-16">
      <div className="min-w-0 lg:col-span-12">{summary}</div>
      {aside ? (
        <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-24 lg:col-span-4 lg:col-start-9 lg:row-start-2 lg:self-start">
          {aside}
        </div>
      ) : null}
      <div className="flex min-w-0 flex-col gap-6 lg:col-span-8 lg:col-start-1 lg:row-start-2">{children}</div>
    </div>
  );
}

/** Panel de la columna lateral desde `lg` (borde y fondo); por debajo, sin caja, sobre los resultados. */
export function AsidePanel({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 lg:rounded-xl lg:border lg:border-ink-border lg:bg-ink-surface/60 lg:p-5">
      {children}
    </div>
  );
}
