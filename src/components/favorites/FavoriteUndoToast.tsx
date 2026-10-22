"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

/** Tiempo que el aviso de "Quitado de favoritos" ofrece deshacer. */
export const UNDO_TOAST_MS = 6000;

interface FavoriteUndoToastProps {
  onUndo: () => void;
  onExpire: () => void;
}

// Aviso con "Deshacer" tras quitar un favorito (openspec: redesign-favorites-views). `role="status"`: se anuncia
// sin robar el foco. Expira solo; usarlo o expirar lo limpia, así no se puede alternar dos veces el `POST`.
export function FavoriteUndoToast({ onUndo, onExpire }: FavoriteUndoToastProps) {
  const t = useTranslations("favorites");

  useEffect(() => {
    const id = window.setTimeout(onExpire, UNDO_TOAST_MS);
    return () => window.clearTimeout(id);
  }, [onExpire]);

  return (
    <div
      role="status"
      className="sticky bottom-4 z-10 mx-auto flex w-full max-w-sm items-center justify-between gap-3 rounded-lg border border-ink-border bg-ink-surface px-4 py-2.5"
    >
      <span className="font-data text-xs text-paper">{t("removedToast")}</span>
      <button
        type="button"
        onClick={onUndo}
        className="font-data text-xs text-amber underline decoration-dotted transition-colors hover:text-amber-hover [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:px-2"
      >
        {t("undo")}
      </button>
    </div>
  );
}
