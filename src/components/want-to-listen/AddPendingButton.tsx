"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { QuickActionsDialog } from "@/components/quick-actions/QuickActionsDialog";

// «Anotar algo» de Pendientes (openspec: redesign-want-to-listen-toolbar, D8): abre el mismo diálogo
// global que «+ Añadir» del Header, ya en la acción Pendiente. Al guardar, el diálogo emite
// `OWN_DATA_CHANGED_EVENT` y `WantToListenList` vuelve a pedir su primera página.
export function AddPendingButton() {
  const t = useTranslations("wantToListen");
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  return (
    <>
      <Button ref={triggerRef} variant="secondary" onClick={() => setOpen(true)}>
        {t("addPending")}
      </Button>
      {open ? <QuickActionsDialog onClose={close} initialAction="pending" /> : null}
    </>
  );
}
