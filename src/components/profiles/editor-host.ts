import { createContext, useCallback, useContext, useEffect, useId, useRef } from "react";

// Contrato opcional entre un editor del dueño y el anfitrión que lo monta (el
// panel lateral de edición o una pantalla de ajustes). Sin anfitrión ni props
// el editor se comporta como siempre. Ver spec profile-edit-mode ("Panel
// lateral de edición", "Cambios sin guardar en el panel").
export interface EditorHostCallbacks {
  /** Se llama tras cada guardado exitoso (por botón o aplicación inmediata). */
  onSaved?: () => void;
  /** Informa si hay cambios sin guardar respecto a lo último persistido. */
  onDirtyChange?: (dirty: boolean) => void;
}

/**
 * Anfitrión por contexto. El panel lateral aloja editores que llegan como
 * elementos ya construidos por el servidor, a los que no se les pueden inyectar
 * props de forma fiable; además un panel puede alojar varios editores a la vez
 * (la Placa: identidad + enlaces), así que el estado "sucio" se identifica por
 * editor y el anfitrión lo agrega.
 */
export interface EditorHostContextValue {
  setDirty: (editorId: string, dirty: boolean) => void;
  notifySaved: () => void;
}

export const EditorHostContext = createContext<EditorHostContextValue | null>(null);

/**
 * Reporta `dirty` a las props y al anfitrión de contexto cada vez que cambia.
 * Guarda los callbacks en refs para que un anfitrión que los recrea en cada
 * render no dispare el efecto de nuevo; al desmontarse informa `false` para no
 * dejar el panel "sucio".
 */
export function useReportDirty(dirty: boolean, onDirtyChange?: (dirty: boolean) => void) {
  const host = useContext(EditorHostContext);
  const editorId = useId();
  const callback = useRef(onDirtyChange);
  const hostRef = useRef(host);
  useEffect(() => {
    callback.current = onDirtyChange;
    hostRef.current = host;
  });

  useEffect(() => {
    callback.current?.(dirty);
    hostRef.current?.setDirty(editorId, dirty);
  }, [dirty, editorId]);

  useEffect(
    () => () => {
      callback.current?.(false);
      hostRef.current?.setDirty(editorId, false);
    },
    [editorId],
  );
}

/** Devuelve la función a llamar tras cada guardado exitoso: avisa a la prop y al anfitrión. */
export function useNotifySaved(onSaved?: () => void): () => void {
  const host = useContext(EditorHostContext);
  const propRef = useRef(onSaved);
  const hostRef = useRef(host);
  useEffect(() => {
    propRef.current = onSaved;
    hostRef.current = host;
  });
  return useCallback(() => {
    propRef.current?.();
    hostRef.current?.notifySaved();
  }, []);
}
