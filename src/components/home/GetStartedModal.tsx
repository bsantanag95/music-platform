"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";

// CTA principal del hero anónimo: un único botón "Comenzá" que abre un modal
// simple con las dos rutas de entrada (crear cuenta / iniciar sesión), en vez
// de dejar los dos botones sueltos en el hero.
export function GetStartedModal() {
  const t = useTranslations("home");
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    const trigger = triggerRef.current;
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [open, close]);

  return (
    <>
      <Button ref={triggerRef} variant="primary" onClick={() => setOpen(true)}>
        {t("heroCta")}
      </Button>

      {mounted && open
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4"
              onClick={(e) => {
                if (e.target === e.currentTarget) close();
              }}
            >
              <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="flex w-full max-w-sm flex-col gap-5 rounded-lg border border-ink-border bg-ink-surface p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <h2 id={titleId} className="font-display text-lg text-paper">
                    {t("getStartedTitle")}
                  </h2>
                  <button
                    ref={closeRef}
                    type="button"
                    onClick={close}
                    aria-label={t("getStartedClose")}
                    className="shrink-0 font-data text-sm text-paper-muted transition-colors hover:text-paper"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  <Link href="/auth/register" className="w-full">
                    <Button variant="primary" className="w-full">
                      {t("getStartedCreate")}
                    </Button>
                  </Link>
                  <Link href="/auth/login" className="w-full">
                    <Button variant="secondary" className="w-full">
                      {t("getStartedLogin")}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
