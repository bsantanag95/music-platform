"use client";

import type { KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { QUICK_ACTIONS, type QuickAction } from "./types";

interface ActionChipsProps {
  value: QuickAction;
  onChange: (action: QuickAction) => void;
}

// Fila de acciones del diálogo de acciones rápidas (openspec: add-header-quick-actions, D1).
// Radio group con flechas, mismo patrón que `SearchTypeToggle`.
export function ActionChips({ value, onChange }: ActionChipsProps) {
  const t = useTranslations("quickActions");

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(event.key)) return;
    event.preventDefault();
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
    const next = QUICK_ACTIONS[(QUICK_ACTIONS.indexOf(value) + step + QUICK_ACTIONS.length) % QUICK_ACTIONS.length]!;
    onChange(next);
    event.currentTarget.querySelector<HTMLButtonElement>(`[data-action="${next}"]`)?.focus();
  };

  return (
    <div role="radiogroup" aria-label={t("actionsLabel")} onKeyDown={onKeyDown} className="flex flex-wrap gap-1.5">
      {QUICK_ACTIONS.map((action) => {
        const checked = action === value;
        return (
          <button
            key={action}
            type="button"
            role="radio"
            data-action={action}
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(action)}
            className={`rounded-full border px-3 py-1 font-data text-xs transition-colors ${
              checked ? "border-amber text-paper" : "border-ink-border text-paper-muted hover:text-paper"
            }`}
          >
            {t(`actions.${action}`)}
          </button>
        );
      })}
    </div>
  );
}
