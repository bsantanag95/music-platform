import type { ReactNode } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { FeaturedCollection } from "@/services/discovery/discovery";
import type { CollectionFamily } from "@/services/discovery/collections/families";
import { collectionLinkOf, collectionTitleOf } from "./collection-links";
import { FAMILY_STAMP_CLASS, SleeveStack } from "./CollectionSleeves";
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
  /** Frase de contexto bajo el título (la página de colecciones: el resumen del presentador); sustituye a la descripción. */
  contextFor?: (collection: T) => string | undefined;
  /** Controles bajo el encabezado (en el archivo: el filtro por familia). */
  toolbar?: ReactNode;
  /** Con colecciones vacías, en vez de omitir la sección muestra este mensaje (el archivo vacío). */
  emptyMessage?: ReactNode;
  /**
   * `grid` (por defecto) para recorrer todo: la página de colecciones y el archivo. `scroll` para el riel de
   * `/explore`, una fila desplazable con flechas, que resume sin alargar la portada (ADR 0038).
   */
  layout?: "grid" | "scroll";
  /** Solo con `grid`: tarjetas densas, seis por fila (el archivo), en vez de las de cuatro columnas. */
  compact?: boolean;
  /** Solo la rejilla, sin sección ni encabezado: para colocarla dentro de otra sección que ya tiene el suyo. */
  bare?: boolean;
}

/**
 * Riel de colecciones editoriales (`/explore` e Inicio anónima): listas públicas de la cuenta
 * curadora, ya ordenadas por `rank`. Cada tarjeta es un enlace al detalle público de la lista.
 *
 * La tarjeta es deliberadamente **vertical** (abanico de fundas arriba, texto abajo, familia como
 * sello sobre la propia carátula) en vez de la fila horizontal de `ListCard`: una colección es
 * contenido de la plataforma, organizado por familia; una lista es de una persona, organizada por
 * autor. Que se vean distinto a primera vista es parte del modelo, no un detalle de estilo (ADR
 * 0038). No renderiza nada si no hay colecciones.
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
  contextFor,
  toolbar,
  emptyMessage,
  layout = "grid",
  compact = false,
  bare = false,
}: CollectionRailProps<T>) {
  const locale = useLocale();
  if (collections.length === 0 && !emptyMessage) return null;
  const titleOf = (collection: T) => collectionTitleOf(collection, locale);
  const hrefOf = (collection: T) => collectionLinkOf(collection, locale, curatorUsername);

  const headingId = `${id}-heading`;
  const header = (
    <SectionHeader heading={heading} description={description} seeAll={seeAll} headingId={headingId} />
  );
  const card = (collection: T, dense = false) => {
    const family = familyLabel ? familyLabel(collection.family) : null;
    const context = contextFor?.(collection);
    return (
      <Link
        href={hrefOf(collection)}
        className={`group flex h-full flex-col rounded-lg border border-ink-border bg-ink-surface transition-colors hover:border-amber focus-visible:border-amber ${
          dense ? "gap-2 p-3" : "gap-3 p-4"
        }`}
      >
        {/* El escenario de la pila: un marco propio (mismo recurso que el mosaico de `ListCoverMosaic`,
            un paso más oscuro con hairline) para que el abanico lea como un bloque de arte, no como
            miniaturas sueltas flotando en el relleno de la tarjeta. */}
        <div
          className={`relative flex w-full items-center justify-center overflow-hidden rounded-md border border-ink-border bg-ink ${
            dense ? "py-3" : "py-5"
          }`}
        >
          <SleeveStack covers={collection.coverThumbs} size={dense ? "dense" : "card"} />
          {/* La familia es lo que distingue una colección de otra, venga de plantilla o de la mano de
              alguien (ADR 0038): un sello sobre la propia carátula, no un rótulo flotando sobre el
              título — el mismo recurso que la cifra de `AlbumCard` sobre su carátula. */}
          {family ? (
            // `z-10`: las fundas llevan su propio `z-index` (la primera encima), y sin él el sello quedaba detrás de la
            // pila y se leía cortado ("LAN", "DES").
            <span className={`absolute bottom-1.5 left-1.5 z-10 ${FAMILY_STAMP_CLASS}`}>
              {family}
            </span>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex min-w-0 items-start gap-1.5">
            <h3
              className={`line-clamp-2 min-w-0 flex-1 font-display text-paper transition-colors group-hover:text-amber ${
                dense ? "text-sm" : "text-base lg:text-lg"
              }`}
            >
              {titleOf(collection)}
            </h3>
            {/* Misma flecha que las fichas de género de `FamilyGrid`, revelada al pasar el mouse o con
                foco: las fichas de contenido editorial comparten este detalle; las listas no lo llevan. */}
            <span
              aria-hidden="true"
              className="shrink-0 pt-0.5 text-paper-muted opacity-0 transition-[color,opacity,transform] duration-150 group-hover:translate-x-0.5 group-hover:text-amber group-hover:opacity-100 group-focus-visible:opacity-100"
            >
              →
            </span>
          </div>
          {context ? <p className="line-clamp-2 font-body text-sm text-paper-muted">{context}</p> : null}
          {/* En el riel la descripción se omite: el título ya dice qué es la colección y así entran 6 por fila.
              La descripción completa vive en la página de colecciones y en el detalle. */}
          {!dense && !context && collection.description ? (
            <p className="line-clamp-2 font-body text-sm text-paper-muted">{collection.description}</p>
          ) : null}
          <span className="font-data text-xs text-paper-muted">{itemsLabel(collection.itemCount)}</span>
          {noteFor?.(collection) ? (
            <span className="font-data text-xs text-paper-muted">{noteFor(collection)}</span>
          ) : null}
        </div>
      </Link>
    );
  };

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
              {card(collection, true)}
            </li>
          ))}
        </RailScroller>
      </section>
    );
  }

  // Pared de fichas: cuatro columnas desde `xl`, siempre la misma ficha vertical, tenga la familia 1
  // colección o 10 (antes una familia con pocas colecciones mostraba una ficha horizontal ancha aparte;
  // una sola forma es más fácil de reconocer que dos).
  // Con cuatro columnas, una cantidad como 5 o 9 deja una ficha sola en la última fila (4 + 1). En ese caso se
  // quedan las tres columnas de `lg` también en `xl` (5 → 3 + 2, 9 → 3 × 3).
  const lonelyAtFour = collections.length > 4 && collections.length % 4 === 1 && collections.length % 3 !== 1;
  const grid = (
    <ul
      className={
        compact
          ? "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6"
          : `grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${lonelyAtFour ? "" : "xl:grid-cols-4"}`
      }
    >
      {collections.map((collection) => (
        <li key={collection.id}>{card(collection, compact)}</li>
      ))}
    </ul>
  );
  if (bare) return grid;
  return (
    <section id={id} aria-labelledby={headingId} className="flex w-full scroll-mt-24 flex-col gap-3">
      {header}
      {toolbar}
      {collections.length === 0 ? (
        <p className="rounded-lg border border-ink-border bg-ink-surface p-6 font-body text-sm text-paper-muted">
          {emptyMessage}
        </p>
      ) : null}
      {grid}
    </section>
  );
}
