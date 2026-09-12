"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import type { ListTarget } from "@/lib/api/schemas";
import { AddToListPanel } from "./AddToListPanel";

interface AddToListButtonProps {
  target: ListTarget;
  authenticated: boolean;
}

// Acción "Agregar a lista" contextual en páginas de catálogo: alterna el
// panel de listas propias compatibles (`AddToListPanel`), que también reusa
// el menú de una fila del diario (openspec: redesign-diary-row).
export function AddToListButton({ target, authenticated }: AddToListButtonProps) {
  const t = useTranslations("lists");
  const [open, setOpen] = useState(false);

  if (!authenticated) {
    return (
      <Link
        href="/auth/login"
        className="inline-flex items-center justify-center gap-2 rounded border border-ink-border bg-ink-surface px-4 py-2 font-display text-sm text-paper transition-colors hover:border-amber"
      >
        {t("addItem")}
      </Link>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button variant="secondary" onClick={() => setOpen((current) => !current)}>
        {t("addItem")}
      </Button>
      {open && <AddToListPanel target={target} onClose={() => setOpen(false)} />}
    </div>
  );
}
