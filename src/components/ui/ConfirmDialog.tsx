"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Estilo de énfasis del botón de confirmar (p. ej. acciones destructivas). */
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// Diálogo de confirmación propio, en vez del `window.confirm` nativo del
// navegador: portal, focus-trap, Escape y bloqueo de scroll — mismo nivel de
// accesibilidad que `RegisterListenDialog`/`GetStartedModal`.
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || !open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled])");
      if (focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    dialogRef.current?.querySelector<HTMLButtonElement>("[data-confirm-cancel]")?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [mounted, open, onCancel]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex w-full max-w-sm flex-col gap-4 rounded-lg border border-ink-border bg-ink-surface p-6"
      >
        <h2 id={titleId} className="font-display text-lg text-paper">
          {title}
        </h2>
        <p className="font-body text-sm text-paper-muted">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            data-confirm-cancel
            onClick={onCancel}
            className="rounded border border-ink-border px-3 py-2 font-data text-xs text-paper-muted transition-colors hover:text-paper"
          >
            {cancelLabel}
          </button>
          <Button variant="primary" className={danger ? "bg-danger text-paper hover:bg-danger/90" : undefined} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}