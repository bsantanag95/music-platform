"use client";

import { useTranslations } from "next-intl";
import { FAVORITE_VIEW_MODES, type FavoriteViewMode } from "./favorite-view-mode";

// Mismos iconos mínimos (currentColor) que `WantToListenModeSwitcher`/
// `ArtistJourneyModeSwitcher`, misma familia de trazo fino del sistema.
const ICONS: Record<FavoriteViewMode, React.ReactNode> = {
  detailed: (
    <svg viewBox="0 0 16 16" aria-hidden className="size-4" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="1.5" y="2.5" width="4" height="4" rx="0.6" />
      <rect x="1.5" y="9.5" width="4" height="4" rx="0.6" />
      <line x1="7.5" y1="4" x2="14.5" y2="4" />
      <line x1="7.5" y1="6" x2="12" y2="6" />
      <line x1="7.5" y1="11" x2="14.5" y2="11" />
      <line x1="7.5" y1="13" x2="12" y2="13" />
    </svg>
  ),
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

// Conmutador del modo de visualización de Favoritos, calcado de
// `WantToListenModeSwitcher`: grupo de opciones excluyentes con
// `role="radiogroup"`, tabindex móvil y navegación por flechas.
export function FavoritesModeSwitcher({
  mode,
  onChange,
}: {
  mode: FavoriteViewMode;
  onChange: (next: FavoriteViewMode) => void;
}) {
  const t = useTranslations("favorites");

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const i = FAVORITE_VIEW_MODES.indexOf(mode);
    const nextIndex =
      event.key === "ArrowRight"
        ? (i + 1) % FAVORITE_VIEW_MODES.length
        : (i - 1 + FAVORITE_VIEW_MODES.length) % FAVORITE_VIEW_MODES.length;
    const next = FAVORITE_VIEW_MODES[nextIndex]!;
    onChange(next);
    document.getElementById(`favorite-mode-${next}`)?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={t("viewModeLabel")}
      onKeyDown={onKeyDown}
      className="flex shrink-0 items-center gap-1 rounded-md border border-ink-border p-0.5"
    >
      {FAVORITE_VIEW_MODES.map((value) => {
        const selected = value === mode;
        return (
          <button
            key={value}
            id={`favorite-mode-${value}`}
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
