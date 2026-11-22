"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "@/i18n/navigation";
import { EditorPanel } from "./EditorPanel";
import { EditorHostContext, type EditorHostContextValue, type HostedSave } from "./editor-host";

interface PanelRequest {
  /** Nombre del bloque: título accesible del panel. */
  title: string;
  /** Editor ya construido por el servidor con su `initial`. */
  editor: ReactNode;
  /** Lápiz que abrió el panel, para devolverle el foco al cerrar. */
  trigger: HTMLElement | null;
}

interface OwnerEditContextValue {
  editing: boolean;
  setEditing: (editing: boolean) => void;
  openEditor: (request: PanelRequest) => void;
}

const OwnerEditContext = createContext<OwnerEditContextValue | null>(null);

/** Estado del modo edición; `null` fuera del proveedor (visitantes, previsualización). */
export function useOwnerEdit(): OwnerEditContextValue | null {
  return useContext(OwnerEditContext);
}

// Modo edición del perfil del dueño (spec profile-edit-mode). Guarda si el
// interruptor "Editar perfil" está activo —estado local, no persistente— y
// renderiza una sola vez el panel lateral que aloja el editor del bloque
// elegido. Solo se monta cuando el visitante es el dueño y no está en
// previsualización: en cualquier otro caso el perfil no carga nada de esto.
export function OwnerEditProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [panel, setPanel] = useState<PanelRequest | null>(null);
  const [dirtyEditors, setDirtyEditors] = useState<ReadonlySet<string>>(() => new Set());
  const savedRef = useRef(false);
  // Guardados de los editores con borrador alojados en el panel (un solo «Guardar»
  // al pie; openspec redesign-owner-profile-phase3). El conteo decide si hay pie.
  const savesRef = useRef(new Map<string, HostedSave>());
  const [saveCount, setSaveCount] = useState(0);
  const [saving, setSaving] = useState(false);

  const host = useMemo<EditorHostContextValue>(
    () => ({
      setDirty: (editorId, dirty) =>
        setDirtyEditors((previous) => {
          if (previous.has(editorId) === dirty) return previous;
          const next = new Set(previous);
          if (dirty) next.add(editorId);
          else next.delete(editorId);
          return next;
        }),
      notifySaved: () => {
        savedRef.current = true;
      },
      registerSave: (editorId, entry) => {
        savesRef.current.set(editorId, entry);
        setSaveCount(savesRef.current.size);
        return () => {
          savesRef.current.delete(editorId);
          setSaveCount(savesRef.current.size);
        };
      },
    }),
    [],
  );

  const openEditor = useCallback((request: PanelRequest) => {
    savedRef.current = false;
    setDirtyEditors(new Set());
    setPanel(request);
  }, []);

  // Al cerrar tras haber guardado algo, el perfil de atrás se refresca para
  // reflejarlo sin recargar la aplicación (spec: "El perfil refleja lo guardado").
  const closeEditor = useCallback(() => {
    setPanel(null);
    setDirtyEditors(new Set());
    if (savedRef.current) {
      savedRef.current = false;
      router.refresh();
    }
  }, [router]);

  // «Guardar» del pie: guarda en orden cada editor con cambios. Si todos salen
  // bien cierra (y refresca, porque hubo guardado); si alguno falla, el panel
  // queda abierto y ese editor muestra su error donde siempre.
  const saveAll = useCallback(async () => {
    setSaving(true);
    let ok = true;
    for (const entry of Array.from(savesRef.current.values())) {
      if (!entry.dirty()) continue;
      if (!(await entry.save())) ok = false;
    }
    setSaving(false);
    if (ok) closeEditor();
  }, [closeEditor]);

  const value = useMemo<OwnerEditContextValue>(
    () => ({ editing, setEditing, openEditor }),
    [editing, openEditor],
  );

  return (
    <OwnerEditContext.Provider value={value}>
      {children}
      <EditorPanel
        open={panel !== null}
        title={panel?.title ?? ""}
        dirty={dirtyEditors.size > 0}
        returnFocusTo={panel?.trigger ?? null}
        onClose={closeEditor}
        onSave={saveCount > 0 ? saveAll : undefined}
        saving={saving}
      >
        <EditorHostContext.Provider value={host}>{panel?.editor}</EditorHostContext.Provider>
      </EditorPanel>
    </OwnerEditContext.Provider>
  );
}
