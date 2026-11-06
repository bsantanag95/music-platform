"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { ShareSheet, type SharePayload } from "./ShareSheet";

const FULL_STYLE =
  "inline-flex items-center gap-2 rounded border border-ink-border px-3 py-1.5 font-display text-sm text-paper-muted transition-colors hover:border-amber hover:text-paper";
const COMPACT_STYLE = "inline-flex items-center gap-1.5 font-data text-xs text-paper-muted transition-colors hover:text-paper";

// Botón Compartir de las cabeceras y, en su versión compacta, de una fila (spec share-sheet). Visible con y sin
// sesión; abre la hoja del objeto.
export function ShareButton({ payload, className = "", compact = false }: { payload: SharePayload; className?: string; compact?: boolean }) {
  const t = useTranslations("share");
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className={`${compact ? COMPACT_STYLE : FULL_STYLE} ${className}`}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className={compact ? "size-3.5" : "size-4"} fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12M7.5 7.5 12 3l4.5 4.5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
        </svg>
        {t("button")}
      </button>
      <ShareSheet open={open} onClose={close} payload={payload} />
    </>
  );
}
