import { CoverThumb } from "@/components/catalog/CoverThumb";
import { DiscPlaceholder } from "@/components/catalog/DiscPlaceholder";

/** Cuántas fundas muestra la pila de cada tamaño (el servicio trae hasta 6 carátulas). */
const STACK_LIMIT = { dense: 3, card: 5, hero: 6 } as const;

/**
 * Tamaños de la pila. `dense`: la tarjeta del riel de `/explore` (entran 6 por fila, ADR 0038). `card`: la tarjeta de
 * la página de colecciones: 5 fundas de 80 px con paso de 36 px (224 px; 256 px con el abanico abierto), que caben en el
 * marco más angosto de la rejilla (264 px a 4 columnas). `hero`: la cabecera del detalle de una colección. El solapamiento de cada tamaño es
 * proporcional al tamaño de sus fundas; el abanico se abre un poco al pasar el mouse (solo desde `lg`, y solo dentro de una
 * tarjeta, que es el `group`).
 */
const STACK_SIZE = {
  dense: "size-14 [&:not(:first-child)]:-ml-8 lg:group-hover:[&:not(:first-child)]:-ml-6",
  card: "size-20 [&:not(:first-child)]:-ml-11 lg:group-hover:[&:not(:first-child)]:-ml-9",
  hero: "size-24 [&:not(:first-child)]:-ml-14 sm:size-32 sm:[&:not(:first-child)]:-ml-20 lg:size-36 lg:[&:not(:first-child)]:-ml-24",
} as const;

export type SleeveStackSize = keyof typeof STACK_SIZE;

// Pila de fundas en abanico: carátulas superpuestas, la primera encima. Sin carátulas, tres siluetas de disco
// (nunca un hueco vacío). Es la textura que distingue una colección de una lista: el mosaico 2×2 plano de
// `ListCoverMosaic` lee como un objeto guardado; el abanico lee como varios sleeves apilados a mano, el gesto de
// quien arma un recorrido por el catálogo. Decorativa: el título de la colección es lo que la identifica.
export function SleeveStack({ covers, size = "card" }: { covers: string[]; size?: SleeveStackSize }) {
  const items: (string | null)[] = covers.length > 0 ? covers.slice(0, STACK_LIMIT[size]) : [null, null, null];
  return (
    <div aria-hidden="true" className="flex shrink-0 items-center">
      {items.map((cover, i) => (
        <div
          key={i}
          style={{ zIndex: items.length - i }}
          className={`relative shrink-0 overflow-hidden rounded-md shadow-[0_2px_10px_rgba(0,0,0,0.45)] ring-1 ring-ink first:ml-0 motion-safe:transition-[margin] motion-safe:duration-300 ${STACK_SIZE[size]}`}
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

/** Sello de la familia sobre la carátula: el mismo recurso que la cifra de `AlbumCard` sobre su carátula. */
export const FAMILY_STAMP_CLASS =
  "inline-flex items-center rounded-md bg-ink/85 px-1.5 py-0.5 font-data text-[0.65rem] uppercase tracking-wide text-paper backdrop-blur-sm";
