"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { WantToListenEntry } from "@/lib/api/schemas";
import type { WantToListenRowActions } from "./want-to-listen-items-view";

interface EntryActionsProps {
  entry: WantToListenEntry;
  actions: WantToListenRowActions;
  /** Clases extra del botón `⋯` (el Gráfico lo pone sobre la carátula). */
  triggerClassName?: string;
}

const TOUCH = "[@media(pointer:coarse)]:min-h-11";
const ITEM = `flex w-full items-center rounded px-2.5 py-2 text-left font-data text-xs transition-colors hover:bg-ink focus-visible:bg-ink ${TOUCH}`;

// Botón `⋯` y menú de una entrada de Pendientes (openspec: redesign-want-to-listen-views, D4), calcado de
// `FavoriteActions`: Ya lo escuché, discografía (solo artistas, cuando ya se conoce su estado), Añadir a una lista y
// Quitar de Pendientes. Se cierra con Escape, con un clic fuera o al elegir, y devuelve el foco al disparador; las
// flechas mueven entre opciones.
export function EntryActions({ entry, actions, triggerClassName = "" }: EntryActionsProps) {
  const t = useTranslations("wantToListen");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  // El menú se abre hacia la izquierda del `⋯`; si así se sale de la pantalla (columna izquierda del Gráfico en
  // móvil), se abre hacia la derecha.
  const [alignLeft, setAlignLeft] = useState(false);

  useLayoutEffect(() => {
    if (!open) {
      setAlignLeft(false);
      return;
    }
    const rect = menuRef.current?.getBoundingClientRect();
    if (rect && rect.left < 8) setAlignLeft(true);
  }, [open]);

  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const items = () => [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
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

  const choose = (run: () => void, refocus = true) => {
    close(refocus);
    run();
  };

  const journey = entry.targetType === "artist" ? actions.journeyStatus(entry.target.id) : null;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        disabled={actions.busy}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={t("actionsFor", { title: entry.target.title })}
        onClick={() => setOpen((current) => !current)}
        className={`inline-flex size-7 items-center justify-center rounded text-base leading-none text-paper-muted transition-colors hover:bg-ink-surface hover:text-paper disabled:opacity-50 [@media(pointer:coarse)]:size-11 ${triggerClassName}`}
      >
        <span aria-hidden>⋯</span>
      </button>

      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={t("actionsMenuLabel")}
          className={`absolute top-full z-20 mt-1 min-w-52 rounded-lg border border-ink-border bg-ink-surface p-1 ${alignLeft ? "left-0" : "right-0"}`}
        >
          <button type="button" role="menuitem" onClick={() => choose(() => actions.listened(entry.id), false)} className={`${ITEM} text-paper`}>
            {t("listened")}
          </button>
          {journey === "none" ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => choose(() => actions.activateJourney(entry.target.id))}
              className={`${ITEM} text-paper`}
            >
              {t("journeyAdd")}
            </button>
          ) : null}
          {journey === "added" ? (
            <Link
              href={`/me/artist-journeys/${entry.target.id}`}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={`${ITEM} text-paper`}
            >
              {t("journeyView")}
            </Link>
          ) : null}
          <button type="button" role="menuitem" onClick={() => choose(() => actions.openList(entry.id))} className={`${ITEM} text-paper`}>
            {t("addToList")}
          </button>
          <div className="my-1 border-t border-ink-border" />
          <button
            type="button"
            role="menuitem"
            onClick={() => choose(() => actions.remove(entry.id), false)}
            className={`${ITEM} text-danger`}
          >
            {t("removeFromPending")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
