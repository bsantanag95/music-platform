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
}: ListCardProps) {
  return (
    <article
      className={`group flex gap-4 rounded-lg border border-ink-border bg-ink-surface p-3 transition-colors focus-within:border-amber hover:border-amber ${
        unavailable ? "opacity-60" : ""
      }`}
    >
      <Link href={href} className="shrink-0" tabIndex={-1} aria-hidden>
        <ListCoverMosaic coverThumbs={coverThumbs} className="w-20" />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="truncate font-display text-base text-paper">
          <Link href={href} className="transition-colors hover:text-amber">
            {title}
          </Link>
        </h3>

        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-data text-xs text-paper-muted">
          {pinned && pinnedLabel ? <span className="text-amber">{pinnedLabel}</span> : null}
          {pinned && pinnedLabel ? <span aria-hidden>·</span> : null}
          {meta}
        </p>

        {description ? (
          <p className="line-clamp-2 whitespace-pre-wrap font-body text-sm text-paper-muted">
            {description}
          </p>
        ) : null}

        {action ? <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">{action}</div> : null}
      </div>
    </article>
  );
}
