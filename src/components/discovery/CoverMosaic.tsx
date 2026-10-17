import { CoverThumb } from "@/components/catalog/CoverThumb";

/**
 * Cómo se reparte el mosaico según cuántas carátulas hay: con cuatro, 2×2; con tres, la primera ocupa las dos filas; con
 * dos, dos columnas a todo el alto; con una, a sangre.
 */
export function mosaicLayout(count: number): { grid: string; span: (index: number) => string } {
  if (count >= 4) return { grid: "grid-cols-2 grid-rows-2", span: () => "" };
  if (count === 3) return { grid: "grid-cols-2 grid-rows-2", span: (i) => (i === 0 ? "row-span-2" : "") };
  if (count === 2) return { grid: "grid-cols-2 grid-rows-1", span: () => "" };
  return { grid: "grid-cols-1 grid-rows-1", span: () => "" };
}

/**
 * Mosaico decorativo de hasta cuatro carátulas (openspec: visual-genre-families, redesign-decade-view): lo comparten las tarjetas de
 * `/explore` (`MosaicGrid`) y la cabecera de la vista de década. Es `aria-hidden`: lo que lo rodea ya nombra el corte. Quien lo usa pone
 * el tamaño y la propiedad `display` (`grid`, `hidden sm:grid`) en `className`; sin carátulas no pinta nada.
 */
export function CoverMosaic({ covers, className = "" }: { covers: string[]; className?: string }) {
  const shown = covers.slice(0, 4);
  if (shown.length === 0) return null;
  const { grid, span } = mosaicLayout(shown.length);
  return (
    <div aria-hidden="true" className={`gap-px bg-ink ${grid} ${className}`}>
      {shown.map((cover, i) => (
        <div key={`${cover}-${i}`} className={`relative min-h-0 min-w-0 ${span(i)}`}>
          <CoverThumb cover={cover} label="" className="size-full !rounded-none" />
        </div>
      ))}
    </div>
  );
}
