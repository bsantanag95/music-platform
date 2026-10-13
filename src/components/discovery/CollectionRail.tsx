import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { DiscPlaceholder } from "@/components/catalog/DiscPlaceholder";
import { listHref } from "@/lib/catalog-links";
import type { FeaturedCollection } from "@/services/discovery/discovery";
import type { CollectionFamily } from "@/services/discovery/collections/families";
import { SectionHeader } from "./SectionHeader";

interface CollectionRailProps<T extends FeaturedCollection> {
  /** Ancla de la sección (la navegación rápida de `/explore` enlaza a ella). */
  id?: string;
  heading: string;
  /** Una línea bajo el título (qué son estas colecciones). */
  description?: string;
  collections: T[];
  /** `username` de la cuenta curadora, para armar el enlace a la lista pública. */
  curatorUsername: string;
  itemsLabel: (count: number) => string;
  /** Enlace "Ver todas" a la página de colecciones. */
  seeAll?: { href: string; label: string };
  /** Etiqueta de familia de una colección automática (se muestra sobre el título). */
  familyLabel?: (family: CollectionFamily) => string;
  /** Línea extra bajo el conteo (en el archivo: "Hasta 11 oct 2026"). */
  noteFor?: (collection: T) => string | undefined;
  /** Controles bajo el encabezado (en el archivo: el filtro por familia). */
  toolbar?: ReactNode;
  /** Con colecciones vacías, en vez de omitir la sección muestra este mensaje (el archivo vacío). */
  emptyMessage?: string;
}

/** Hasta cuántas fundas muestra la pila (el servicio trae hasta 6). */
const STACK_SIZE = 6;

// Pila de fundas de la colección: carátulas superpuestas, la primera encima, que se abren un poco
// al pasar el mouse. Sin carátulas, tres siluetas de disco (nunca un hueco vacío). Decorativa: el
// título de la colección es lo que la identifica.
function SleeveStack({ covers }: { covers: string[] }) {
  const items: (string | null)[] = covers.length > 0 ? covers.slice(0, STACK_SIZE) : [null, null, null];
  return (
    <div aria-hidden="true" className="flex shrink-0 items-center">
      {items.map((cover, i) => (
        <div
          key={i}
          style={{ zIndex: items.length - i }}
          className="relative size-16 shrink-0 overflow-hidden rounded-md shadow-[0_2px_10px_rgba(0,0,0,0.45)] ring-1 ring-ink first:ml-0 [&:not(:first-child)]:-ml-9 motion-safe:transition-[margin] motion-safe:duration-300 lg:size-20 lg:[&:not(:first-child)]:-ml-11 lg:group-hover:[&:not(:first-child)]:-ml-8"
        >
          {cover ? (
            <CoverThumb cover={cover} label="" className="size-full" />
          ) : (
            <DiscPlaceholder alt="" className="size-full" />
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Riel de colecciones editoriales (`/explore` e Inicio anónima): listas públicas de la cuenta
 * curadora, ya ordenadas por `rank`. Cada tarjeta es un enlace al detalle público de la lista,
 * con la pila de fundas, el título, la descripción (si la tiene) y el número
 * de álbumes. No renderiza nada si no hay colecciones.
 */
export function CollectionRail<T extends FeaturedCollection>({
  id = "colecciones",
  heading,
  description,
  collections,
  curatorUsername,
  itemsLabel,
  seeAll,
  familyLabel,
  noteFor,
  toolbar,
  emptyMessage,
}: CollectionRailProps<T>) {
  if (collections.length === 0 && !emptyMessage) return null;
  // Con más de dos colecciones, tres columnas desde `lg` y la pila arriba del texto: en dos columnas con la pila al
  // lado, seis colecciones ocupaban tres filas altas y los títulos largos se cortaban ("Ganadores del Grammy 20…").
  const compact = collections.length > 2;
  return (
    <section id={id} className="flex w-full scroll-mt-24 flex-col gap-3">
      <SectionHeader heading={heading} description={description} seeAll={seeAll} />
      {toolbar}
      {collections.length === 0 ? (
        <p className="rounded-lg border border-ink-border bg-ink-surface p-6 font-body text-sm text-paper-muted">
          {emptyMessage}
        </p>
      ) : null}
      <ul className={`grid gap-4 sm:grid-cols-2 ${compact ? "lg:grid-cols-3" : ""}`}>
        {collections.map((collection) => (
          <li key={collection.id}>
            <Link
              href={listHref(curatorUsername, collection.title, collection.id)}
              className={`group relative flex h-full flex-col gap-4 rounded-lg border border-ink-border bg-ink-surface p-4 transition-colors hover:border-amber focus-visible:border-amber ${
                compact ? "" : "lg:flex-row lg:items-center lg:gap-6 lg:p-5"
              }`}
            >
              <SleeveStack covers={collection.coverThumbs} />
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                {/* Sin rótulo "Selección editorial" por tarjeta: el encabezado de la sección ya lo dice. Las
                    automáticas sí llevan su familia (Efemérides, Premios…), que es lo que las distingue entre sí. */}
                {collection.family && familyLabel ? (
                  <span className="font-data text-[0.7rem] uppercase tracking-wide text-amber">
                    {familyLabel(collection.family)}
                  </span>
                ) : null}
                <span className="line-clamp-2 font-display text-lg text-paper transition-colors group-hover:text-amber">
                  {collection.title}
                </span>
                {collection.description ? (
                  <span className="line-clamp-2 font-body text-sm text-paper-muted">{collection.description}</span>
                ) : null}
                <span className="font-data text-xs text-paper-muted">{itemsLabel(collection.itemCount)}</span>
                {noteFor?.(collection) ? (
                  <span className="font-data text-xs text-paper-muted">{noteFor(collection)}</span>
                ) : null}
              </span>
              <span
                aria-hidden="true"
                className={`text-paper-muted transition-[color,transform] duration-150 group-hover:translate-x-0.5 group-hover:text-amber ${
                  compact ? "absolute right-4 top-4" : "hidden self-center lg:block"
                }`}
              >
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
