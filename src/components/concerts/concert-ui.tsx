import type { ReactNode } from "react";

// Piezas visuales que comparten las listas y los formularios de conciertos: la pestaña del artista, Mis conciertos, la
// página de conciertos de un perfil y los dos diálogos. Una sola anatomía de fila (fecha · contenido · acción) y un solo
// estilo de campo, para que las cuatro superficies se lean como la misma sección.

/** Encabezado de un grupo de filas (Próximos, un año, Por confirmar). */
export const CONCERT_SECTION_HEADING = "flex items-baseline gap-3 border-b border-ink-border pb-1.5";

/**
 * Fila de una lista de conciertos. En pantallas angostas la fecha va arriba, a todo el ancho, y la acción a la derecha
 * del contenido; desde `sm`, la fecha es una columna fija a la izquierda.
 */
export const CONCERT_ROW = "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-0 gap-y-1 py-3 sm:gap-x-4 sm:grid-cols-[6.5rem_minmax(0,1fr)_auto]";

/** Celda de fecha de la fila: cifras tabulares, sin partirse, alineada con la primera línea del título. */
export const CONCERT_ROW_DATE = "col-span-2 whitespace-nowrap font-data text-xs tabular-nums text-paper-muted sm:col-span-1 sm:pt-1";

/** Etiqueta chica junto al título (Festival, la audiencia de un recuerdo). */
export const CONCERT_BADGE =
  "rounded border border-ink-border px-1.5 py-px font-data text-[0.65rem] uppercase tracking-wide text-paper-muted";

/** Botón chico con borde de una fila (Estuve ahí, Enlazar). */
export const CONCERT_ROW_BUTTON =
  "inline-flex min-h-8 items-center gap-1.5 rounded border border-ink-border px-2.5 font-data text-xs uppercase tracking-wide text-paper-muted transition-colors hover:border-amber hover:text-paper disabled:cursor-not-allowed disabled:opacity-50";

/** Campo de un formulario de concierto: sobre el fondo del diálogo, con el borde en rojo si el dato es inválido. */
export const CONCERT_FIELD =
  "w-full rounded border border-ink-border bg-ink px-2.5 py-2 font-body text-base text-paper transition-colors placeholder:text-paper-muted/70 hover:border-paper-muted/50 disabled:opacity-50 aria-[invalid=true]:border-danger sm:text-sm";

/** Etiqueta de un campo, con el campo debajo. */
export const CONCERT_LABEL = "flex flex-col gap-1.5 font-data text-xs text-paper-muted";

/** Etiqueta del selector de país (`CountryPicker` pone el campo debajo por su cuenta): la misma letra que el resto. */
export const CONCERT_PICKER_LABEL = "font-data text-xs text-paper-muted";

/** Pie de un diálogo de concierto: queda a la vista mientras el formulario se desplaza. */
export const CONCERT_DIALOG_FOOTER =
  "sticky -bottom-6 -mx-6 -mb-6 flex flex-wrap items-center justify-end gap-2 border-t border-ink-border bg-ink-surface px-6 py-3";

interface IconProps {
  className?: string;
}

function Icon({ className = "", children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      {children}
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </Icon>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Icon>
  );
}

/** Audiencia de un recuerdo (candado o personas), con los mismos trazos que el resto de la app, en 12 px. */
export function ConcertAudienceIcon({ audience }: { audience: "private" | "followers" }) {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
      {audience === "private" ? (
        <>
          <rect x="3" y="7" width="10" height="7" rx="1.5" />
          <path d="M5.5 7V5a2.5 2.5 0 015 0v2" />
        </>
      ) : (
        <>
          <circle cx="6" cy="5.5" r="2.3" />
          <path d="M1.8 13c.4-2.4 2-3.6 4.2-3.6s3.8 1.2 4.2 3.6" />
          <path d="M10.5 3.6a2.2 2.2 0 010 4M12 9.6c1.4.5 2.2 1.6 2.4 3.4" />
        </>
      )}
    </svg>
  );
}
