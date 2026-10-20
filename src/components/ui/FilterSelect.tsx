import type { ReactNode } from "react";

// Filtro compacto: en una barra con buscador, el buscador es la herramienta
// principal, así que estos `<select>` quedan deliberadamente más livianos —
// sin caja ni fondo propio, mono chico y apagado, apenas una regla inferior.
// `appearance-none` saca el cromo nativo del `<select>` (en Chrome/Windows
// dejaba un parche blanco al pasar el mouse, ajeno a la paleta) y dibujamos
// nuestra propia flecha para no perder la afordancia de "esto despliega
// opciones". Compartido entre `/me/diary` y `/me/feed` (ver
// openspec/changes/add-feed-filters).
//
// `label` (opcional) dibuja el nombre del filtro sobre el control, para que un "Todos" no quede
// sin contexto hasta abrir el menú. Es decorativo (`aria-hidden`): el `aria-label` ya nombra el
// select. Sin `label` el aspecto no cambia.
export function FilterSelect({
  value,
  onChange,
  ariaLabel,
  widthClassName,
  disabled = false,
  label,
  name,
  variant = "underline",
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  widthClassName: string;
  disabled?: boolean;
  label?: string;
  /** Nombre del campo: permite que el `<select>` viaje en un formulario `GET` sin JavaScript. */
  name?: string;
  /**
   * `underline` (por defecto): regla inferior, sin caja. `boxed`: caja con borde y fondo, a la altura de un
   * buscador de la misma barra, para que los filtros se lean como controles y no como texto suelto.
   */
  variant?: "underline" | "boxed";
  children: ReactNode;
}) {
  const boxed = variant === "boxed";
  const control = (
    <div className="relative">
      <select
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={ariaLabel}
        disabled={disabled}
        className={`filter-select appearance-none overflow-hidden text-ellipsis whitespace-nowrap font-data text-sm text-paper-muted transition-colors hover:text-paper disabled:opacity-50 ${
          boxed
            ? "rounded-md border border-ink-border bg-ink-surface py-2 pl-3 pr-8 hover:border-paper-muted/40"
            : "rounded border-b border-ink-border bg-transparent py-1.5 pl-0.5 pr-4"
        } ${widthClassName}`}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={`pointer-events-none absolute top-1/2 size-3 -translate-y-1/2 text-paper-muted ${boxed ? "right-3" : "right-0"}`}
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </div>
  );

  if (!label) return control;

  return (
    <div className="flex flex-col">
      <span
        aria-hidden="true"
        className="pl-0.5 font-data text-[0.65rem] uppercase tracking-wide text-paper-muted/70"
      >
        {label}
      </span>
      {control}
    </div>
  );
}
