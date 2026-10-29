"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface UnsavedChangesValue {
  /** Etiquetas de las secciones con cambios sin guardar, por id. */
  dirty: ReadonlyMap<string, string>;
  setDirty: (id: string, label: string, dirty: boolean) => void;
}

const UnsavedChangesContext = createContext<UnsavedChangesValue | null>(null);

/** Estado del guardián; `null` fuera del área de ajustes. */
export function useUnsavedChanges(): UnsavedChangesValue | null {
  return useContext(UnsavedChangesContext);
}

// Enlace interno que sale de la página: mismo origen, sin `target`, sin teclas modificadoras y que no sea solo un ancla
// de esta misma página (el índice de Perfil).
function leavingHref(event: MouseEvent): string | null {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return null;
  }
  const anchor = (event.target as Element | null)?.closest?.("a[href]");
  if (!(anchor instanceof HTMLAnchorElement) || (anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download")) {
    return null;
  }
  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return null;
  if (url.pathname === window.location.pathname && url.search === window.location.search) return null;
  return `${url.pathname}${url.search}${url.hash}`;
}

// Guardián de cambios sin guardar del área de ajustes (openspec: refine-settings-editing, D3): las tarjetas de editor
// le informan si están sucias; con alguna, cerrar o recargar la pestaña pide la confirmación del navegador y un clic en
// un enlace interno abre un diálogo propio antes de navegar. El App Router no permite bloquear navegaciones, así que se
// intercepta el clic (en captura) en todo el documento: cubre el menú lateral, la cabecera y el pie.
export function UnsavedChangesGuard({ children }: { children: ReactNode }) {
  const t = useTranslations("users");
  const router = useRouter();
  const [dirty, setDirtyMap] = useState<ReadonlyMap<string, string>>(() => new Map());
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  const setDirty = useCallback((id: string, label: string, isDirty: boolean) => {
    setDirtyMap((current) => {
      if (isDirty === current.has(id) && (!isDirty || current.get(id) === label)) return current;
      const next = new Map(current);
      if (isDirty) next.set(id, label);
      else next.delete(id);
      return next;
    });
  }, []);

  useEffect(() => {
    if (dirty.size === 0) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const onClick = (event: MouseEvent) => {
      if (dirtyRef.current.size === 0) return;
      const href = leavingHref(event);
      if (!href) return;
      event.preventDefault();
      event.stopPropagation();
      setPendingHref(href);
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty.size]);

  const value = useMemo(() => ({ dirty, setDirty }), [dirty, setDirty]);
  const sections = [...dirty.values()].join(", ");

  return (
    <UnsavedChangesContext.Provider value={value}>
      {children}
      <ConfirmDialog
        open={pendingHref !== null}
        title={t("settings.unsaved.title")}
        message={t("settings.unsaved.message", { sections })}
        confirmLabel={t("settings.unsaved.leave")}
        cancelLabel={t("settings.unsaved.stay")}
        danger
        onConfirm={() => {
          const href = pendingHref;
          setPendingHref(null);
          setDirtyMap(new Map());
          if (href) router.push(href);
        }}
        onCancel={() => setPendingHref(null)}
      />
    </UnsavedChangesContext.Provider>
  );
}
