"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { EditorHostContext } from "@/components/profiles/editor-host";
import { useUnsavedChanges } from "./UnsavedChangesGuard";

interface SettingsEditorCardProps {
  /** Ancla de la sección (`#settings-<id>`) y clave en el guardián de cambios. */
  id: string;
  /** Nombre de la sección en el índice y en el aviso al salir. */
  label: string;
  children: ReactNode;
}

// Tarjeta de una sección de la pantalla Perfil que hace de anfitriona de sus editores (openspec:
// refine-settings-editing, D1): escucha su estado por `EditorHostContext` (el mismo contrato que el panel lateral del
// modo edición), dice "Cambios sin guardar" mientras haya alguno y se lo informa al guardián del área.
export function SettingsEditorCard({ id, label, children }: SettingsEditorCardProps) {
  const t = useTranslations("users");
  const guard = useUnsavedChanges();
  const [dirtyEditors, setDirtyEditors] = useState<ReadonlySet<string>>(() => new Set());
  const dirty = dirtyEditors.size > 0;

  const setDirty = useCallback((editorId: string, isDirty: boolean) => {
    setDirtyEditors((current) => {
      if (current.has(editorId) === isDirty) return current;
      const next = new Set(current);
      if (isDirty) next.add(editorId);
      else next.delete(editorId);
      return next;
    });
  }, []);
  const host = useMemo(() => ({ setDirty, notifySaved: () => undefined }), [setDirty]);

  const setGuardDirty = guard?.setDirty;
  useEffect(() => {
    setGuardDirty?.(id, label, dirty);
  }, [setGuardDirty, id, label, dirty]);
  useEffect(() => () => setGuardDirty?.(id, label, false), [setGuardDirty, id, label]);

  return (
    <EditorHostContext.Provider value={host}>
      <div
        id={`settings-${id}`}
        aria-label={label}
        role="region"
        className={`relative scroll-mt-36 rounded-lg border bg-ink-surface p-5 transition-colors ${
          dirty ? "border-amber/60" : "border-ink-border"
        }`}
      >
        {dirty ? (
          <span
            role="status"
            className="absolute right-4 top-3 font-data text-[11px] text-amber"
          >
            <span aria-hidden="true">● </span>
            {t("settings.unsaved.badge")}
          </span>
        ) : null}
        {children}
      </div>
    </EditorHostContext.Provider>
  );
}
