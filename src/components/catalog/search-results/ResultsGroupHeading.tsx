import type { ReactNode } from "react";

// Encabezado de un grupo de resultados («Otros artistas llamados «x»», «Más resultados», «Otras canciones con este
// título»), openspec: redesign-search-phase1, design D6. Es un `h3`: cuelga del `h2` oculto del resumen. En la búsqueda
// rápida lleva display en negrita, con más peso que los nombres de las filas, y la cantidad del grupo si se conoce. Con
// `compact` (búsqueda avanzada) conserva la etiqueta gris de siempre.
export function ResultsGroupHeading({
  children,
  count,
  compact = false,
}: {
  children: ReactNode;
  count?: number;
  compact?: boolean;
}) {
  if (compact) return <h3 className="font-display text-sm text-paper-muted">{children}</h3>;
  return (
    <h3 className="flex flex-wrap items-baseline gap-x-2.5 font-display text-xl font-bold tracking-[-0.01em] text-paper sm:text-[1.375rem]">
      <span className="min-w-0 wrap-break-word">{children}</span>
      {count !== undefined ? <span className="font-data text-xs font-normal text-paper-muted">{count}</span> : null}
    </h3>
  );
}
