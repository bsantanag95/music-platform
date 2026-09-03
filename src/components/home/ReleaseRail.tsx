"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { DiscPlaceholder } from "@/components/catalog/DiscPlaceholder";
import type { HomeRelease } from "@/services/home/home";

function formatMonth(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale, { month: "short", year: "numeric" });
}

// Riel único en línea de tiempo para "Lanzamientos recientes / Próximos
// lanzamientos" de Inicio: carátulas ordenadas por fecha, con un marcador
// "hoy" (la única veta de ámbar del bloque, como una aguja de VU) entre lo
// que ya salió y lo que viene. Las tarjetas futuras van atenuadas. Client
// component por las flechas ‹ › (mismo patrón que FeatureCarousel).
export function ReleaseRail({
  releases,
  locale,
  title,
  todayLabel,
  upcomingPrefix,
  prevLabel,
  nextLabel,
}: {
  releases: HomeRelease[];
  locale: string;
  title: string;
  todayLabel: string;
  upcomingPrefix: string;
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

  const step = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * Math.round(el.clientWidth * 0.8) });
    sync();
  };

  const sorted = [...releases].sort((a, b) => a.releaseDate.localeCompare(b.releaseDate));
  const firstUpcoming = sorted.findIndex((r) => r.section === "upcoming");
  const showMarker = firstUpcoming > 0;

  return (
    <section className="flex w-full max-w-3xl flex-col gap-4">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-xl text-paper">{title}</h2>
        {(canPrev || canNext) && (
          <div className="flex shrink-0 gap-2">
            <RailArrow label={prevLabel} onClick={() => step(-1)} disabled={!canPrev} direction="left" />
            <RailArrow label={nextLabel} onClick={() => step(1)} disabled={!canNext} direction="right" />
          </div>
        )}
      </div>

      <ul
        ref={scrollerRef}
        aria-label={title}
        tabIndex={0}
        className="flex snap-x gap-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {sorted.flatMap((release, i) => {
          const upcoming = release.section === "upcoming";
          const nodes = [];

          if (showMarker && i === firstUpcoming) {
            nodes.push(
              <li
                key="today-marker"
                aria-hidden
                className="flex shrink-0 flex-col items-center gap-2 self-stretch pt-1"
              >
                <span className="font-data text-[10px] uppercase tracking-widest text-amber">
                  {todayLabel}
                </span>
                <span className="w-px flex-1 bg-amber/60" />
              </li>,
            );
          }

          nodes.push(
            <li key={release.id} className="w-36 shrink-0 snap-start">
              <Link href={`/album/${release.id}`} className="group flex flex-col gap-2">
                {release.coverThumbUrl ? (
                  <div
                    className={`relative aspect-square overflow-hidden rounded border border-ink-border transition-colors group-hover:border-amber ${
                      upcoming ? "opacity-60" : ""
                    }`}
                  >
                    <Image
                      src={release.coverThumbUrl}
                      alt=""
                      fill
                      sizes="144px"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <DiscPlaceholder
                    alt=""
                    className={`aspect-square w-full rounded border border-ink-border transition-colors group-hover:border-amber ${
                      upcoming ? "opacity-60" : ""
                    }`}
                  />
                )}
                <div className="min-w-0">
                  <span className="block truncate font-display text-sm text-paper transition-colors group-hover:text-amber">
                    {release.title}
                  </span>
                  <span className="block truncate font-data text-xs text-paper-muted">
                    {release.artist}
                  </span>
                  <span className="block font-data text-xs text-paper-muted">
                    {upcoming ? `${upcomingPrefix} ` : ""}
                    {formatMonth(release.releaseDate, locale)}
                  </span>
                </div>
              </Link>
            </li>,
          );

          return nodes;
        })}
      </ul>
    </section>
  );
}

function RailArrow({
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
