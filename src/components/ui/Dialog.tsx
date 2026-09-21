"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface DialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

const FOCUSABLE = "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]";

// Diálogo modal con contenido propio (formularios de acciones sensibles). Misma
// mecánica que `ConfirmDialog` — portal, foco atrapado, Escape y bloqueo de
// scroll —, pero abre con el foco en el primer campo en vez del botón de
// cancelar y admite contenido libre. Clic en el fondo cierra.
export function Dialog({ open, title, onClose, children }: DialogProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || !open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE);
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
    const initial =
      dialogRef.current?.querySelector<HTMLElement>("input:not([type=checkbox]):not([disabled]), select, textarea") ??
      dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    initial?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [mounted, open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/70 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[90vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-lg border border-ink-border bg-ink-surface p-6"
      >
        <h2 id={titleId} className="font-display text-lg text-paper">
          {title}
        </h2>
        {children}
      </div>
    </div>,
    document.body,
  );
}
