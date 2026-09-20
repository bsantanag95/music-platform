"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useOwnerEdit } from "./OwnerEditProvider";

interface EditableBlockProps {
  /** Nombre del bloque ("Tarjeta de Identidad"): nombre accesible del lápiz y título del panel. */
  label: string;
  /** Editor del bloque, construido por el servidor con su `initial`. */
  editor: ReactNode;
  /** La vista del bloque, renderizada por el servidor. */
  children: ReactNode;
  /**
   * El bloque no dibuja nada cuando no hay contenido (así se ve para un
   * visitante). Sin modo edición se conserva ese colapso; con él se muestra un
   * marco vacío para que el dueño tenga dónde pulsar el lápiz y agregar el
   * primer elemento.
   */
  empty?: boolean;
  className?: string;
}

// Envuelve un bloque visible del perfil del dueño. Con el modo edición activo
// lo enmarca y muestra un lápiz que abre su editor en el panel lateral. Sin
// proveedor (visitante, previsualización) solo devuelve el bloque, sin ningún
// control (spec profile-edit-mode, "Controles de edición por bloque").
export function EditableBlock({ label, editor, children, empty = false, className }: EditableBlockProps) {
  const t = useTranslations("users");
  const ownerEdit = useOwnerEdit();
  if (!ownerEdit) return <>{children}</>;

  const { editing, openEditor } = ownerEdit;
  if (empty && !editing) return null;

  return (
    <div
      className={`relative rounded-lg transition-[outline-color] ${
        editing ? "outline-1 outline-dashed outline-offset-8 outline-amber/50" : ""
      } ${className ?? ""}`}
    >
      {empty ? (
        <p className="w-full max-w-2xl rounded-lg border border-dashed border-ink-border px-4 py-6 font-body text-sm text-paper-muted">
          {t("editMode.emptyBlock", { block: label })}
        </p>
      ) : (
        children
      )}
      {editing && (
        <button
          type="button"
          aria-label={t("editMode.editBlock", { block: label })}
          onClick={(event) => openEditor({ title: label, editor, trigger: event.currentTarget })}
          className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded bg-amber px-2.5 py-1 font-display text-xs text-ink transition-colors hover:bg-amber-hover"
        >
          <span aria-hidden="true">✎</span>
          {t("editMode.edit")}
        </button>
      )}
    </div>
  );
}
