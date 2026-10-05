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
  children: ReactNode;
}) {
  const control = (
    <div className="relative">
      <select
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={ariaLabel}
        disabled={disabled}
        className={`filter-select appearance-none overflow-hidden text-ellipsis whitespace-nowrap rounded border-b border-ink-border bg-transparent py-1.5 pl-0.5 pr-4 font-data text-sm text-paper-muted transition-colors hover:text-paper disabled:opacity-50 ${widthClassName}`}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="pointer-events-none absolute right-0 top-1/2 size-3 -translate-y-1/2 text-paper-muted"
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
