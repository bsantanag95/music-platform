"use client";

import { useState } from "react";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { DiscPlaceholder } from "@/components/catalog/DiscPlaceholder";

interface ListCoverMosaicProps {
  coverThumbs: string[];
  /** Tamaño del mosaico completo. El caller fija una caja cuadrada. */
  className?: string;
  /** Ítems de la lista: con tres imágenes, la cuarta celda dice cuántos más hay ("+N"). */
  itemCount?: number;
  /** Tipo de la lista: con tres imágenes y ningún ítem más, la cuarta celda muestra su ícono. */
  entityType?: "artist" | "release-group" | "recording";
}

/** Disposición de cada imagen según cuántas haya: una sola llena la caja; dos, mitades; tres y cuatro, una grilla de 2×2. */
const LAYOUT: Record<number, { grid: string; tiles: string[] }> = {
  1: { grid: "grid-cols-1 grid-rows-1", tiles: [""] },
  2: { grid: "grid-cols-2 grid-rows-1", tiles: ["", ""] },
  3: { grid: "grid-cols-2 grid-rows-2", tiles: ["", "", ""] },
  4: { grid: "grid-cols-2 grid-rows-2", tiles: ["", "", "", ""] },
};

// Mosaico de las primeras imágenes de una lista — "una pila de sleeves sostenida a la luz" —: carátulas de álbumes o
// canciones y fotos de artistas. Usa tantas imágenes como haya, hasta cuatro, sin huecos (openspec: polish-community-lists):
// antes eran siempre cuatro casillas y una lista con una o dos imágenes quedaba con discos grises de relleno. Sin ninguna, la
// silueta de disco ocupa la caja. Decorativo: el nombre y los metadatos de la lista son lo que la identifica (`aria-hidden`).
//
// Con tres imágenes, una grilla de 2×2 con una cuarta celda neutra (redesign-lists-page, D5): antes la primera ocupaba dos
// filas y una carátula cuadrada quedaba recortada a una franja vertical de 1:2, que se leía como un hueco. La cuarta celda
// dice cuántos ítems más tiene la lista o, si no hay más, muestra el ícono de su tipo.
//
// Una imagen que no carga (Cover Art Archive o el optimizador fallan de forma intermitente) se descarta y el mosaico se
// reacomoda con las que sí cargaron: antes quedaba un disco gris en un cuadrante, que a 48 px se lee como un hueco.
export function ListCoverMosaic({ coverThumbs, className = "", itemCount, entityType }: ListCoverMosaicProps) {
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());
  const covers = coverThumbs.filter((cover) => !failed.has(cover)).slice(0, 4);
  const layout = LAYOUT[covers.length];
  const remaining = itemCount !== undefined ? itemCount - covers.length : 0;
  // Las fotos de artistas van en círculo, como en el resto de la app (redesign-lists-page): sin las líneas de 1 px entre
  // celdas, que alrededor de un círculo se leen como una cuadrícula vacía.
  const round = entityType === "artist" && covers.length > 0;

  return (
    <div
      aria-hidden
      // `container-type`: el "+N" de la cuarta celda escala con el ancho del mosaico (`cqw`), de 48 a 160 px.
      className={`grid aspect-square overflow-hidden [container-type:inline-size] ${
        round ? "gap-1" : "gap-px rounded-md border border-ink-border bg-ink-border"
      } ${layout?.grid ?? "grid-cols-1"} ${className}`}
    >
      {/* El contenedor recorta las esquinas (`overflow-hidden`), así que el redondeo propio de cada tile queda oculto. */}
      {layout ? (
        <>
          {covers.map((cover, i) => (
            <CoverThumb
              key={`${i}:${cover}`}
              cover={cover}
              label=""
              // En círculo, cada celda es un cuadrado centrado: con dos fotos la celda mide 1:2 y saldría un óvalo.
              className={round ? `aspect-square w-full self-center !rounded-full ${layout.tiles[i]}` : `size-full ${layout.tiles[i]}`}
              onFail={() => setFailed((prev) => new Set(prev).add(cover))}
            />
          ))}
          {covers.length === 3 ? (
            <span
              data-mosaic-rest=""
              className={`flex size-full items-center justify-center bg-ink-surface font-data text-[clamp(0.625rem,11cqw,1rem)] text-paper-muted ${
                round ? "rounded-full" : ""
              }`}
            >
              {remaining > 0 ? `+${remaining}` : <EntityGlyph entityType={entityType} />}
            </span>
          ) : null}
        </>
      ) : (
        <DiscPlaceholder alt="" className="size-full" />
      )}
    </div>
  );
}

// Ícono del tipo de la lista para la cuarta celda: nota para canciones, persona para artistas, disco para álbumes (y por
// defecto). Trazo fino en `paper-muted`, a escala de la celda.
function EntityGlyph({ entityType }: { entityType?: ListCoverMosaicProps["entityType"] }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "size-2/5",
  };
  if (entityType === "artist") {
    return (
      <svg {...common} data-glyph="artist">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    );
  }
  if (entityType === "recording") {
    return (
      <svg {...common} data-glyph="recording">
        <path d="M9 18V5l11-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="17" cy="16" r="3" />
      </svg>
    );
  }
  return (
    <svg {...common} data-glyph="release-group">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}
