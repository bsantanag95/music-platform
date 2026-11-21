import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";

interface SectionHeadingProps {
  /** `id` del `h2`, para el `aria-labelledby` de la sección. */
  id?: string;
  title: string;
  /** Una línea bajo el título: qué reúne la sección. */
  description?: string;
  /** Enlace «Ver …» a la derecha (debajo en pantallas angostas). */
  seeAll?: { href: string; label: string };
  /** Controles extra a la derecha (las flechas de un riel desplazable, unas pestañas). */
  actions?: ReactNode;
}

// Encabezado de sección de página: título de 30–40 px con su descripción, para que cada bloque tenga
// un peso claro en un contenedor ancho. Nació en Inicio (`redesign-anon-home-phase2`, como
// `HomeSectionHeading`) y lo comparte Explorar desde `redesign-explore-phase1`; los encabezados
// compactos de 20 px siguen siendo `SectionHeader` (que delega aquí con `size="page"`).
export function SectionHeading({ id, title, description, seeAll, actions }: SectionHeadingProps) {
  return (
    <div className="flex w-full flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
      <div className="flex min-w-0 flex-col gap-2">
        <h2
          id={id}
          className="text-balance font-display text-[clamp(1.875rem,2.8vw,2.5rem)] font-bold leading-[1.05] tracking-[-0.025em] text-paper"
        >
          {title}
        </h2>
        {description ? <p className="max-w-[60ch] font-body text-base text-paper-muted">{description}</p> : null}
      </div>
      {seeAll || actions ? (
        <div className="flex shrink-0 items-center gap-3">
          {seeAll ? (
            <Link
              href={seeAll.href}
              className="group inline-flex shrink-0 items-center gap-1.5 rounded-md py-1 font-data text-sm text-paper-muted transition-colors hover:text-amber"
            >
              {seeAll.label}
              <span aria-hidden="true" className="transition-transform duration-150 group-hover:translate-x-0.5">
                →
              </span>
            </Link>
          ) : null}
          {actions}
        </div>
      ) : null}
    </div>
  );
}
