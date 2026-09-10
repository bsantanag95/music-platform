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
        className="inline-flex items-center gap-1 rounded border border-ink-border px-2 py-1 font-data text-sm text-paper-muted transition-colors hover:border-amber hover:text-paper"
      >
        <span aria-hidden>+</span>
        {t("global.trigger")}
      </button>
      {open ? <RegisterListenDialog onClose={close} /> : null}
    </>
  );
}
