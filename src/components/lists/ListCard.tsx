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
  /** Marca de la lista (p. ej. "Oficial"), en su propia línea sobre el título. */
  badge?: ReactNode;
  /** Ítems y tipo de la lista: el mosaico los usa en su cuarta celda cuando hay tres imágenes. */
  itemCount?: number;
  entityType?: "artist" | "release-group" | "recording";
  /** Segunda línea de metadatos (dueño · antigüedad), para no partir una sola línea larga a mitad. */
  subMeta?: ReactNode;
  /**
   * Dónde va la acción: `footer` (predeterminado, su propia fila al pie) o `aside` (a la derecha desde
   * `sm`, centrada: la tarjeta no crece una fila solo por el botón; en mobile vuelve al pie, salvo en la
   * variante densa, cuya acción compacta entra siempre a la derecha).
   */
  actionPlacement?: "footer" | "aside";
  /** `shelf`: tarjeta de estantería, con el mosaico arriba a todo el ancho y el texto debajo (redesign-lists-page, D6). */
  layout?: "row" | "shelf";
  /** Primeros nombres de la lista, bajo el título de la tarjeta `large` (portada de una destacada única, D7). */
  previewNames?: string[];
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
  itemCount,
  entityType,
  layout = "row",
  previewNames,
}: ListCardProps) {
  if (layout === "shelf") {
    return (
      <ShelfCard
        href={href}
        title={title}
        meta={meta}
        subMeta={subMeta}
        coverThumbs={coverThumbs}
        itemCount={itemCount}
        entityType={entityType}
        badge={badge}
        action={action}
        unavailable={unavailable}
        className={className}
      />
    );
  }
  const aside = actionPlacement === "aside" && action;
  return (
    <article
      className={`group flex gap-3 rounded-lg border border-ink-border bg-ink-surface transition-colors focus-within:border-amber hover:border-amber ${
        dense ? "p-2" : "gap-4 p-3"
      } ${aside ? (dense ? "items-center" : "flex-wrap items-center sm:flex-nowrap") : ""} ${unavailable ? "opacity-60" : ""} ${className}`}
    >
      <Link href={href} className="shrink-0" tabIndex={-1} aria-hidden>
        <ListCoverMosaic
          coverThumbs={coverThumbs}
          itemCount={itemCount}
          entityType={entityType}
          className={dense ? "w-12" : large ? "w-28 sm:w-40" : "w-20"}
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {/* La marca va en su propia línea, sobre el título (redesign-lists-page, D1): compartiendo la fila le quitaba ancho
            y en móvil truncaba el título ("Playlist d…"). El título se parte en hasta dos líneas en vez de truncarse. */}
        {badge ? <div className="flex">{badge}</div> : null}
        <h3
          className={`line-clamp-2 break-words font-display text-paper ${dense ? "text-sm" : large ? "text-lg" : "text-base"}`}
        >
          <Link href={href} className="transition-colors hover:text-amber">
            {title}
          </Link>
        </h3>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-data text-xs text-paper-muted">
          {pinned && pinnedLabel ? <span className="text-amber">{pinnedLabel}</span> : null}
          {pinned && pinnedLabel ? <span aria-hidden>·</span> : null}
          {meta}
        </div>
        {subMeta ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-data text-xs text-paper-muted">{subMeta}</div>
        ) : null}

        {large && previewNames && previewNames.length > 0 ? (
          // Qué hay dentro, sin abrirla: los primeros nombres en una línea (D7).
          <p className="line-clamp-1 font-body text-sm text-paper">{previewNames.join(" · ")}</p>
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

// Tarjeta de estantería (redesign-lists-page, D6): la lista como objeto, con el mosaico arriba a todo el ancho de su columna
// y el título y los metadatos debajo, sin caja alrededor. En las filas densas cada carátula medía 23 px y no se reconocía.
// La acción (Guardar/Seguir) flota sobre la esquina del mosaico, siempre visible: en táctil no hay hover que la revele y,
// guardada, la marca dice algo de la lista.
function ShelfCard({
  href,
  title,
  meta,
  subMeta,
  coverThumbs,
  itemCount,
  entityType,
  badge,
  action,
  unavailable,
  className,
}: Pick<
  ListCardProps,
  | "href"
  | "title"
  | "meta"
  | "subMeta"
  | "coverThumbs"
  | "itemCount"
  | "entityType"
  | "badge"
  | "action"
  | "unavailable"
  | "className"
>) {
  return (
    <article className={`group relative flex min-w-0 flex-col gap-2 ${unavailable ? "opacity-60" : ""} ${className ?? ""}`}>
      <Link href={href} tabIndex={-1} aria-hidden className="block rounded-md transition-opacity group-hover:opacity-90">
        <ListCoverMosaic coverThumbs={coverThumbs} itemCount={itemCount} entityType={entityType} className="w-full" />
      </Link>
      {action ? (
        // Fondo propio para leerse sobre cualquier carátula.
        <div className="absolute right-1.5 top-1.5 [&_button]:bg-ink/85 [&_button]:backdrop-blur-sm">{action}</div>
      ) : null}

      <div className="flex min-w-0 flex-col gap-0.5">
        {badge ? <div className="flex">{badge}</div> : null}
        <h3 className="line-clamp-2 break-words font-display text-sm text-paper">
          <Link href={href} className="transition-colors hover:text-amber group-hover:text-amber">
            {title}
          </Link>
        </h3>
        <div className="flex flex-wrap items-center gap-x-1.5 font-data text-xs text-paper-muted">{meta}</div>
        {subMeta ? (
          <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 font-data text-xs text-paper-muted">{subMeta}</div>
        ) : null}
      </div>
    </article>
  );
}
