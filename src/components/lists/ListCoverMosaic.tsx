"use client";

import { useState } from "react";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { DiscPlaceholder } from "@/components/catalog/DiscPlaceholder";

interface ListCoverMosaicProps {
  coverThumbs: string[];
  /** Tamaño del mosaico completo. El caller fija una caja cuadrada. */
  className?: string;
}

/** Disposición de cada imagen según cuántas haya: una sola llena la caja; dos, mitades; tres, una grande y dos chicas. */
const LAYOUT: Record<number, { grid: string; tiles: string[] }> = {
  1: { grid: "grid-cols-1 grid-rows-1", tiles: [""] },
  2: { grid: "grid-cols-2 grid-rows-1", tiles: ["", ""] },
  3: { grid: "grid-cols-2 grid-rows-2", tiles: ["row-span-2", "", ""] },
  4: { grid: "grid-cols-2 grid-rows-2", tiles: ["", "", "", ""] },
};

// Mosaico de las primeras imágenes de una lista — "una pila de sleeves sostenida a la luz" —: carátulas de álbumes o
// canciones y fotos de artistas. Usa tantas imágenes como haya, hasta cuatro, sin huecos (openspec: polish-community-lists):
// antes eran siempre cuatro casillas y una lista con una o dos imágenes quedaba con discos grises de relleno. Sin ninguna, la
// silueta de disco ocupa la caja. Decorativo: el nombre y los metadatos de la lista son lo que la identifica (`aria-hidden`).
//
// Una imagen que no carga (Cover Art Archive o el optimizador fallan de forma intermitente) se descarta y el mosaico se
// reacomoda con las que sí cargaron: antes quedaba un disco gris en un cuadrante, que a 48 px se lee como un hueco.
export function ListCoverMosaic({ coverThumbs, className = "" }: ListCoverMosaicProps) {
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());
  const covers = coverThumbs.filter((cover) => !failed.has(cover)).slice(0, 4);
  const layout = LAYOUT[covers.length];

  return (
    <div
      aria-hidden
      className={`grid aspect-square gap-px overflow-hidden rounded-md border border-ink-border bg-ink-border ${layout?.grid ?? "grid-cols-1"} ${className}`}
    >
      {/* El contenedor recorta las esquinas (`overflow-hidden`), así que el redondeo propio de cada tile queda oculto. */}
      {layout ? (
        covers.map((cover, i) => (
          <CoverThumb
            key={`${i}:${cover}`}
            cover={cover}
            label=""
            className={`size-full ${layout.tiles[i]}`}
            onFail={() => setFailed((prev) => new Set(prev).add(cover))}
          />
        ))
      ) : (
        <DiscPlaceholder alt="" className="size-full" />
      )}
    </div>
  );
}
