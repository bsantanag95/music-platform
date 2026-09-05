import { CoverThumb } from "@/components/catalog/CoverThumb";
import { DiscPlaceholder } from "@/components/catalog/DiscPlaceholder";

interface ListCoverMosaicProps {
  coverThumbs: string[];
  /** Tamaño del mosaico completo. El caller fija una caja cuadrada. */
  className?: string;
}

// Mosaico 2×2 de las primeras carátulas de una lista — "una pila de sleeves
// sostenida a la luz". Cuando faltan carátulas (lista de artistas o canciones,
// o álbumes sin arte) cada hueco cae en la silueta de disco del sistema, nunca
// en un rectángulo vacío. Decorativo: el nombre y los metadatos de la lista son
// lo que la identifica, así que el mosaico va `aria-hidden`.
export function ListCoverMosaic({ coverThumbs, className = "" }: ListCoverMosaicProps) {
  const tiles = Array.from({ length: 4 }, (_, i) => coverThumbs[i] ?? null);

  return (
    <div
      aria-hidden
      className={`grid aspect-square grid-cols-2 grid-rows-2 gap-px overflow-hidden rounded-md border border-ink-border bg-ink-border ${className}`}
    >
      {/* El contenedor recorta las esquinas (`overflow-hidden`), así que el
          redondeo propio de cada tile queda oculto y no hace falta anularlo. */}
      {tiles.map((cover, i) =>
        cover ? (
          <CoverThumb key={i} cover={cover} label="" className="size-full" />
        ) : (
          <DiscPlaceholder key={i} alt="" className="size-full" />
        ),
      )}
    </div>
  );
}
