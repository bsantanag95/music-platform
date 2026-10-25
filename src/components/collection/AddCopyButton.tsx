"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { QuickActionsDialog } from "@/components/quick-actions/QuickActionsDialog";

// «Añadir copia» de Tengo (openspec: redesign-collection-header-toolbar, D6): abre el mismo diálogo global que
// «+ Añadir» del Header, ya en la acción Colección. Al guardar, el diálogo emite `OWN_DATA_CHANGED_EVENT`, los
// proveedores invalidan las series `["collection"]` y la estantería vuelve a pedir su primera página.
export function AddCopyButton() {
  const t = useTranslations("collection");
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  return (
    <>
      <Button ref={triggerRef} variant="secondary" onClick={() => setOpen(true)}>
        {t("addCopy")}
      </Button>
      {open ? <QuickActionsDialog onClose={close} initialAction="collection" /> : null}
    </>
  );
}
