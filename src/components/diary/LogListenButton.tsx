"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { QuickActionsDialog } from "@/components/quick-actions/QuickActionsDialog";

// «Anotar escucha» del diario propio (openspec: redesign-diary-page, D5): abre
// el mismo registro global que «+ Añadir» del Header, que ya arranca en Escucha
// y, al guardar, invalida la serie `["diary"]` — la escucha nueva aparece sola.
export function LogListenButton({ variant = "secondary" }: { variant?: "primary" | "secondary" }) {
  const t = useTranslations("diary");
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  return (
    <>
      <Button ref={triggerRef} variant={variant} onClick={() => setOpen(true)}>
        {t("logListen")}
      </Button>
      {open ? <QuickActionsDialog onClose={close} /> : null}
    </>
  );
}
