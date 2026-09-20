"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useOwnerEdit } from "@/components/profiles/OwnerEditProvider";

interface OpenEditorButtonProps {
  /** Nombre de lo que se edita: título del panel y parte del nombre accesible. */
  label: string;
  /** Texto visible del botón (por defecto "Editar"). */
  children?: ReactNode;
  /** Editor ya construido por el servidor con su `initial`. */
  editor: ReactNode;
}

// Botón de una fila de Curaduría que abre su editor en el panel lateral, el
// mismo que usa la edición sobre el perfil. Requiere un `OwnerEditProvider`
// ancestro (que aporta el panel y refresca la pantalla al cerrar tras guardar).
export function OpenEditorButton({ label, children, editor }: OpenEditorButtonProps) {
  const t = useTranslations("users");
  const ownerEdit = useOwnerEdit();
  if (!ownerEdit) return null;

  return (
    <button
      type="button"
      aria-label={t("settings.curation.editRow", { name: label })}
      onClick={(event) => ownerEdit.openEditor({ title: label, editor, trigger: event.currentTarget })}
      className="rounded border border-ink-border px-3 py-1.5 font-display text-sm text-paper transition-colors hover:border-amber"
    >
      {children ?? t("settings.curation.edit")}
    </button>
  );
}
