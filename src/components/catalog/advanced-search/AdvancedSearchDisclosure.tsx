"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

// Formulario recogido de la búsqueda avanzada (openspec: refine-advanced-search-phase1, design D2). Con una búsqueda en
// curso empieza recogido tras la barra de criterios, para que los resultados queden arriba; el formulario sigue en el
// DOM (`hidden`) y conserva lo escrito. "Editar búsqueda" y las sugerencias de la búsqueda amplia, que viven dentro de
// los resultados del servidor, lo abren con un evento de ventana que puede traer el campo a enfocar.

const EDIT_EVENT = "advanced-search:edit";

/** Abre el formulario de la búsqueda avanzada; con `field`, enfoca ese campo (`name` del formulario). */
export function openAdvancedSearchForm(field?: string) {
  window.dispatchEvent(new CustomEvent(EDIT_EVENT, { detail: { field } }));
}

export function AdvancedSearchDisclosure({
  searching,
  bar,
  children,
}: {
  searching: boolean;
  /** Pastillas de los criterios activos (del servidor). */
  bar: ReactNode;
  children: ReactNode;
}) {
  const t = useTranslations("catalog.search.advanced");
  const formId = useId();
  const [open, setOpen] = useState(!searching);
  // Pedido de foco pendiente: se cumple cuando el formulario ya está visible.
  const [focus, setFocus] = useState<{ field: string } | null>(null);

  useEffect(() => {
    const onEdit = (event: Event) => {
      setOpen(true);
      setFocus({ field: (event as CustomEvent<{ field?: string }>).detail?.field ?? "" });
    };
    window.addEventListener(EDIT_EVENT, onEdit);
    return () => window.removeEventListener(EDIT_EVENT, onEdit);
  }, []);

  useEffect(() => {
    if (!open || !focus) return;
    const root = document.getElementById(formId);
    const target = focus.field
      ? (root?.querySelector<HTMLElement>(`[name="${focus.field}"]:not([type="hidden"])`) ??
        root?.querySelector<HTMLElement>(`[id$="-${focus.field}"]`))
      : root?.querySelector<HTMLElement>('input:not([type="hidden"]), select');
    target?.focus();
    target?.scrollIntoView({ block: "center" });
    setFocus(null);
  }, [open, focus, formId]);

  return (
    <div className="flex w-full flex-col gap-4">
      {searching ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-ink-border bg-ink-surface/70 px-3 py-2.5">
          {bar}
          <button
            type="button"
            aria-expanded={open}
            aria-controls={formId}
            onClick={() => (open ? setOpen(false) : openAdvancedSearchForm())}
            className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded px-2 py-1 font-display text-sm text-paper-muted transition-colors hover:text-amber"
          >
            <span aria-hidden>{open ? "×" : "✎"}</span>
            {open ? t("hideForm") : t("editSearch")}
          </button>
        </div>
      ) : null}
      <div id={formId} hidden={!open}>
        {children}
      </div>
    </div>
  );
}

/** Botón que abre el formulario en un campo (sugerencias de la búsqueda amplia). */
export function EditFieldButton({ field, children }: { field: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => openAdvancedSearchForm(field)}
      className="inline-flex items-center gap-1 rounded-full border border-ink-border px-2.5 py-1 font-data text-xs text-paper transition-colors hover:border-amber/60 hover:text-amber"
    >
      <span aria-hidden>+</span>
      {children}
    </button>
  );
}
