"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

// Ancho del degradado de máscara en cada borde: el contenido se desvanece bajo
// las flechas en vez de quedar cortado en seco (mismo valor que `ReleaseRail`).
const EDGE_FADE = "2.75rem";

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

interface HorizontalRailProps {
  /** Nombre accesible de la región desplazable. */
  label: string;
  prevLabel: string;
  nextLabel: string;
  /** Los `<li>` del riel; cada uno fija su propio ancho y `shrink-0`. */
  children: ReactNode;
}

// Riel horizontal con flechas ‹ › montadas sobre los bordes: la mecánica del
// riel de "Lanzamientos recientes y próximos" del Inicio (`ReleaseRail`) sin su
// línea de tiempo ni la entrada escalonada, para estantes de tarjetas de ancho
// fijo (las listas del perfil). Las flechas aparecen solo si hay overflow y se
// desvanecen en el extremo en que ya no hay a dónde ir. La propia lista es
// enfocable, así que el teclado la desplaza con las flechas del navegador.
export function HorizontalRail({ label, prevLabel, nextLabel, children }: HorizontalRailProps) {
  const scrollerRef = useRef<HTMLUListElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const sync = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanPrev(el.scrollLeft > 1);
    setCanNext(el.scrollLeft < max - 1);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    sync();
    el.addEventListener("scroll", sync, { passive: true });
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(sync);
    observer?.observe(el);
    return () => {
      el.removeEventListener("scroll", sync);
      observer?.disconnect();
    };
  }, [sync]);

  // Paginado: scroll suave de ~80% del ancho visible; con reduced-motion, salto.
  const step = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({
      left: direction * Math.round(el.clientWidth * 0.8),
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
    sync();
  };

  const leftStop = canPrev ? "transparent" : "#000";
  const rightStop = canNext ? "transparent" : "#000";
  const maskImage = `linear-gradient(to right, ${leftStop}, #000 ${EDGE_FADE}, #000 calc(100% - ${EDGE_FADE}), ${rightStop})`;

  return (
    <div className="relative">
      <ul
        ref={scrollerRef}
        aria-label={label}
        tabIndex={0}
        style={{ WebkitMaskImage: maskImage, maskImage }}
        className="flex snap-x gap-4 overflow-x-auto py-1 [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-offset-2 [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </ul>

      {(canPrev || canNext) && (
        <>
          <EdgeArrow side="left" label={prevLabel} onClick={() => step(-1)} disabled={!canPrev} />
          <EdgeArrow side="right" label={nextLabel} onClick={() => step(1)} disabled={!canNext} />
        </>
      )}
    </div>
  );
}

function EdgeArrow({
  side,
  label,
  onClick,
  disabled,
}: {
  side: "left" | "right";
  label: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`absolute top-1/2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded border border-ink-border bg-ink-surface text-paper transition-[opacity,border-color] duration-200 hover:border-amber disabled:pointer-events-none disabled:opacity-0 ${
        side === "left" ? "left-1" : "right-1"
      }`}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points={side === "left" ? "15 18 9 12 15 6" : "9 18 15 12 9 6"} />
      </svg>
    </button>
  );
}
