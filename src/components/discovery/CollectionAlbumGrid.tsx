import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { listItemHref } from "@/components/lists/lists-shared";
import type { ListEntityType, UserListItem } from "@/lib/api/schemas";

/** Una sección de la rejilla: los discos de un grupo (un mes, una década) con su encabezado, si lo tiene. */
export interface AlbumGridGroup {
  heading?: string;
  items: UserListItem[];
}

interface CollectionAlbumGridProps {
  heading: string;
  items: UserListItem[];
  entityType: ListEntityType;
  /** Cartela por ítem (id del ítem → texto): por qué está en la colección. */
  notes?: Record<string, string>;
  /**
   * Número de orden sobre la carátula. Solo cuando el orden es un ranking (los más valorados): en los premios el
   * orden es por categoría y un "1" haría creer que ese disco ganó más que los demás. Lo pide el presentador de la
   * colección (openspec: add-collection-presenters); sin él, no se numera.
   */
  numbered?: boolean;
  /** Partición de `items` que propone el presentador; sin ella, una sola rejilla. */
  groups?: AlbumGridGroup[] | null;
  unavailableLabel: string;
}

const GRID = "grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3 md:grid-cols-4";

// Discos de una colección como muro de carátulas: una colección se recorre con la vista, no se lee como una lista.
// En filas verticales (la vista de una lista) doce discos ocupaban varias pantallas; en grilla se ven casi todos de
// entrada. Cada tarjeta lleva título, artista y la cartela de la colección (y, en un ranking, su número de orden).
// Con grupos (Novedades por mes) pinta una sección por grupo con las mismas tarjetas.
export function CollectionAlbumGrid({
  heading,
  items,
  entityType,
  notes,
  numbered = false,
  groups,
  unavailableLabel,
}: CollectionAlbumGridProps) {
  const sections: AlbumGridGroup[] = groups && groups.length > 0 ? groups : [{ items }];
  let position = 0;

  const card = (item: UserListItem) => {
    position += 1;
    const href = listItemHref(item.target.id, entityType, {
      title: item.target.title,
      artistName: item.target.artistName,
    });
    return (
      <li key={item.id}>
        <Link href={href} className="group flex flex-col gap-1.5">
          <span className="relative block">
            <CoverThumb
              cover={item.target.coverThumbUrl}
              label=""
              className="aspect-square w-full rounded-md ring-1 ring-ink-border transition-[box-shadow] group-hover:ring-amber"
            />
            {numbered ? (
              <span className="absolute left-1.5 top-1.5 rounded bg-ink/85 px-1.5 py-0.5 font-data text-[0.65rem] tabular-nums text-paper backdrop-blur-sm">
                {position}
              </span>
            ) : null}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-display text-sm text-paper transition-colors group-hover:text-amber">
              {item.target.title || unavailableLabel}
            </span>
            {item.target.artistName ? (
              <span className="block truncate font-data text-xs text-paper-muted">{item.target.artistName}</span>
            ) : null}
            {notes?.[item.id] ? (
              <span
                className="line-clamp-2 font-data text-[0.65rem] uppercase tracking-wide text-petrol"
                title={notes[item.id]}
              >
                {notes[item.id]}
              </span>
            ) : null}
          </span>
        </Link>
      </li>
    );
  };

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-lg text-paper">
        {heading} <span className="font-data text-sm text-paper-muted">({items.length})</span>
      </h2>
      {sections.map((group, index) => (
        <div key={group.heading ?? `sin-encabezado-${index}`} className="flex flex-col gap-3">
          {group.heading ? <h3 className="font-display text-base text-paper-muted">{group.heading}</h3> : null}
          <ol className={GRID}>{group.items.map(card)}</ol>
        </div>
      ))}
    </section>
  );
}
