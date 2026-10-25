import type { ReactNode } from "react";

// Selector de la barra de la colección: caja a la altura del buscador con la etiqueta adentro ("Agrupar Sin agrupar"),
// para que cada control se lea con su nombre sin una fila de etiquetas aparte. Calcado del selector de orden de
// Pendientes (`WantToListenSortSelect`); el `<select>` es nativo (teclado y lector de pantalla del sistema) y la
// etiqueta visible también es su nombre accesible. `field-sizing: content` ajusta el ancho al valor elegido y no a la
// opción más larga, para que la barra quepa en una fila (donde no se soporta, el select toma el ancho habitual).
export function ToolbarSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="relative inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md border border-ink-border bg-ink-surface pl-3 pr-8 font-data text-xs text-paper-muted transition-colors focus-within:border-amber hover:border-paper-muted/40 [@media(pointer:coarse)]:h-11">
      <span>{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="filter-select cursor-pointer appearance-none bg-transparent font-data text-xs text-paper outline-none [field-sizing:content]"
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="pointer-events-none absolute right-3 top-1/2 size-3 -translate-y-1/2"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </label>
  );
}
