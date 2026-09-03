"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Feature {
  title: string;
  body: string;
}

// Carrusel horizontal de funcionalidades (Inicio anónimo): las tarjetas no
// bajan a una fila nueva cuando se acaba el ancho — siguen en horizontal y se
// navegan con las flechas ‹ ›. El contenedor también scrollea con
// trackpad/teclado; las flechas solo aparecen si hay overflow.
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
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", sync);
      observer.disconnect();
    };
  }, [sync]);

  // Paginado directo, sin animación de scroll: el sistema de diseño evita el
  // movimiento decorativo y un salto nítido entre grupos de tarjetas encaja
  // mejor que un deslizamiento. `scroll-snap` alinea el reposo a la tarjeta.
  const step = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * Math.round(el.clientWidth * 0.8) });
    // El salto es síncrono (sin `behavior: smooth`), así que refrescamos las
    // flechas ya, sin depender del evento `scroll`.
    sync();
  };

  return (
    <section className="flex w-full max-w-3xl flex-col gap-4">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-xl text-paper">{title}</h2>
        {(canPrev || canNext) && (
          <div className="flex shrink-0 gap-2">
            <ArrowButton label={prevLabel} onClick={() => step(-1)} disabled={!canPrev} direction="left" />
            <ArrowButton label={nextLabel} onClick={() => step(1)} disabled={!canNext} direction="right" />
          </div>
        )}
      </div>

      <ul
        ref={scrollerRef}
        aria-label={title}
        tabIndex={0}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {features.map((feature) => (
          <li
            key={feature.title}
            className="flex w-64 shrink-0 snap-start flex-col gap-2 rounded-lg border border-ink-border bg-ink-surface p-4"
          >
            <h3 className="font-display text-base text-paper">{feature.title}</h3>
            <p className="font-body text-sm text-paper-muted">{feature.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ArrowButton({
  label,
  onClick,
  disabled,
  direction,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  direction: "left" | "right";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex size-8 items-center justify-center rounded border border-ink-border bg-ink-surface text-paper transition-colors hover:border-amber disabled:opacity-40 disabled:hover:border-ink-border"
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
        <polyline points={direction === "left" ? "15 18 9 12 15 6" : "9 18 15 12 9 6"} />
      </svg>
    </button>
  );
}
