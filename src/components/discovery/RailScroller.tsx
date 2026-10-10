"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

interface RailScrollerProps {
  /** Encabezado de la sección; las flechas van a su derecha. */
  header: ReactNode;
  /** Los `<li>` del riel (cada uno con su ancho y `snap-start`). */
  children: ReactNode;
  labelledBy?: string;
}

function Arrow({ direction }: { direction: "prev" | "next" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-4"
    >
      <path d={direction === "prev" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
    </svg>
  );
}

// Riel horizontal de Explorar: una sola fila con desplazamiento y `scroll-snap`, en lugar de la
// grilla de dos filas que alargaba la portada. Las flechas (desde `sm`) avanzan casi un ancho
// de riel y se apagan en cada extremo; en táctil se desliza. Los degradados de los bordes son
// capas aparte (no `mask-image`): una máscara también recortaría el menú "…" de cada tarjeta.
export function RailScroller({ header, children, labelledBy }: RailScrollerProps) {
  const t = useTranslations("catalog.explore");
  const listRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  const update = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const start = el.scrollLeft > 4;
    const end = el.scrollWidth - el.scrollLeft - el.clientWidth > 4;
    setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [update]);

  const scroll = (direction: 1 | -1) => {
    const el = listRef.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: reduce ? "auto" : "smooth" });
  };

  const button =
    "grid size-8 place-items-center rounded-full border border-ink-border text-paper-muted transition-colors enabled:hover:border-paper-muted/60 enabled:hover:text-paper disabled:opacity-30";
  const arrows =
    edges.start || edges.end ? (
      <div className="hidden items-center gap-1.5 sm:flex">
        <button type="button" className={button} onClick={() => scroll(-1)} disabled={!edges.start} aria-label={t("scrollPrev")}>
          <Arrow direction="prev" />
        </button>
        <button type="button" className={button} onClick={() => scroll(1)} disabled={!edges.end} aria-label={t("scrollNext")}>
          <Arrow direction="next" />
        </button>
      </div>
    ) : null;

  return (
    <>
      <div className="flex w-full items-end gap-4">
        <div className="min-w-0 flex-1">{header}</div>
        {arrows}
      </div>
      <div className="relative w-full">
        <ul
          ref={listRef}
          onScroll={update}
          aria-labelledby={labelledBy}
          className="themed-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3"
        >
          {children}
        </ul>
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-ink to-transparent transition-opacity duration-200 ${
            edges.start ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-ink to-transparent transition-opacity duration-200 ${
            edges.end ? "opacity-100" : "opacity-0"
          }`}
        />
      </div>
    </>
  );
}
