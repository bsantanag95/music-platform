// Piezas de formulario compartidas por las altas y los editores de Láminas (openspec: refine-laminas-page-phase1): un mismo
// segmento para elegir formato, tipo y fuente, y las mismas clases de campo, en vez de selectores nativos en un formulario y
// segmentos en otro.

/** Grupo de opciones cortas (formato, tipo): en una fila a cualquier ancho. */
export const SEGMENT_ROW = "flex w-fit max-w-full gap-1 rounded border border-ink-border p-0.5";

/**
 * Grupo de opciones largas (de dónde salen): en pantallas angostas pasa a dos columnas y, con un número impar, la última ocupa
 * la fila entera, para que no quede una opción suelta.
 */
export const SEGMENT_GROUP = "grid grid-cols-2 gap-1 rounded border border-ink-border p-0.5 sm:flex sm:flex-wrap [&>*:last-child:nth-child(odd)]:col-span-2";

/** Una opción del grupo; la elegida queda sobre el borde. */
export const segmentOption = (active: boolean) =>
  `min-h-9 flex-1 whitespace-nowrap rounded px-3 py-1 font-data text-xs transition-colors disabled:opacity-50 ${active ? "bg-ink-border text-paper" : "text-paper-muted hover:text-paper"}`;

/** Campo de texto o selector. */
export const FIELD = "rounded border border-ink-border bg-ink px-3 py-2 font-body text-sm text-paper";
