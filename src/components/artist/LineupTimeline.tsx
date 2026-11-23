import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { artistHref } from "@/lib/catalog-links";
import type { LineupTimelineData, TimelineSegment } from "./lineup-timeline";

// «La banda a lo largo del tiempo» (openspec: modernize-artist-page-phase2, capability `artist-lineup-view`): una fila por
// integrante con sus tramos sobre un eje de años; la voz en ámbar encima de los instrumentos. La pista es decorativa: cada
// fila lleva el mismo texto de roles y años que la lista, para lectores de pantalla. Componente de servidor.

const FADE_START = "linear-gradient(90deg, transparent, #000 70%)";
const FADE_END = "linear-gradient(90deg, #000 30%, transparent)";

function fade(segment: TimelineSegment): CSSProperties {
  const mask =
    segment.openStart && segment.openEnd
      ? "linear-gradient(90deg, transparent, #000 35%, #000 65%, transparent)"
      : segment.openStart
        ? FADE_START
        : segment.openEnd
          ? FADE_END
          : undefined;
  return mask ? { maskImage: mask, WebkitMaskImage: mask } : {};
}

export function LineupTimeline({ data, descriptions }: { data: LineupTimelineData; descriptions: Record<string, string> }) {
  const t = useTranslations("catalog.artist.lineup.timeline");
  const span = data.to - data.from;
  const at = (year: number) => ((year - data.from) / span) * 100;
  // En el teléfono cada década mide poco: se ocultan las impares y las que quedan pegadas al inicio o al final del eje.
  const crowded = (year: number) => (year / 10) % 2 === 1 || year - data.from < span * 0.12 || data.to - year < span * 0.12;
  const columns = "grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-x-3 sm:grid-cols-[10rem_minmax(0,1fr)]";

  return (
    <figure data-lineup-timeline className="flex flex-col gap-3 rounded border border-ink-border bg-ink-surface/40 p-3 sm:p-4">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="font-display text-base text-paper">{t("title")}</span>
        <span aria-hidden="true" className="flex items-center gap-3 font-data text-xs text-paper-muted">
          <span className="flex items-center gap-1.5">
            <i className="block h-1.5 w-4 rounded-sm bg-amber" />
            {t("voice")}
          </span>
          <span className="flex items-center gap-1.5">
            <i className="block h-3 w-4 rounded-sm bg-paper/35" />
            {t("instruments")}
          </span>
        </span>
      </figcaption>

      <ul className="flex flex-col gap-1">
        {data.rows.map((row) => (
          <li key={row.artistId} className={columns}>
            <Link
              href={artistHref(row.name, row.artistId)}
              className={`truncate font-body text-xs hover:text-amber sm:text-sm ${row.current ? "text-paper" : "text-paper-muted"}`}
            >
              {row.name}
              {descriptions[row.artistId] ? <span className="sr-only">: {descriptions[row.artistId]}</span> : null}
            </Link>
            <div aria-hidden="true" className="relative h-3.5 rounded-sm bg-ink-border/40">
              {row.segments.map((segment, index) => (
                <span
                  key={index}
                  className={`absolute rounded-sm ${segment.kind === "voice" ? "top-1/4 z-10 h-1/2 bg-amber" : "inset-y-0 bg-paper/35"}`}
                  style={{ left: `${at(segment.from)}%`, width: `${Math.max(at(segment.to) - at(segment.from), 0.8)}%`, ...fade(segment) }}
                />
              ))}
            </div>
          </li>
        ))}
      </ul>

      <div aria-hidden="true" className={columns}>
        <span />
        <div className="relative h-4 font-data text-[0.6875rem] text-paper-muted">
          {data.ticks.map((year, index) => (
            <span
              key={year}
              className={`absolute top-0 ${index === 0 ? "" : "-translate-x-1/2"} ${index > 0 && crowded(year) ? "hidden sm:block" : ""}`}
              style={{ left: `${at(year)}%` }}
            >
              {year}
            </span>
          ))}
          <span className="absolute right-0 top-0">{data.present ? t("now") : data.to}</span>
        </div>
      </div>
    </figure>
  );
}
