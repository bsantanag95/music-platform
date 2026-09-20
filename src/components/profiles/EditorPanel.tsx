"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface EditorPanelProps {
  open: boolean;
  /** Nombre accesible del diálogo y encabezado visible. */
  title: string;
  /** Hay cambios sin guardar en el editor alojado: cerrar pide confirmar el descarte. */
  dirty: boolean;
  /** Elemento al que devolver el foco al cerrarse (el lápiz que abrió el panel). */
  returnFocusTo?: HTMLElement | null;
  onClose: () => void;
  children: ReactNode;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Panel lateral de edición: aloja el editor de un bloque del perfil sin sacar
// al dueño de la página (spec profile-edit-mode, "Panel lateral de edición").
// Diálogo modal — portal, foco atrapado y devuelto, Escape, clic en el fondo y
// bloqueo de scroll, mismo nivel que `ConfirmDialog` — que en escritorio entra
// por la derecha y bajo `md` se presenta como hoja inferior. No añade su propio
// "Guardar": el editor alojado ya tiene el suyo o aplica al instante.
export function EditorPanel({ open, title, dirty, returnFocusTo, onClose, children }: EditorPanelProps) {
  const t = useTranslations("users");
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => setMounted(true), []);

  // Refs para que el listener de teclado (registrado una vez por apertura) vea
  // siempre el estado vigente sin re-suscribirse en cada render.
  const confirmingRef = useRef(confirming);
  useEffect(() => {
    confirmingRef.current = confirming;
  });

  // El descarte pendiente no sobrevive a un cierre del panel.
  useEffect(() => {
    if (!open) setConfirming(false);
  }, [open]);

  function requestClose() {
    if (dirty) {
      setConfirming(true);
      return;
    }
    onClose();
  }
  const requestCloseRef = useRef(requestClose);
  useEffect(() => {
    requestCloseRef.current = requestClose;
  });

  useEffect(() => {
    if (!mounted || !open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      // Con el diálogo de descarte abierto, Escape y Tab son suyos.
      if (confirmingRef.current) return;
      if (event.key === "Escape") {
        event.preventDefault();
        requestCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusables = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === dialogRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      returnFocusTo?.focus();
    };
  }, [mounted, open, returnFocusTo]);

  if (!mounted || !open) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-40 bg-ink/70"
        aria-hidden="true"
        data-testid="editor-panel-backdrop"
        onClick={requestClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="fixed inset-x-0 bottom-0 z-40 flex max-h-[85vh] flex-col rounded-t-xl border border-ink-border bg-ink-surface shadow-2xl outline-none md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-[28rem] md:rounded-none md:rounded-l-xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-ink-border px-5 py-4">
          <h2 id={titleId} className="font-display text-lg text-paper">
            {title}
          </h2>
          <button
            type="button"
            onClick={requestClose}
            className="rounded border border-ink-border px-3 py-1.5 font-data text-xs text-paper-muted transition-colors hover:text-paper"
          >
            {t("editPanel.close")}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
      </div>
      <ConfirmDialog
        open={confirming}
        title={t("editPanel.discardTitle")}
        message={t("editPanel.discardMessage")}
        confirmLabel={t("editPanel.discardConfirm")}
        cancelLabel={t("editPanel.discardCancel")}
        danger
        onConfirm={() => {
          setConfirming(false);
          onClose();
        }}
        onCancel={() => setConfirming(false)}
      />
    </>,
    document.body,
  );
}
