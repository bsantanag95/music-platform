"use client";

import type { KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { QuickActionIcon } from "./ActionIcons";
import { QUICK_ACTIONS, type QuickAction } from "./types";

const CREATE_ACTIONS: readonly QuickAction[] = ["newList", "newCamino"];
const TARGET_ACTIONS = QUICK_ACTIONS.filter((action) => !CREATE_ACTIONS.includes(action));

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

  const chip = (action: QuickAction) => {
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
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-data text-xs transition-colors duration-150 ${
          checked
            ? "border-amber/60 bg-amber/10 text-amber"
            : "border-ink-border text-paper-muted hover:border-paper-muted/50 hover:text-paper"
        }`}
      >
        <QuickActionIcon action={action} />
        {t(`actions.${action}`)}
      </button>
    );
  };

  // Dos grupos: lo que se hace sobre un disco, canción o artista (usa el buscador) y lo que
  // se crea desde cero. Antes los nueve chips iban mezclados en una sola tanda. Sigue siendo
  // un único radiogroup: las flechas recorren las nueve acciones en orden.
  return (
    <div role="radiogroup" aria-label={t("actionsLabel")} onKeyDown={onKeyDown} className="flex flex-col gap-2.5">
      <div className="flex flex-wrap gap-1.5">{TARGET_ACTIONS.map(chip)}</div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 font-data text-[11px] uppercase tracking-wider text-paper-muted">{t("createLabel")}</span>
        {CREATE_ACTIONS.map(chip)}
      </div>
    </div>
  );
}
