"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { SectionHeader } from "./SectionHeader";

export interface FamilyTile {
  key: string;
  label: string;
  href: string;
  /** Hasta cuatro carátulas de discos de la familia; vacío = tarjeta plana. */
  covers: string[];
}

interface FamilyGridProps {
  heading: string;
  description?: string;
  families: FamilyTile[];
  /** Familias secundarias, detrás de un desplegable. */
  moreFamilies?: FamilyTile[];
  moreLabel?: string;
  /** Texto del botón con las secundarias ya desplegadas. */
  lessLabel?: string;
}

/**
 * Cómo se reparte el mosaico según cuántas carátulas hay: con cuatro, 2×2; con tres, la primera ocupa las dos filas; con
 * dos, dos columnas a todo el alto; con una, a sangre.
 */
function mosaicLayout(count: number): { grid: string; span: (index: number) => string } {
  if (count >= 4) return { grid: "grid-cols-2 grid-rows-2", span: () => "" };
  if (count === 3) return { grid: "grid-cols-2 grid-rows-2", span: (i) => (i === 0 ? "row-span-2" : "") };
  if (count === 2) return { grid: "grid-cols-2 grid-rows-1", span: () => "" };
  return { grid: "grid-cols-1 grid-rows-1", span: () => "" };
}

function Tile({ family }: { family: FamilyTile }) {
  const covers = family.covers.slice(0, 4);
  const { grid, span } = mosaicLayout(covers.length);
  return (
    <Link
      href={family.href}
      className="group relative isolate block aspect-[4/3] overflow-hidden rounded-lg border border-ink-border bg-ink-surface transition-colors hover:border-amber focus-visible:border-amber"
    >
      {covers.length > 0 ? (
        <>
          {/* Las carátulas son decorativas: el enlace se nombra con la familia. */}
          <div aria-hidden="true" className={`absolute inset-0 -z-10 grid gap-px bg-ink ${grid}`}>
            {covers.map((cover, i) => (
              <div key={`${cover}-${i}`} className={`relative min-h-0 min-w-0 ${span(i)}`}>
                <CoverThumb cover={cover} label="" className="size-full !rounded-none" />
              </div>
            ))}
          </div>
          {/* Velo bajo el nombre: garantiza su contraste sobre cualquier carátula. */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 -z-10 h-3/5 bg-gradient-to-t from-ink via-ink/70 to-transparent"
          />
        </>
      ) : null}
      <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3">
        <span className="font-display text-base leading-tight text-paper">{family.label}</span>
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
 * Familias de géneros de `/explore` (openspec: visual-genre-families): una tarjeta por familia que es imagen primero —un
 * mosaico de carátulas reales con el nombre encima—, sin número de álbumes ni barra de tamaño: el conteo de lo que la base
 * ha guardado crece con cada artista que alguien abre y no dice nada de la familia. Cada tarjeta lleva a
 * `/explore?familia=`. Las familias secundarias se despliegan desde una tarjeta más de la propia grilla (ocupa el hueco de
 * la última fila en lugar de quedar suelta debajo) y se vuelven a plegar con "Ver menos". No renderiza nada si no hay
 * familias.
 */
export function FamilyGrid({ heading, description, families, moreFamilies = [], moreLabel, lessLabel }: FamilyGridProps) {
  const [expanded, setExpanded] = useState(false);
  if (families.length === 0 && moreFamilies.length === 0) return null;
  const visible = expanded ? [...families, ...moreFamilies] : families;
  const canToggle = moreFamilies.length > 0 && moreLabel;

  return (
    <section id="generos" aria-labelledby="explore-genres-heading" className="flex w-full scroll-mt-24 flex-col gap-3">
      <SectionHeader heading={heading} description={description} headingId="explore-genres-heading" />
      <ul id="explore-genre-families" className={GRID}>
        {visible.map((family) => (
          <li key={family.key}>
            <Tile family={family} />
          </li>
        ))}
        {canToggle ? (
          <li>
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls="explore-genre-families"
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
