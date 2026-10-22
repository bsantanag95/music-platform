"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { DiaryAudience, Favorite } from "@/lib/api/schemas";

const AUDIENCES: DiaryAudience[] = ["public", "followers", "private"];

const ICON_PROPS = { viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 1.4, "aria-hidden": true } as const;

/** Icono de la audiencia: candado (privado), personas (seguidores) y globo (público). */
export function AudienceIcon({ audience, className = "size-3" }: { audience: DiaryAudience; className?: string }) {
  if (audience === "private") {
    return (
      <svg {...ICON_PROPS} className={className}>
        <rect x="3" y="7" width="10" height="7" rx="1.5" />
        <path d="M5.5 7V5a2.5 2.5 0 015 0v2" />
      </svg>
    );
  }
  if (audience === "followers") {
    return (
      <svg {...ICON_PROPS} className={className}>
        <circle cx="6" cy="5.5" r="2.3" />
        <path d="M1.8 13c.4-2.4 2-3.6 4.2-3.6s3.8 1.2 4.2 3.6" />
        <path d="M10.5 3.6a2.2 2.2 0 010 4M12 9.6c1.4.5 2.2 1.6 2.4 3.4" />
      </svg>
    );
  }
  return (
    <svg {...ICON_PROPS} className={className}>
      <circle cx="8" cy="8" r="6" />
      <path d="M2 8h12M8 2c2 2 2 10 0 12M8 2c-2 2-2 10 0 12" />
    </svg>
  );
}

const BADGE_TONE: Record<DiaryAudience, string> = {
  public: "border-ink-border text-paper-muted hover:text-paper",
  followers: "border-petrol/50 text-petrol-hover hover:text-paper",
  private: "border-amber/40 text-amber hover:text-amber-hover",
};

interface FavoriteActionsProps {
  favorite: Favorite;
  busy?: boolean;
  /** Muestra la insignia con el nombre de la audiencia además del `⋯` (Gráfico solo muestra el `⋯`). */
  showBadge?: boolean;
  onAudienceChange: (favorite: Favorite, audience: DiaryAudience) => void;
  onRemove: (favorite: Favorite) => void;
}

// Insignia de audiencia y botón `⋯` que abren el mismo menú (openspec: redesign-favorites-views): las tres
// audiencias (`menuitemradio`, la vigente marcada) y "Quitar favorito" (`menuitem`). Reemplaza al `select` y al
// enlace "Quitar" que cada vista escribía por su cuenta. Se cierra con Escape, con un clic fuera o al elegir, y
// devuelve el foco al disparador; las flechas mueven entre opciones.
export function FavoriteActions({ favorite, busy, showBadge = true, onAudienceChange, onRemove }: FavoriteActionsProps) {
  const t = useTranslations("favorites");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const lastTrigger = useRef<HTMLElement | null>(null);
  const menuId = useId();
  const audienceName = t(`audience.${favorite.audience}`);

  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    if (refocus) lastTrigger.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const items = () => [...(menuRef.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? [])];
    items()[0]?.focus();
    const onDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        close(true);
        return;
      }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      event.preventDefault();
      const list = items();
      const index = list.indexOf(document.activeElement as HTMLElement);
      const next = event.key === "ArrowDown" ? (index + 1) % list.length : (index - 1 + list.length) % list.length;
      list[next]?.focus();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open, close]);

  const toggle = (event: React.MouseEvent<HTMLElement>) => {
    lastTrigger.current = event.currentTarget;
    setOpen((current) => !current);
  };

  const touch = "[@media(pointer:coarse)]:min-h-11";

  return (
    <div ref={rootRef} className="relative flex items-center gap-1">
      {showBadge ? (
        <button
          type="button"
          disabled={busy}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          aria-label={t("audienceBadgeLabel", { audience: audienceName })}
          onClick={toggle}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-data text-[0.7rem] transition-colors disabled:opacity-50 ${BADGE_TONE[favorite.audience]} ${touch}`}
        >
          <AudienceIcon audience={favorite.audience} />
          {audienceName}
        </button>
      ) : null}
      <button
        type="button"
        disabled={busy}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={t("actionsFor", { title: favorite.target.title, audience: audienceName })}
        onClick={toggle}
        className={`inline-flex size-7 items-center justify-center rounded text-base leading-none text-paper-muted transition-colors hover:bg-ink-surface hover:text-paper disabled:opacity-50 [@media(pointer:coarse)]:size-11`}
      >
        <span aria-hidden>⋯</span>
      </button>

      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={t("actionsMenuLabel")}
          className="absolute right-0 top-full z-20 mt-1 min-w-48 rounded-lg border border-ink-border bg-ink-surface p-1"
        >
          <p className="px-2.5 pb-1 pt-1.5 font-data text-[0.65rem] uppercase tracking-wide text-paper-muted/80">
            {t("audienceLabel")}
          </p>
          {AUDIENCES.map((audience) => (
            <button
              key={audience}
              type="button"
              role="menuitemradio"
              aria-checked={favorite.audience === audience}
              onClick={() => {
                close(true);
                onAudienceChange(favorite, audience);
              }}
              className={`flex w-full items-center gap-2 rounded px-2.5 py-2 text-left font-data text-xs transition-colors hover:bg-ink focus-visible:bg-ink ${touch} ${
                favorite.audience === audience ? "text-amber" : "text-paper"
              }`}
            >
              <AudienceIcon audience={audience} />
              {t(`audience.${audience}`)}
              {favorite.audience === audience ? <span aria-hidden className="ml-auto">✓</span> : null}
            </button>
          ))}
          <div className="my-1 border-t border-ink-border" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              close(false);
              onRemove(favorite);
            }}
            className={`flex w-full items-center rounded px-2.5 py-2 text-left font-data text-xs text-danger transition-colors hover:bg-ink focus-visible:bg-ink ${touch}`}
          >
            {t("removeFavorite")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
