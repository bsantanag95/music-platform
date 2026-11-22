import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useRef } from "react";

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
  /**
   * El anfitrión tiene un único «Guardar» propio (panel lateral; openspec
   * redesign-owner-profile-phase3): cada editor con borrador registra su guardado
   * y deja de dibujar su botón. Devuelve la función que anula el registro.
   */
  registerSave?: (editorId: string, entry: HostedSave) => () => void;
}

/** Guardado de un editor alojado: el anfitrión solo lo llama si `dirty()` es verdadero. */
export interface HostedSave {
  dirty: () => boolean;
  /** `true` si guardó; `false` si falló o no se podía guardar (el editor ya muestra por qué). */
  save: () => Promise<boolean>;
}

export const EditorHostContext = createContext<EditorHostContextValue | null>(null);

/**
 * Reporta `dirty` a las props y al anfitrión de contexto cada vez que cambia.
 * Guarda los callbacks en refs para que un anfitrión que los recrea en cada
 * render no dispare el efecto de nuevo; al desmontarse informa `false` para no
 * dejar el panel "sucio".
 *
 * En fase de layout, no en `useEffect`: el aviso de "Guardado" y el fin de los
 * cambios pendientes salen del mismo render, y el anfitrión debe enterarse en ese
 * commit. Con un efecto pasivo quedaba una ventana en la que Escape pedía confirmar
 * el descarte de algo ya guardado. Las refs se actualizan antes, en el mismo orden.
 */
export function useReportDirty(dirty: boolean, onDirtyChange?: (dirty: boolean) => void) {
  const host = useContext(EditorHostContext);
  const editorId = useId();
  const callback = useRef(onDirtyChange);
  const hostRef = useRef(host);
  useLayoutEffect(() => {
    callback.current = onDirtyChange;
    hostRef.current = host;
  });

  useLayoutEffect(() => {
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

/**
 * Registra el guardado del editor en un anfitrión con «Guardar» propio. Devuelve
 * `true` si hay tal anfitrión: el editor entonces no dibuja su botón ni su aviso
 * de «Guardado». Sin anfitrión (pantallas de ajustes) devuelve `false` y no hace nada.
 */
export function useHostedSave(dirty: boolean, save: () => Promise<boolean>): boolean {
  const host = useContext(EditorHostContext);
  const editorId = useId();
  const latest = useRef({ dirty, save });
  useLayoutEffect(() => {
    latest.current = { dirty, save };
  });
  const register = host?.registerSave;
  useLayoutEffect(() => {
    if (!register) return;
    return register(editorId, {
      dirty: () => latest.current.dirty,
      save: () => latest.current.save(),
    });
  }, [register, editorId]);
  return Boolean(register);
}

/** Si el anfitrión tiene un «Guardar» propio (para editores que aplican al instante y lo avisan). */
export function useHostSaves(): boolean {
  return Boolean(useContext(EditorHostContext)?.registerSave);
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
