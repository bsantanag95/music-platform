import type { ReactNode } from "react";
import { AppImage } from "@/components/ui/AppImage";
import { DrawnVinylLayer, STAGE_LAYER as LAYER, StageAmbient, StageVeil, VINYL_STYLE as VINYL } from "@/components/catalog/stage-layers";
import { fanLayout, wallCells, type StageBackdrop } from "./artist-stage";

// Portada de la página de artista (openspec: modernize-artist-page-phase1, capability `artist-header`, requisito «Portada
// de carátulas»): franja a todo el ancho cuyo fondo sale de las carátulas de la discografía principal. Con 8 o más, un
// muro atenuado; con 1 a 7, el color desenfocado del último trabajo y las fundas en abanico, con el último al frente (con una sola, el disco asoma); sin
// carátulas, un disco dibujado. Las capas son decorativas (`aria-hidden`) y usan las miniaturas de 250 px, nunca la
// resolución completa (docs/03-data/data-licensing.md). Un velo de tinta deja el texto legible.

function Wall({ backdrop }: { backdrop: StageBackdrop }) {
  return (
    <div aria-hidden data-stage-layer="wall" className={`${LAYER} -inset-x-[4%] -inset-y-[6%] overflow-hidden opacity-50`}>
      <div className="grid -rotate-[4deg] grid-cols-5 gap-2.5 sm:grid-cols-9">
        {wallCells(backdrop.covers).map((cover, index) => (
          <span key={index} className="relative block aspect-square overflow-hidden rounded-md bg-ink-surface">
            <AppImage src={cover.thumbUrl} alt="" fill sizes="(min-width: 640px) 11vw, 20vw" className="object-cover" />
          </span>
        ))}
      </div>
    </div>
  );
}

function Fan({ backdrop }: { backdrop: StageBackdrop }) {
  const first = backdrop.ambient ?? backdrop.covers[0];
  const layout = fanLayout(backdrop.covers.length);
  return (
    <>
      {first && <StageAmbient src={first.thumbUrl} />}
      {/* En el teléfono el abanico sube a la esquina superior derecha, junto al retrato; en escritorio va a la derecha,
          a media altura, sin tapar el nombre. */}
      <div
        aria-hidden
        data-stage-layer="fan"
        className={`${LAYER} right-4 top-24 h-[30vw] w-[52vw] opacity-85 sm:right-[max(4%,calc(50%-44rem+3rem))] sm:top-[40%] sm:h-[min(280px,21vw)] sm:w-[min(480px,36vw)] sm:-translate-y-1/2 sm:opacity-100`}
      >
        {layout.length === 1 && <span className="absolute top-[4%] block aspect-square h-[92%] rounded-full shadow-2xl" style={{ ...VINYL, left: "34%" }} />}
        {/* Sin fundas (la única carátula ya es el retrato): el disco solo, sobre el color de esa carátula. */}
        {layout.length === 0 && <span className="absolute top-0 block aspect-square h-full rounded-full opacity-80 shadow-2xl" style={{ ...VINYL, left: "30%" }} />}
        {backdrop.covers.map((cover, index) => (
          <span
            key={cover.id}
            className="absolute top-0 block aspect-square h-full overflow-hidden rounded-md bg-ink-surface shadow-[0_30px_60px_-24px_rgba(0,0,0,.95),0_0_0_1px_rgba(242,237,228,.08)]"
            style={{ left: `${layout[index]!.left}%`, zIndex: 10 - index, transform: `rotate(${layout[index]!.rotate}deg)` }}
          >
            <AppImage src={cover.thumbUrl} alt="" fill sizes="280px" className="object-cover" />
          </span>
        ))}
      </div>
    </>
  );
}

export function ArtistStage({ backdrop, credit, children }: { backdrop: StageBackdrop; credit?: ReactNode; children: ReactNode }) {
  return (
    <section data-stage-mode={backdrop.mode} className="relative isolate overflow-hidden border-b border-ink-border bg-ink">
      {backdrop.mode === "wall" && <Wall backdrop={backdrop} />}
      {backdrop.mode === "fan" && <Fan backdrop={backdrop} />}
      {backdrop.mode === "none" && <DrawnVinylLayer />}
      <StageVeil />
      {children}
      {credit}
    </section>
  );
}
