"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { ShareSheet, type SharePayload } from "./ShareSheet";

// Botón Compartir de las cabeceras (spec share-sheet). Visible con y sin sesión; abre la hoja del objeto.
export function ShareButton({ payload, className = "" }: { payload: SharePayload; className?: string }) {
  const t = useTranslations("share");
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className={`inline-flex items-center gap-2 rounded border border-ink-border px-3 py-1.5 font-display text-sm text-paper-muted transition-colors hover:border-amber hover:text-paper ${className}`}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12M7.5 7.5 12 3l4.5 4.5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
        </svg>
        {t("button")}
      </button>
      <ShareSheet open={open} onClose={close} payload={payload} />
    </>
  );
}
