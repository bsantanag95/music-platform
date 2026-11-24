import type { CSSProperties } from "react";
import { AppImage } from "@/components/ui/AppImage";

// Capas de las portadas a todo el ancho de artista y álbum (openspec: modernize-artist-page-phase1 y
// modernize-album-page-phase1): el disco de vinilo dibujado, el fondo desenfocado de una carátula (solo color) y el velo de
// tinta que deja el texto legible. Todas decorativas (`aria-hidden`); las carátulas son siempre las miniaturas de 250 px
// (docs/03-data/data-licensing.md). Van dentro de una sección `relative isolate overflow-hidden`.

/** Disco de vinilo dibujado: etiqueta ámbar y surcos concéntricos. */
export const VINYL_STYLE: CSSProperties = {
  background:
    "radial-gradient(circle, #14120f 0 1.4%, rgba(232,184,75,.9) 1.5% 15%, #14120f 15.2% 17%, transparent 17.2%), repeating-radial-gradient(circle, #181512 0 2px, #26211c 2px 3px)",
};

export const STAGE_LAYER = "pointer-events-none absolute -z-10";

/** Fondo con una carátula ampliada y desenfocada: deja solo su color. */
export function StageAmbient({ src, className = "opacity-55 blur-[60px] saturate-[1.2]" }: { src: string; className?: string }) {
  return (
    <div aria-hidden data-stage-layer="ambient" className={`${STAGE_LAYER} -inset-[20%] ${className}`}>
      <AppImage src={src} alt="" fill sizes="250px" className="object-cover" />
    </div>
  );
}

/** Sin carátulas: tinta con un disco grande dibujado a la derecha. */
export function DrawnVinylLayer() {
  return (
    <div aria-hidden data-stage-layer="vinyl" className={`${STAGE_LAYER} inset-0 bg-[linear-gradient(160deg,#1f1b17,var(--color-ink)_70%)]`}>
      <span
        className="absolute right-[6%] top-1/2 block aspect-square w-[min(620px,70vw)] -translate-y-1/2 rounded-full opacity-75 shadow-[0_40px_80px_-30px_rgba(0,0,0,.9)] sm:w-[min(620px,46vw)]"
        style={VINYL_STYLE}
      />
    </div>
  );
}

/** Velo de tinta por defecto (artista): más denso a la izquierda (donde va el texto) y hacia abajo (donde empiezan las pestañas). */
const VEIL_DEFAULT =
  "sm:bg-[linear-gradient(90deg,rgba(20,18,15,.96)_0%,rgba(20,18,15,.8)_45%,rgba(20,18,15,.3)_100%),linear-gradient(180deg,rgba(20,18,15,.15)_40%,var(--color-ink)_100%)]";

/**
 * Velo de tinta que deja el texto legible. Desde `sm` cada portada elige su degradado horizontal con `wideClassName` (clases
 * literales, para que Tailwind las genere); en móvil siempre el vertical.
 */
export function StageVeil({ wideClassName = VEIL_DEFAULT }: { wideClassName?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 -z-[5] bg-[linear-gradient(180deg,rgba(20,18,15,.3)_0%,rgba(20,18,15,.86)_52%,var(--color-ink)_100%)] ${wideClassName}`}
    />
  );
}
