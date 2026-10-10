import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";

interface SectionHeaderProps {
  heading: string;
  /** Una línea que dice qué reúne la sección (o con qué regla), bajo el título. */
  description?: string;
  /** Enlace "Ver todo" a la derecha. */
  seeAll?: { href: string; label: string };
  /** Controles extra a la derecha (las flechas de un riel desplazable). */
  actions?: ReactNode;
  /** `id` del título, para `aria-labelledby` de la sección. */
  headingId?: string;
}

/** Encabezado común de las secciones de Explorar: título, descripción opcional y acciones. */
export function SectionHeader({ heading, description, seeAll, actions, headingId }: SectionHeaderProps) {
  return (
    <div className="flex w-full items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 id={headingId} className="font-display text-xl text-paper">
          {heading}
        </h2>
        {description ? <p className="font-body text-sm text-paper-muted">{description}</p> : null}
      </div>
      {seeAll || actions ? (
        <div className="flex shrink-0 items-center gap-3">
          {seeAll ? (
            <Link
              href={seeAll.href}
              className="group inline-flex items-center gap-1 font-data text-sm text-paper-muted transition-colors hover:text-amber"
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
