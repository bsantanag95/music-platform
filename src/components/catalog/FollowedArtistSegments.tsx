"use client";

import { useTranslations } from "next-intl";
import { FOLLOWED_ARTIST_SEGMENTS, type FollowedArtistSegment } from "./followed-artist-filters";

// Segmentos de "Artistas que sigo" con su cuenta (openspec: redesign-artists-toolbar, D4), con la misma forma que los
// segmentos de estado de `/me/progress`. Botones con `aria-pressed`; un segmento vacío queda deshabilitado salvo que
// esté activo. Las cifras cuentan la lista completa, sin la búsqueda. En un teléfono la cifra va bajo la etiqueta.
export function FollowedArtistSegments({
  value,
  onChange,
  counts,
}: {
  value: FollowedArtistSegment;
  onChange: (value: FollowedArtistSegment) => void;
  counts: Record<FollowedArtistSegment, number>;
}) {
  const t = useTranslations("users.artistsFollowed");

  return (
    <div
      role="group"
      aria-label={t("segmentLabel")}
      className="flex w-full items-stretch gap-0.5 rounded-md border border-ink-border p-0.5 sm:w-auto sm:gap-1 sm:self-start"
    >
      {FOLLOWED_ARTIST_SEGMENTS.map((segment) => {
        const selected = value === segment;
        return (
          <button
            key={segment}
            type="button"
            aria-pressed={selected}
            disabled={!selected && counts[segment] === 0}
            onClick={() => {
              if (!selected) onChange(segment);
            }}
            className={`inline-flex min-w-0 flex-1 flex-col items-center justify-center whitespace-nowrap rounded px-1 py-1 font-data text-xs leading-tight transition-colors disabled:opacity-40 sm:flex-none sm:flex-row sm:gap-1.5 sm:px-2.5 sm:py-1.5 [@media(pointer:coarse)]:min-h-11 ${
              selected ? "bg-amber/10 text-amber" : "text-paper-muted enabled:hover:text-paper"
            }`}
          >
            {t(`segment.${segment}`)}{" "}
            <span className={selected ? "text-amber/80" : "text-paper-muted/70"}>{counts[segment]}</span>
          </button>
        );
      })}
    </div>
  );
}
