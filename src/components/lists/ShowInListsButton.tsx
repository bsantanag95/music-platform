"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { ListTarget } from "@/lib/api/schemas";
import { ListsContainingItemPanel } from "./ListsContainingItemPanel";

interface ShowInListsButtonProps {
  target: ListTarget;
  authenticated: boolean;
}

// Acción "Mostrar en listas" contextual en páginas de catálogo: alterna el
// panel de listas públicas que contienen este ítem. A diferencia de
// `AddToListButton`, no exige sesión — solo muestra información pública, así
// que un visitante anónimo también puede consultarla (openspec:
// show-item-in-lists).
export function ShowInListsButton({ target, authenticated }: ShowInListsButtonProps) {
  const t = useTranslations("lists");
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col items-start gap-2">
      <Button variant="secondary" onClick={() => setOpen((current) => !current)}>
        {t("showInLists")}
      </Button>
      {open && (
        <ListsContainingItemPanel target={target} canSave={authenticated} onClose={() => setOpen(false)} />
      )}
    </div>
  );
}
