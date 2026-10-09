"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "@/i18n/navigation";

// Acciones del pie de los paneles del diálogo "Añadir". Antes mezclaban el `Button` secundario
// grande (tipografía display, el de los formularios de página) con enlaces punteados sueltos;
// ahora siguen el lenguaje del propio diálogo: controles compactos en mono, como los chips.

/** Fila del pie: acciones a la izquierda, el enlace "Ver …" empujado a la derecha. */
export function PanelFooter({ children, divided = true }: { children: ReactNode; divided?: boolean }) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${divided ? "border-t border-ink-border pt-3" : ""}`}>
      {children}
    </div>
  );
}

/** Acción compacta del panel ("Elegir otro", "Deshacer", "Agregar a esta lista"…). */
export function PanelAction({ className = "", type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={`inline-flex items-center gap-1.5 rounded-md border border-ink-border bg-ink/60 px-3 py-1.5 font-data text-xs text-paper transition-colors hover:border-paper-muted/60 hover:bg-ink disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}

/** Salida a la página correspondiente ("Ver mi diario →"): texto con flecha, al final de la fila. */
export function PanelLink({ href, onClick, children }: { href: string; onClick?: () => void; children: ReactNode }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="group ml-auto inline-flex items-center gap-1 rounded-sm px-1 py-1.5 font-data text-xs text-paper-muted transition-colors hover:text-amber"
    >
      {children}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5"
      >
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </Link>
  );
}
