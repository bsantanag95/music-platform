"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AppImage } from "@/components/ui/AppImage";
import { Link } from "@/i18n/navigation";
import { DiscPlaceholder } from "@/components/catalog/DiscPlaceholder";
import { albumHref } from "@/lib/catalog-links";
import type { HomeRelease } from "@/services/home/home";

// Fecha corta de lanzamiento: día y mes ("12 sept"), con el año solo cuando no
// es el actual — en un riel alrededor de hoy el día importa más que el año.
function formatReleaseDate(iso: string, locale: string) {
  const date = new Date(`${iso}T00:00:00`);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// Ancho del degradado de máscara en cada borde: las carátulas se desvanecen
// bajo las flechas en vez de quedar cortadas en seco.
const EDGE_FADE = "2.75rem";
// Entrada escalonada de las carátulas: 55 ms por tarjeta, con tope.
const STAGGER_MS = 55;
const STAGGER_CAP = 6;

// Riel único en línea de tiempo para "Lanzamientos recientes / Próximos
// lanzamientos" de Inicio: carátulas ordenadas por fecha, con un marcador
// "hoy" (la única veta de ámbar del bloque, como una aguja de VU) entre lo
// que ya salió y lo que viene. Las tarjetas futuras van atenuadas. Client
// component por las flechas ‹ ›, que van *dentro* del riel montadas sobre los
// bordes (mismo patrón que FeatureCarousel).
export function ReleaseRail({
  releases,
  locale,
  title,
  todayLabel,
  upcomingPrefix,
  upcomingBadge,
  prevLabel,
  nextLabel,
}: {
  releases: HomeRelease[];
  locale: string;
  title: string;
  todayLabel: string;
  upcomingPrefix: string;
  upcomingBadge: string;
  prevLabel: string;
  nextLabel: string;
}) {
  const scrollerRef = useRef<HTMLUListElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  // `armed`: hay JS y no se pidió menos movimiento, así que las tarjetas
  // arrancan ocultas. `revealed`: el bloque entró en viewport. Sin JS, ambas
  // quedan en false y las carátulas se muestran ya visibles.
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

  // El riel arranca alrededor de "hoy" (no en el lanzamiento más viejo): el
  // marcador queda a ~60 % del ancho, con más recientes a la vista que próximos.
  // Instantáneo y una sola vez, antes de que el usuario toque el riel.
  useEffect(() => {
    const el = scrollerRef.current;
    const marker = el?.querySelector<HTMLElement>("[data-today-marker]");
    if (!el || !marker) return;
    el.scrollLeft = Math.max(0, marker.offsetLeft - el.clientWidth * 0.6);
    sync();
  }, [sync]);

  // Paginado: scroll suave corto entre grupos (antes era un salto seco). Con
  // reduced-motion vuelve al salto instantáneo.
  const step = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({
      left: direction * Math.round(el.clientWidth * 0.8),
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
    sync();
  };

  const sorted = [...releases].sort((a, b) => a.releaseDate.localeCompare(b.releaseDate));
  const firstUpcoming = sorted.findIndex((r) => r.section === "upcoming");
  const showMarker = firstUpcoming > 0;

  const revealClass = revealed
    ? "motion-safe:animate-[card-reveal_500ms_cubic-bezier(0.16,1,0.3,1)_both]"
    : armed
      ? "opacity-0"
      : "";
  const revealStyle = (i: number) =>
    revealed ? { animationDelay: `${Math.min(i, STAGGER_CAP) * STAGGER_MS}ms` } : undefined;

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
          className="flex snap-x gap-4 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {sorted.flatMap((release, i) => {
            const upcoming = release.section === "upcoming";
            const nodes = [];

            if (showMarker && i === firstUpcoming) {
              nodes.push(
                <li
                  key="today-marker"
                  aria-hidden
                  data-today-marker=""
                  style={revealStyle(firstUpcoming)}
                  className={`relative flex w-10 shrink-0 flex-col items-center gap-1.5 self-stretch ${revealClass}`}
                >
                  <span className="rounded-full border border-amber/50 bg-amber/10 px-1.5 py-px font-data text-[10px] uppercase tracking-widest text-amber">
                    {todayLabel}
                  </span>
                  <span className="w-px flex-1 bg-gradient-to-b from-amber/70 to-amber/0" />
                  {/* Tramo de pista y hito ámbar, a la altura de los hitos de las tarjetas. */}
                  <span className="absolute -left-4 -right-4 top-[calc(9rem+1.25rem)] h-px bg-ink-border" />
                  <span className="absolute top-[calc(9rem+1.25rem)] size-2.5 -translate-y-1/2 rounded-full bg-amber ring-4 ring-ink" />
                </li>,
              );
            }

            nodes.push(
              <li
                key={release.id}
                style={revealStyle(i)}
                className={`w-36 shrink-0 snap-start ${revealClass}`}
              >
                <Link
                  href={albumHref(release.artist, release.title, release.id)}
                  className="group flex flex-col"
                >
                  <div
                    className={`relative aspect-square overflow-hidden rounded-md shadow-md shadow-black/40 ring-1 ring-ink-border transition-[opacity,box-shadow] duration-200 group-hover:ring-amber ${
                      upcoming ? "opacity-60 group-hover:opacity-100" : ""
                    }`}
                  >
                    {release.coverThumbUrl ? (
                      <AppImage
                        src={release.coverThumbUrl}
                        alt=""
                        fill
                        sizes="144px"
                        className="object-cover transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-safe:group-hover:scale-[1.04]"
                      />
                    ) : (
                      <DiscPlaceholder alt="" className="size-full" />
                    )}
                    {upcoming ? (
                      <span className="absolute left-1.5 top-1.5 rounded-full bg-ink/85 px-2 py-0.5 font-data text-[10px] uppercase tracking-wider text-paper backdrop-blur-sm">
                        {upcomingBadge}
                      </span>
                    ) : null}
                  </div>

                  {/* Pista de la línea de tiempo: un tramo por tarjeta (cubre el
                      hueco hasta la siguiente) con un hito al inicio — relleno lo
                      que ya salió, hueco lo que viene. */}
                  <div className="relative mt-5 h-px">
                    <span className="absolute -right-4 left-0 top-0 h-px bg-ink-border" />
                    <span
                      className={`absolute left-0 top-0 size-2 -translate-y-1/2 rounded-full ring-4 ring-ink ${
                        upcoming ? "border border-paper-muted bg-ink" : "bg-paper-muted"
                      }`}
                    />
                  </div>

                  <div className="mt-3 min-w-0">
                    <time dateTime={release.releaseDate} className="block font-data text-xs text-paper-muted">
                      {upcoming ? `${upcomingPrefix} ` : ""}
                      {formatReleaseDate(release.releaseDate, locale)}
                    </time>
                    <span className="mt-1 block truncate font-display text-sm text-paper transition-colors group-hover:text-amber">
                      {release.title}
                    </span>
                    <span className="block truncate font-data text-xs text-paper-muted">
                      {release.artist}
                    </span>
                  </div>
                </Link>
              </li>,
            );

            return nodes;
          })}
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

// Flecha montada sobre el borde del riel, centrada a la altura de la carátula
// (144 px de alto). Se desvanece en cada extremo en vez de quedar deshabilitada
// a la vista.
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
      className={`absolute top-[76px] z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-ink-border bg-ink-surface/85 text-paper shadow-lg shadow-black/50 backdrop-blur-sm transition-[opacity,border-color,color] duration-200 hover:border-amber hover:text-amber disabled:pointer-events-none disabled:opacity-0 ${
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
