"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { QuickActionsDialog } from "@/components/quick-actions/QuickActionsDialog";
import { OWN_DATA_CHANGED_EVENT } from "@/components/quick-actions/quick-actions-changes";
import type { QuickAction } from "@/components/quick-actions/types";

export type OwnerAddKind = "listen" | "favorite" | "newList" | "collection";

// Acción para agregar en un estante del propio perfil (openspec: redesign-owner-profile-phase2;
// spec social-profiles, "Marcas de audiencia y acciones para agregar del dueño"): abre el mismo
// diálogo «Añadir» del sitio en la acción del estante. El perfil se compone en el servidor, así
// que si algo cambió mientras el diálogo estuvo abierto, al cerrarlo se refresca la página; el
// foco vuelve al botón.
export function OwnerAddAction({ kind }: { kind: OwnerAddKind }) {
  const t = useTranslations("users");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const changedRef = useRef(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onChange = () => {
      changedRef.current = true;
    };
    window.addEventListener(OWN_DATA_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(OWN_DATA_CHANGED_EVENT, onChange);
  }, [open]);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
    if (changedRef.current) {
      changedRef.current = false;
      router.refresh();
    }
  }, [router]);

  const initialAction: QuickAction = kind;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={t(`ownerAdd.${kind}Aria`)}
        onClick={() => setOpen(true)}
        className="shrink-0 font-data text-xs text-amber transition-colors hover:text-amber-hover"
      >
        <span aria-hidden="true">+ </span>
        {t(`ownerAdd.${kind}`)}
      </button>
      {open ? <QuickActionsDialog onClose={close} initialAction={initialAction} /> : null}
    </>
  );
}
