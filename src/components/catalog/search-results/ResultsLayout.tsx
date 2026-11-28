import type { ReactNode } from "react";

// Distribución de la búsqueda rápida (openspec: redesign-search-phase1, design D1). Arriba, a todo el ancho, las
// pestañas con la cifra. Desde `lg`, los resultados ocupan 8 de 12 columnas y la columna lateral las 4 restantes, fija
// bajo el Header. Por debajo de `lg` hay una sola columna: `aside` (filtros, «Acotar») va antes de los resultados, así no
// queda al final de 25 filas. Sin lateral, los resultados conservan sus 8 columnas.
//
// `asideAfter` («x en otros tipos», redesign-search-phase2) es un desvío y no un filtro: en el teléfono va después de los
// resultados, y desde `lg`, en la columna fija bajo `aside`. Se pinta en los dos sitios y CSS muestra uno; el orden de
// lectura coincide así con el visual en ambos anchos. Quien lo pasa debe compartir sus datos entre los dos (`cache`).
export function ResultsLayout({
  summary,
  aside,
  asideAfter,
  children,
}: {
  summary: ReactNode;
  /** Filtros y «Acotar»; `null` si el tipo no tiene nada que mostrar ahí. */
  aside?: ReactNode;
  /** Lo que en el teléfono va después de los resultados. */
  asideAfter?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid w-full grid-cols-1 gap-y-6 lg:grid-cols-12 lg:gap-x-12 lg:gap-y-8 xl:gap-x-16">
      <div className="min-w-0 lg:col-span-12">{summary}</div>
      {aside || asideAfter ? (
        <div className={`${aside ? "flex" : "hidden lg:flex"} min-w-0 flex-col gap-4 empty:hidden lg:sticky lg:top-24 lg:col-span-4 lg:col-start-9 lg:row-start-2 lg:self-start`}>
          {aside}
          {asideAfter ? <div className="hidden flex-col gap-4 lg:flex">{asideAfter}</div> : null}
        </div>
      ) : null}
      <div className="flex min-w-0 flex-col gap-6 lg:col-span-8 lg:col-start-1 lg:row-start-2">{children}</div>
      {asideAfter ? <div className="flex min-w-0 flex-col gap-4 empty:hidden lg:hidden">{asideAfter}</div> : null}
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
