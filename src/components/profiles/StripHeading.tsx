import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";

interface StripHeadingProps {
  id: string;
  children: ReactNode;
  /** Enlace discreto a la vista completa, alineado a la derecha del rótulo. */
  link?: { href: string; label: string; ariaLabel?: string };
}

// Rótulo de cada parte de la franja de identidad (openspec:
// redesign-user-profile-phase1): tipografía de datos en mayúsculas, sin
// subtítulo, con un enlace opcional a la vista completa. Comparte el estilo con
// el rótulo «Identidad musical» de la cabecera.
export function StripHeading({ id, children, link }: StripHeadingProps) {
  return (
    <h2
      id={id}
      className="mb-3.5 flex items-baseline justify-between gap-3 font-data text-[0.6875rem] uppercase tracking-[0.12em] text-paper-muted"
    >
      <span>{children}</span>
      {link && (
        <Link
          href={link.href}
          aria-label={link.ariaLabel}
          className="normal-case tracking-normal transition-colors hover:text-amber"
        >
          {link.label} <span aria-hidden="true">→</span>
        </Link>
      )}
    </h2>
  );
}
