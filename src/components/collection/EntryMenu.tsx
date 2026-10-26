"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AudienceIcon } from "@/components/favorites/FavoriteActions";
import type { DiaryAudience } from "@/lib/api/schemas";

const AUDIENCES: DiaryAudience[] = ["public", "followers", "private"];


interface EntryMenuProps {
  /** Título del álbum, para el nombre accesible del disparador. */
  title: string;
  audience: DiaryAudience;
  busy?: boolean;
  /**
   * Disparador con la audiencia además del `⋯` (Lista detallada). Pública y Seguidores son solo un ícono discreto (con el
   * nombre al pasar el cursor): repetida en cada fila, la insignia con texto no informaba nada. Privada conserva el
   * nombre y el ámbar, como el candado de la Estantería.
   */
  showBadge?: boolean;
  /** Disparador sobre una carátula: fondo oscuro semitransparente para leerse sobre cualquier imagen. */
  overlay?: boolean;
  onEdit: () => void;
  onAudienceChange: (audience: DiaryAudience) => void;
  onRemove: () => void;
}

// Menú `⋯` de una copia o una variante buscada (openspec: redesign-collection-views, D1): "Editar copia…", las tres
// audiencias (`menuitemradio`, la vigente marcada) y "Quitar". Lo comparten las tres vistas de Tengo y la pestaña
// Busco. Misma mecánica que `FavoriteActions`: Escape, clic fuera o elegir cierran y devuelven el foco al disparador;
// las flechas mueven entre opciones. Si a la derecha no hay lugar (la primera columna en un teléfono), se abre hacia
// el otro lado.
export function EntryMenu({
  title,
  audience,
  busy,
  showBadge = false,
  overlay = false,
  onEdit,
  onAudienceChange,
  onRemove,
}: EntryMenuProps) {
  const t = useTranslations("collection");
  const [open, setOpen] = useState(false);
  const [alignLeft, setAlignLeft] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const lastTrigger = useRef<HTMLElement | null>(null);
  const menuId = useId();
  const audienceName = t(`audience.${audience}`);

  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    if (refocus) lastTrigger.current?.focus();
  }, []);

  useLayoutEffect(() => {
    if (!open || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    if (rect.left < 0) setAlignLeft(true);
  }, [open]);

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
    setAlignLeft(false);
    setOpen((current) => !current);
  };

  const touch = "[@media(pointer:coarse)]:min-h-11";
  const item = `flex w-full items-center gap-2 rounded px-2.5 py-2 text-left font-data text-xs transition-colors hover:bg-ink focus-visible:bg-ink ${touch}`;

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
          title={audienceName}
          onClick={toggle}
          className={
            audience === "private"
              ? `inline-flex items-center gap-1.5 rounded-full border border-amber/40 px-2.5 py-1 font-data text-[0.7rem] text-amber transition-colors hover:text-amber-hover disabled:opacity-50 ${touch}`
              : `inline-flex size-8 items-center justify-center rounded-md text-paper-muted/70 transition-colors hover:bg-ink-surface hover:text-paper disabled:opacity-50 [@media(pointer:coarse)]:size-11`
          }
        >
          <AudienceIcon audience={audience} />
          {/* En pantallas angostas, solo el ícono: el nombre sigue en la etiqueta accesible. */}
          {audience === "private" ? <span className="max-sm:sr-only">{audienceName}</span> : null}
        </button>
      ) : null}
      <button
        type="button"
        disabled={busy}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={t("actionsFor", { title })}
        onClick={toggle}
        className={`inline-flex size-8 items-center justify-center rounded-md text-base leading-none transition-colors disabled:opacity-50 [@media(pointer:coarse)]:size-11 ${
          overlay
            ? "bg-ink/80 text-paper hover:bg-ink"
            : "text-paper-muted hover:bg-ink-surface hover:text-paper"
        }`}
      >
        <span aria-hidden>⋯</span>
      </button>

      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={t("actionsMenuLabel")}
          className={`absolute top-full z-20 mt-1 min-w-52 rounded-lg border border-ink-border bg-ink-surface p-1 shadow-lg shadow-black/40 ${
            alignLeft ? "left-0" : "right-0"
          }`}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              close(false);
              onEdit();
            }}
            className={`${item} text-paper`}
          >
            {t("editCopy")}
          </button>
          <div className="my-1 border-t border-ink-border" />
          <p className="px-2.5 pb-1 pt-1.5 font-data text-[0.65rem] uppercase tracking-wide text-paper-muted/80">
            {t("audienceLabel")}
          </p>
          {AUDIENCES.map((option) => (
            <button
              key={option}
              type="button"
              role="menuitemradio"
              aria-checked={audience === option}
              onClick={() => {
                close(true);
                if (option !== audience) onAudienceChange(option);
              }}
              className={`${item} ${audience === option ? "text-amber" : "text-paper"}`}
            >
              <AudienceIcon audience={option} />
              {t(`audience.${option}`)}
              {audience === option ? <span aria-hidden className="ml-auto">✓</span> : null}
            </button>
          ))}
          <div className="my-1 border-t border-ink-border" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              close(false);
              onRemove();
            }}
            className={`${item} text-danger`}
          >
            {t("remove")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
