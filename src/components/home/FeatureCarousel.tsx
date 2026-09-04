"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Feature {
  title: string;
  body: string;
}

// Ancho del degradado de máscara en cada borde del carrusel: las tarjetas se
// desvanecen bajo las flechas en vez de quedar cortadas en seco.
const EDGE_FADE = "2.75rem";
// Entrada escalonada de las tarjetas: 55 ms de retraso por tarjeta, con tope
// para que las últimas no lleguen demasiado tarde.
const STAGGER_MS = 55;
const STAGGER_CAP = 6;

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// Carrusel horizontal de funcionalidades (Inicio anónimo): las tarjetas no
// bajan a una fila nueva cuando se acaba el ancho — siguen en horizontal y se
// navegan con las flechas ‹ ›, que ahora van *dentro* del carrusel, montadas
// sobre los bordes. El contenedor también scrollea con trackpad/teclado; las
// flechas solo aparecen si hay overflow y se desvanecen en cada extremo.
export function FeatureCarousel({
  title,
  features,
  prevLabel,
  nextLabel,
}: {
  title: string;
  features: Feature[];
  prevLabel: string;
  nextLabel: string;
}) {
  const scrollerRef = useRef<HTMLUListElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  // `armed`: hay JS y el usuario no pidió menos movimiento, así que las
  // tarjetas arrancan ocultas. `revealed`: el bloque entró en viewport y se
  // dispara la entrada escalonada. Sin JS, ambas quedan en false y las
  // tarjetas se muestran ya visibles.
  const [armed, setArmed] = useState(false);
  const [revealed, setRevealed] = useState(false);

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
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", sync);
      observer.disconnect();
    };
  }, [sync]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || prefersReducedMotion()) return;
    setArmed(true);
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setRevealed(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(section);
    return () => io.disconnect();
  }, []);

  // Paginado: un scroll suave corto entre grupos de tarjetas (antes era un
  // salto seco). Da continuidad sin volverse decorativo; con reduced-motion
  // vuelve al salto instantáneo.
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
    <section ref={sectionRef} className="flex w-full max-w-3xl flex-col gap-4">
      <h2 className="font-display text-xl text-paper">{title}</h2>

      <div className="relative">
        <ul
          ref={scrollerRef}
          aria-label={title}
          tabIndex={0}
          style={{ WebkitMaskImage: maskImage, maskImage }}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {features.map((feature, i) => (
            <li
              key={feature.title}
              style={
                revealed
                  ? { animationDelay: `${Math.min(i, STAGGER_CAP) * STAGGER_MS}ms` }
                  : undefined
              }
              className={`group relative flex w-64 shrink-0 snap-start flex-col gap-2 overflow-hidden rounded-lg border border-ink-border bg-ink-surface p-4 transition-colors duration-300 hover:border-paper-muted/40 ${
                revealed
                  ? "motion-safe:animate-[card-reveal_500ms_cubic-bezier(0.16,1,0.3,1)_both]"
                  : armed
                    ? "opacity-0"
                    : ""
              }`}
            >
              <Groove />
              <h3 className="relative font-display text-base text-paper">{feature.title}</h3>
              <p className="relative font-body text-sm text-paper-muted">{feature.body}</p>
            </li>
          ))}
        </ul>

        {(canPrev || canNext) && (
          <>
            <EdgeArrow side="left" label={prevLabel} onClick={() => step(-1)} disabled={!canPrev} />
            <EdgeArrow side="right" label={nextLabel} onClick={() => step(1)} disabled={!canNext} />
          </>
        )}
      </div>
    </section>
  );
}

// Surco de vinilo que asoma por la esquina inferior derecha de cada tarjeta:
// círculos concéntricos a hairline en tono `ink-border` (el objeto recurrente
// del sistema). Al pasar el cursor sube de opacidad y gira despacio, como un
// disco en el plato. Puramente decorativo — `aria-hidden` y `motion-safe:`.
function Groove() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 100"
      className="pointer-events-none absolute -bottom-14 -right-14 h-36 w-36 text-ink-border opacity-70 transition-opacity duration-500 group-hover:opacity-100 motion-safe:group-hover:animate-[groove-turn_9s_linear_infinite]"
    >
      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="50" cy="50" r="34" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="50" cy="50" r="20" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="50" cy="50" r="6" fill="currentColor" />
      <line x1="50" y1="2" x2="50" y2="16" stroke="currentColor" strokeWidth="1" />
      <line x1="50" y1="84" x2="50" y2="98" stroke="currentColor" strokeWidth="1" />
      <line x1="2" y1="50" x2="16" y2="50" stroke="currentColor" strokeWidth="1" />
    </svg>
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
