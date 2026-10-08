"use client";

import { AddToListPanel } from "@/components/lists/AddToListPanel";
import { useNotifyQuickActionChange } from "../quick-actions-changes";
import type { PickTarget } from "../types";

interface AddToListStepProps {
  target: PickTarget;
  onReset: () => void;
}

// Acción A lista del diálogo de acciones rápidas (openspec: add-header-quick-actions, D7): el
// panel de listas propias compatibles con el tipo del objetivo, tal cual lo usan las páginas de
// catálogo. Ya agrega a una lista existente y permite crear una nueva.
export function AddToListStep({ target, onReset }: AddToListStepProps) {
  const notifyChanged = useNotifyQuickActionChange();
  return (
    <div className="flex flex-col gap-3">
      <p className="truncate font-display text-sm text-paper">{target.title}</p>
      <AddToListPanel target={{ type: target.type, id: target.id }} onClose={onReset} onAdded={notifyChanged} />
    </div>
  );
}
