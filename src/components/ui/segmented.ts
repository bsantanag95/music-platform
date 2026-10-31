// Clases compartidas de controles segmentados y enlaces secundarios (openspec: refine-album-page-phase1, D5 y D6).
// Son clases y no un componente porque los controles mezclan botones con estado local (`aria-pressed`) y enlaces con
// el estado en la URL (`aria-current`): las dos marcas de la opción activa se cubren aquí.

/** Grupo con borde que envuelve las opciones. */
export const SEGMENT_GROUP = "flex w-fit max-w-full overflow-x-auto rounded border border-ink-border [scrollbar-width:none]";

/** Una opción del grupo; la activa queda sobre la superficie. */
export const SEGMENT_OPTION =
  "whitespace-nowrap px-2.5 py-1 font-data text-xs text-paper-muted transition-colors hover:text-paper aria-pressed:bg-ink-surface aria-pressed:text-paper aria-[current=page]:bg-ink-surface aria-[current=page]:text-paper aria-[current=true]:bg-ink-surface aria-[current=true]:text-paper";

/** Enlace secundario: neutro en reposo, ámbar con el cursor o el foco (regla de rareza del ámbar, DESIGN.md). */
export const SECONDARY_LINK =
  "text-paper underline decoration-ink-border underline-offset-2 transition-colors hover:text-amber hover:decoration-amber focus-visible:text-amber";
