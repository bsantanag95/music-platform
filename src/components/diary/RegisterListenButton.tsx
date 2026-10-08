"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { RegisterListenDialog } from "./RegisterListenDialog";

// Disparador del acceso global "+ Registrar" en la barra general del Header
// (cambio add-global-listen-logging). Solo se monta con sesión — lo decide el
// Header. Es una acción, no un enlace: estilo botón sutil con "+".
export function RegisterListenButton() {
  const t = useTranslations("diary");
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-amber/40 bg-amber/10 px-2.5 py-1 font-data text-sm text-amber transition-colors hover:border-amber hover:bg-amber/15"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          aria-hidden="true"
          className="size-3.5"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        {t("global.trigger")}
      </button>
      {open ? <RegisterListenDialog onClose={close} /> : null}
    </>
  );
}
