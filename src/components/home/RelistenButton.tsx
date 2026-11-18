"use client";

import { useCallback, useRef, useState } from "react";
import { QuickActionsDialog } from "@/components/quick-actions/QuickActionsDialog";
import type { PickTarget } from "@/components/quick-actions/types";

// «Lo volví a escuchar» de la tarjeta «Última vez» (openspec: redesign-signed-in-home-phase1): abre
// el diálogo de acciones rápidas en Escucha con el objetivo ya elegido y una confirmación — abrirlo
// no registra nada; registra «Registrar escucha». Al cerrar, el foco vuelve al botón.
export function RelistenButton({ target, label }: { target: PickTarget; label: string }) {
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
        className="inline-flex min-h-11 items-center justify-center rounded-md border border-ink-border px-4 font-display text-sm font-medium text-paper transition-colors hover:border-amber hover:text-amber"
      >
        {label}
      </button>
      {open ? <QuickActionsDialog onClose={close} initialTarget={target} confirmListen /> : null}
    </>
  );
}
