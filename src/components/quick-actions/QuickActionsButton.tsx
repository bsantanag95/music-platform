"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { QuickActionsDialog } from "./QuickActionsDialog";

// Disparador del acceso global "+ Añadir" en la zona de usuario del Header, junto al menú
// (openspec: add-header-quick-actions, D10; antes `RegisterListenButton` en la barra general). Solo
// se monta con sesión — lo decide el Header. Es una acción, no un enlace: botón ámbar con "+".
export function QuickActionsButton() {
  const t = useTranslations("quickActions");
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
        {t("trigger")}
      </button>
      {open ? <QuickActionsDialog onClose={close} /> : null}
    </>
  );
}
