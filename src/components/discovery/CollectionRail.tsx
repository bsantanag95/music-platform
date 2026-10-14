import type { ReactNode } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { DiscPlaceholder } from "@/components/catalog/DiscPlaceholder";
import { collectionHref, listHref } from "@/lib/catalog-links";
import { collectionTitle } from "@/services/discovery/collections/titles";
import type { FeaturedCollection } from "@/services/discovery/discovery";
import type { CollectionFamily } from "@/services/discovery/collections/families";
import { RailScroller } from "./RailScroller";
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
  /**
   * `grid` (por defecto) para recorrer todo: la página de colecciones y el archivo. `scroll` para el riel de
   * `/explore`, una fila desplazable con flechas, que resume sin alargar la portada (ADR 0038).
   */
  layout?: "grid" | "scroll";
}

/** Hasta cuántas fundas muestra la pila (el servicio trae hasta 6). */
const STACK_SIZE = 6;

/** En el riel la pila es más chica y de 3 fundas: así entran 6 colecciones por fila (ADR 0038). */
const DENSE_STACK_SIZE = 3;

// Pila de fundas de la colección: carátulas superpuestas, la primera encima, que se abren un poco
// al pasar el mouse. Sin carátulas, tres siluetas de disco (nunca un hueco vacío). Decorativa: el
// título de la colección es lo que la identifica.
function SleeveStack({ covers, dense = false }: { covers: string[]; dense?: boolean }) {
  const limit = dense ? DENSE_STACK_SIZE : STACK_SIZE;
  const items: (string | null)[] = covers.length > 0 ? covers.slice(0, limit) : [null, null, null];
  const size = dense
    ? "size-14 [&:not(:first-child)]:-ml-8 lg:group-hover:[&:not(:first-child)]:-ml-6"
    : "size-16 [&:not(:first-child)]:-ml-9 lg:size-20 lg:[&:not(:first-child)]:-ml-11 lg:group-hover:[&:not(:first-child)]:-ml-8";
  return (
    <div aria-hidden="true" className="flex shrink-0 items-center">
      {items.map((cover, i) => (
        <div
          key={i}
          style={{ zIndex: items.length - i }}
          className={`relative shrink-0 overflow-hidden rounded-md shadow-[0_2px_10px_rgba(0,0,0,0.45)] ring-1 ring-ink first:ml-0 motion-safe:transition-[margin] motion-safe:duration-300 ${size}`}
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
  layout = "grid",
}: CollectionRailProps<T>) {
  const locale = useLocale();
  if (collections.length === 0 && !emptyMessage) return null;
  // Las colecciones generadas se muestran con el título del idioma y viven en su propia ruta bajo Explorar; las
  // curadas son listas de la cuenta curadora y conservan su título y su ruta de lista.
  const titleOf = (collection: T) =>
    collection.source === "template"
      ? collectionTitle(collection.templateKey, collection.periodKey, locale, collection.title)
      : collection.title;
  const hrefOf = (collection: T) =>
    collection.source === "template"
      ? collectionHref(titleOf(collection), collection.id)
      : listHref(curatorUsername, collection.title, collection.id);

  const headingId = `${id}-heading`;
  const header = (
    <SectionHeader heading={heading} description={description} seeAll={seeAll} headingId={headingId} />
  );
  const card = (collection: T, compact: boolean, dense = false) => (
    <Link
      href={hrefOf(collection)}
      className={`group relative flex h-full flex-col rounded-lg border border-ink-border bg-ink-surface transition-colors hover:border-amber focus-visible:border-amber ${
        dense ? "gap-3 p-3" : "gap-4 p-4"
      } ${
        compact ? "" : "lg:flex-row lg:items-center lg:gap-6 lg:p-5"
      }`}
    >
      <SleeveStack covers={collection.coverThumbs} dense={dense} />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        {/* La familia es lo que distingue una colección de otra, venga de plantilla o de la mano de alguien: desde
            el ADR 0038 toda colección destacada tiene una y el riel no separa los dos orígenes. */}
        {familyLabel ? (
          <span className="font-data text-[0.7rem] uppercase tracking-wide text-amber">
            {familyLabel(collection.family)}
          </span>
        ) : null}
        <span className="line-clamp-2 font-display text-lg text-paper transition-colors group-hover:text-amber">
          {titleOf(collection)}
        </span>
        {/* En el riel la descripción se omite: el título ya dice qué es la colección y así entran 6 por fila.
            La descripción completa vive en la página de colecciones y en el detalle. */}
        {!dense && collection.description ? (
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
  );

  // Riel de la portada: una fila desplazable con tarjetas densas. Con 10 colecciones una rejilla ocupaba cuatro
  // filas y empujaba el resto de la página; con tarjetas anchas solo se veían 3, menos de las 6 de antes. Densas
  // entran 6 de un vistazo (5 desde `lg`, como el riel de álbumes) y el resto queda a un desplazamiento. Las
  // flechas las pone `RailScroller` y solo aparecen si hay a dónde ir.
  if (layout === "scroll") {
    return (
      <section id={id} aria-labelledby={headingId} className="flex w-full scroll-mt-24 flex-col gap-3">
        <RailScroller header={header} labelledBy={headingId}>
          {collections.map((collection) => (
            <li
              key={collection.id}
              className="w-[46%] shrink-0 snap-start sm:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-4rem)/5)] xl:w-[calc((100%-5rem)/6)]"
            >
              {card(collection, true, true)}
            </li>
          ))}
        </RailScroller>
      </section>
    );
  }

  // Con más de dos colecciones, tres columnas desde `lg` y la pila arriba del texto: en dos columnas con la pila al
  // lado, seis colecciones ocupaban tres filas altas y los títulos largos se cortaban ("Ganadores del Grammy 20…").
  const compact = collections.length > 2;
  return (
    <section id={id} aria-labelledby={headingId} className="flex w-full scroll-mt-24 flex-col gap-3">
      {header}
      {toolbar}
      {collections.length === 0 ? (
        <p className="rounded-lg border border-ink-border bg-ink-surface p-6 font-body text-sm text-paper-muted">
          {emptyMessage}
        </p>
      ) : null}
      <ul className={`grid gap-4 sm:grid-cols-2 ${compact ? "lg:grid-cols-3" : ""}`}>
        {collections.map((collection) => (
          <li key={collection.id}>{card(collection, compact)}</li>
        ))}
      </ul>
    </section>
  );
}
