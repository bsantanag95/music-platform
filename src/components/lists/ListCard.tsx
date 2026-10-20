import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { ListCoverMosaic } from "./ListCoverMosaic";

interface ListCardProps {
  href: string;
  title: string;
  /** Línea de metadatos bajo el título (tipo · conteo · audiencia/dueño). */
  meta: ReactNode;
  coverThumbs: string[];
  /** Descripción breve, recortada a dos líneas. */
  description?: string | null;
  /** Marca de fijada (solo listas propias). */
  pinned?: boolean;
  /** Acción contextual: menú de la tarjeta o toggle Guardar/Seguir. */
  action?: ReactNode;
  /** Indicador "ya no disponible" para una lista guardada que dejó de verse. */
  unavailable?: boolean;
  pinnedLabel?: string;
  /** Variante compacta: mosaico chico, sin descripción. Para grillas/listas de
   * navegación (Populares, Recientes, De seguidos) donde se escanea, no se lee. */
  dense?: boolean;
  /** Variante grande: mosaico mayor y título más grande, para una lista sola que ocupa la fila (una única Destacada). */
  large?: boolean;
  /** Clases extra para la tarjeta (p. ej. ancho fijo dentro de un riel). */
  className?: string;
  /** Marca junto al título (p. ej. "Oficial"). */
  badge?: ReactNode;
  /** Segunda línea de metadatos (dueño · antigüedad), para no partir una sola línea larga a mitad. */
  subMeta?: ReactNode;
  /**
   * Dónde va la acción: `footer` (predeterminado, su propia fila al pie) o `aside` (a la derecha desde
   * `sm`, centrada: la tarjeta no crece una fila solo por el botón; en mobile vuelve al pie, salvo en la
   * variante densa, cuya acción compacta entra siempre a la derecha).
   */
  actionPlacement?: "footer" | "aside";
}

// Tarjeta de una lista: mosaico de portadas + título enlazado + metadatos, con
// la acción contextual (menú de la tarjeta o Guardar/Seguir) en su propia fila
// al pie para que la tarjeta nunca desborde en una columna angosta. El mosaico
// es la parte "objeto" (tacto de vinilo); el resto es cromo quieto.
export function ListCard({
  href,
  title,
  meta,
  coverThumbs,
  description,
  pinned,
  action,
  unavailable,
  pinnedLabel,
  dense = false,
  large = false,
  className = "",
  badge,
  subMeta,
  actionPlacement = "footer",
}: ListCardProps) {
  const aside = actionPlacement === "aside" && action;
  return (
    <article
      className={`group flex gap-3 rounded-lg border border-ink-border bg-ink-surface transition-colors focus-within:border-amber hover:border-amber ${
        dense ? "p-2" : "gap-4 p-3"
      } ${aside ? (dense ? "items-center" : "flex-wrap items-center sm:flex-nowrap") : ""} ${unavailable ? "opacity-60" : ""} ${className}`}
    >
      <Link href={href} className="shrink-0" tabIndex={-1} aria-hidden>
        <ListCoverMosaic coverThumbs={coverThumbs} className={dense ? "w-12" : large ? "w-28 sm:w-36" : "w-20"} />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className={`truncate font-display text-paper ${dense ? "text-sm" : large ? "text-xl" : "text-base"}`}>
            <Link href={href} className="transition-colors hover:text-amber">
              {title}
            </Link>
          </h3>
          {badge}
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-data text-xs text-paper-muted">
          {pinned && pinnedLabel ? <span className="text-amber">{pinnedLabel}</span> : null}
          {pinned && pinnedLabel ? <span aria-hidden>·</span> : null}
          {meta}
        </div>
        {subMeta ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-data text-xs text-paper-muted">{subMeta}</div>
        ) : null}

        {description && !dense ? (
          <p className="line-clamp-2 max-w-prose whitespace-pre-wrap font-body text-sm text-paper-muted">
            {description}
          </p>
        ) : null}

        {action && !aside ? <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">{action}</div> : null}
      </div>

      {aside ? <div className={`shrink-0 ${dense ? "" : "w-full sm:w-auto"}`}>{action}</div> : null}
    </article>
  );
}
