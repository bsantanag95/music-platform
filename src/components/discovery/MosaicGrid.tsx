"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { CoverMosaic } from "./CoverMosaic";
import { SectionHeader } from "./SectionHeader";

export interface MosaicTile {
  key: string;
  label: string;
  href: string;
  /** Hasta cuatro carátulas de discos del corte (familia, década); vacío = tarjeta plana. */
  covers: string[];
}

interface MosaicGridProps {
  heading: string;
  description?: string;
  /** Ancla de la sección (`generos`, `decadas`): la navegación rápida de `/explore` apunta a ella. */
  id: string;
  /** Id del título (`aria-labelledby` de la sección) y de la lista, únicos por grilla. */
  headingId: string;
  listId: string;
  tiles: MosaicTile[];
  /** Tarjetas secundarias, detrás de una tarjeta más de la propia grilla que las despliega. */
  moreTiles?: MosaicTile[];
  moreLabel?: string;
  /** Texto del botón con las secundarias ya desplegadas. */
  lessLabel?: string;
}

function Tile({ tile }: { tile: MosaicTile }) {
  const covers = tile.covers.slice(0, 4);
  return (
    <Link
      href={tile.href}
      className="group relative isolate block aspect-[4/3] overflow-hidden rounded-lg border border-ink-border bg-ink-surface transition-colors hover:border-amber focus-visible:border-amber"
    >
      {covers.length > 0 ? (
        <>
          {/* Las carátulas son decorativas: el enlace se nombra con el corte. */}
          <CoverMosaic covers={covers} className="absolute inset-0 -z-10 grid" />
          {/* Velo bajo el nombre: garantiza su contraste sobre cualquier carátula. */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 -z-10 h-3/5 bg-gradient-to-t from-ink via-ink/70 to-transparent"
          />
        </>
      ) : null}
      <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3">
        <span className="font-display text-base leading-tight text-paper">{tile.label}</span>
        {/* La flecha aparece solo al pasar el mouse o con foco: repetida en cada tarjeta era ruido. */}
        <span
          aria-hidden="true"
          className="text-amber opacity-0 transition-[opacity,transform] duration-150 group-hover:translate-x-0.5 group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          →
        </span>
      </span>
    </Link>
  );
}

const GRID = "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6";

/**
 * Grilla de tarjetas de `/explore` para las familias de géneros (openspec: visual-genre-families) y las décadas
 * (redesign-explore-decades): cada tarjeta es imagen primero —un mosaico de carátulas reales con el nombre encima—, sin número
 * de álbumes ni barra de tamaño: el conteo de lo que la base ha guardado crece con cada artista que alguien abre y no dice nada
 * del corte. Las tarjetas secundarias se despliegan desde una tarjeta más de la propia grilla (ocupa el hueco de la última fila
 * en lugar de quedar suelta debajo) y se vuelven a plegar con "Ver menos". No renderiza nada si no hay tarjetas.
 */
export function MosaicGrid({ heading, description, id, headingId, listId, tiles, moreTiles = [], moreLabel, lessLabel }: MosaicGridProps) {
  const [expanded, setExpanded] = useState(false);
  if (tiles.length === 0 && moreTiles.length === 0) return null;
  const visible = expanded ? [...tiles, ...moreTiles] : tiles;
  const canToggle = moreTiles.length > 0 && moreLabel;

  return (
    <section id={id} aria-labelledby={headingId} className="flex w-full scroll-mt-24 flex-col gap-3">
      <SectionHeader heading={heading} description={description} headingId={headingId} />
      <ul id={listId} className={GRID}>
        {visible.map((tile) => (
          <li key={tile.key}>
            <Tile tile={tile} />
          </li>
        ))}
        {canToggle ? (
          <li>
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={listId}
              onClick={() => setExpanded((open) => !open)}
              className="flex aspect-[4/3] size-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-ink-border px-3 py-2.5 font-data text-xs text-paper-muted transition-colors hover:border-paper-muted/60 hover:text-paper"
            >
              {expanded ? lessLabel ?? moreLabel : moreLabel}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
                className={`size-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </li>
        ) : null}
      </ul>
    </section>
  );
}
