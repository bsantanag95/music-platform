import type { ReactNode } from "react";
import { DrawnVinylLayer, StageAmbient, StageVeil, VINYL_STYLE } from "@/components/catalog/stage-layers";

// Portada de la página de álbum (openspec: modernize-album-page-phase1, capability `album-page-layout`): franja a todo el
// ancho con la propia carátula desenfocada de fondo (solo color) o, sin carátula, el disco dibujado; las mismas capas que la
// portada del artista. Decorativas: la carátula legible es la de la funda, a lo sumo de 250 px. El velo, como en el mockup A
// Portada, es más claro a la izquierda (deja ver el color de la carátula y el vinilo junto a la funda) y más denso a la derecha.
const ALBUM_VEIL =
  "sm:bg-[linear-gradient(90deg,rgba(20,18,15,.25)_0%,rgba(20,18,15,.7)_55%,rgba(20,18,15,.88)_100%),linear-gradient(180deg,transparent_50%,var(--color-ink)_100%)]";

export function AlbumStage({ cover, children }: { cover: string | null; children: ReactNode }) {
  return (
    <section data-stage-mode={cover ? "ambient" : "none"} className="relative isolate overflow-hidden border-b border-ink-border bg-ink">
      {cover ? <StageAmbient src={cover} className="opacity-85 blur-[70px] saturate-[1.3]" /> : <DrawnVinylLayer />}
      <StageVeil wideClassName={ALBUM_VEIL} />
      {children}
    </section>
  );
}

/**
 * La carátula saliendo de su funda: un disco de vinilo decorativo asoma detrás, desplazado a la derecha (un 30 % del ancho,
 * como en el mockup A Portada; la columna de texto deja ese espacio con su margen). La carátula sigue
 * siendo `children` (`AlbumCover`, miniatura de 250 px con reintentos y relleno).
 */
export function AlbumSleeve({ children }: { children: ReactNode }) {
  return (
    <div data-album-sleeve className="relative w-[min(250px,42vw)] shrink-0 sm:w-[200px] lg:w-[250px]">
      <span aria-hidden className="absolute left-[30%] top-[4%] block aspect-square w-[92%] rounded-full shadow-[0_30px_60px_-24px_rgba(0,0,0,.95)]" style={VINYL_STYLE} />
      <div className="relative z-10 shadow-[0_40px_70px_-30px_rgba(0,0,0,.95),0_0_0_1px_rgba(242,237,228,.08)]">{children}</div>
    </div>
  );
}
