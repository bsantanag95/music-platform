"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

// Ancho del degradado de máscara en cada borde (mismo valor que `HorizontalRail`).
const EDGE_FADE = "2.75rem";

// Contenedor desplazable de la franja de discografía. Al montar centra el álbum
// actual (el `<li>` con `data-current`) sin mover la página en vertical, y
// desvanece los bordes por los que todavía hay álbumes para que se note que la
// franja sigue.
export function DiscographyScroller({ children }: { children: ReactNode }) {
  const scrollerRef = useRef<HTMLOListElement>(null);
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
    // `scrollLeft` directo y no `scrollIntoView`: este último también desplaza la página.
    const current = el.querySelector<HTMLElement>("[data-current]");
    if (current) {
      el.scrollLeft = current.offsetLeft - (el.clientWidth - current.offsetWidth) / 2;
    }
    sync();
    el.addEventListener("scroll", sync, { passive: true });
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(sync);
    observer?.observe(el);
    return () => {
      el.removeEventListener("scroll", sync);
      observer?.disconnect();
    };
  }, [sync]);

  const leftStop = canPrev ? "transparent" : "#000";
  const rightStop = canNext ? "transparent" : "#000";
  const maskImage = `linear-gradient(to right, ${leftStop}, #000 ${EDGE_FADE}, #000 calc(100% - ${EDGE_FADE}), ${rightStop})`;

  return (
    // El padding deja lugar al anillo del álbum actual: `overflow-x-auto` también recorta en vertical.
    <ol
      ref={scrollerRef}
      style={{ WebkitMaskImage: maskImage, maskImage }}
      className="themed-scrollbar relative -mx-1 flex gap-3 overflow-x-auto px-1 pt-1 pb-3"
    >
      {children}
    </ol>
  );
}
