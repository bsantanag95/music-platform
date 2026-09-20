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
import { EditorHostContext, type EditorHostContextValue } from "./editor-host";

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
      >
        <EditorHostContext.Provider value={host}>{panel?.editor}</EditorHostContext.Provider>
      </EditorPanel>
    </OwnerEditContext.Provider>
  );
}
