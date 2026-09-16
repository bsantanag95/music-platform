"use client";

import { useTranslations } from "next-intl";
import { FOLLOWED_ARTIST_VIEW_MODES, type FollowedArtistViewMode } from "./followed-artist-view-mode";

// Mismos iconos mínimos (currentColor) que `FavoritesModeSwitcher`/
// `WantToListenModeSwitcher`, misma familia de trazo fino del sistema. Solo
// índice y gráfico — ver `followed-artist-view-mode.ts`.
const ICONS: Record<FollowedArtistViewMode, React.ReactNode> = {
  index: (
    <svg viewBox="0 0 16 16" aria-hidden className="size-4" fill="none" stroke="currentColor" strokeWidth="1.4">
      <line x1="2" y1="4" x2="14" y2="4" />
      <line x1="2" y1="8" x2="14" y2="8" />
      <line x1="2" y1="12" x2="14" y2="12" />
    </svg>
  ),
  graphic: (
    <svg viewBox="0 0 16 16" aria-hidden className="size-4" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="2" y="2" width="5" height="5" rx="0.6" />
      <rect x="9" y="2" width="5" height="5" rx="0.6" />
      <rect x="2" y="9" width="5" height="5" rx="0.6" />
      <rect x="9" y="9" width="5" height="5" rx="0.6" />
    </svg>
  ),
};

// Conmutador del modo de visualización de "Artistas que sigo", calcado de
// `FavoritesModeSwitcher`: grupo de opciones excluyentes con
// `role="radiogroup"`, tabindex móvil y navegación por flechas.
export function FollowedArtistModeSwitcher({
  mode,
  onChange,
}: {
  mode: FollowedArtistViewMode;
  onChange: (next: FollowedArtistViewMode) => void;
}) {
  const t = useTranslations("users.artistsFollowed");

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const i = FOLLOWED_ARTIST_VIEW_MODES.indexOf(mode);
    const nextIndex =
      event.key === "ArrowRight"
        ? (i + 1) % FOLLOWED_ARTIST_VIEW_MODES.length
        : (i - 1 + FOLLOWED_ARTIST_VIEW_MODES.length) % FOLLOWED_ARTIST_VIEW_MODES.length;
    const next = FOLLOWED_ARTIST_VIEW_MODES[nextIndex]!;
    onChange(next);
    document.getElementById(`followed-artist-mode-${next}`)?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={t("viewModeLabel")}
      onKeyDown={onKeyDown}
      className="flex shrink-0 items-center gap-1 rounded-md border border-ink-border p-0.5"
    >
      {FOLLOWED_ARTIST_VIEW_MODES.map((value) => {
        const selected = value === mode;
        return (
          <button
            key={value}
            id={`followed-artist-mode-${value}`}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(value)}
            className={`inline-flex items-center gap-1.5 rounded px-2 py-1 font-data text-xs transition-colors ${
              selected ? "bg-amber/10 text-amber" : "text-paper-muted hover:text-paper"
            }`}
          >
            {ICONS[value]}
            <span className="sr-only sm:not-sr-only">{t(`viewMode.${value}`)}</span>
          </button>
        );
      })}
    </div>
  );
}
