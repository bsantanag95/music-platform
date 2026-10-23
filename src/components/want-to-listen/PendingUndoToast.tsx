"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

/** Tiempo que el aviso ofrece deshacer. */
export const UNDO_TOAST_MS = 6000;

interface PendingUndoToastProps {
  message: string;
  /** Sin `onUndo` el aviso solo informa (p. ej. un deshacer que falló). */
  onUndo?: () => void;
  onExpire: () => void;
  undoing?: boolean;
}

// Aviso tras quitar una entrada o marcarla como escuchada (openspec: redesign-want-to-listen-views, D3), calcado de
// `FavoriteUndoToast`. `role="status"`: se anuncia sin robar el foco. Expira solo; un aviso nuevo (otra `key`)
// reemplaza al anterior.
export function PendingUndoToast({ message, onUndo, onExpire, undoing = false }: PendingUndoToastProps) {
  const t = useTranslations("wantToListen");

  useEffect(() => {
    if (undoing) return;
    const id = window.setTimeout(onExpire, UNDO_TOAST_MS);
    return () => window.clearTimeout(id);
  }, [onExpire, undoing]);

  return (
    <div
      role="status"
      className="sticky bottom-4 z-10 mx-auto flex w-full max-w-sm items-center justify-between gap-3 rounded-lg border border-ink-border bg-ink-surface px-4 py-2.5"
    >
      <span className="min-w-0 font-data text-xs text-paper">{message}</span>
      {onUndo ? (
        <button
          type="button"
          disabled={undoing}
          onClick={onUndo}
          className="shrink-0 font-data text-xs text-amber underline decoration-dotted transition-colors hover:text-amber-hover disabled:opacity-50 [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:px-2"
        >
          {t("undo")}
        </button>
      ) : null}
    </div>
  );
}
