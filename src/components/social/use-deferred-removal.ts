"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

export interface DeferredRemoval<T> {
  item: T;
  /** Lugar que ocupaba la fila, para devolverla ahí. */
  index: number;
  failed: boolean;
}

interface DeferredRemovalOptions<T extends { id: string }> {
  items: T[];
  setItems: Dispatch<SetStateAction<T[]>>;
  /** La petición que confirma la acción en el servidor; `keepalive` al salir de la página. */
  send: (item: T, keepalive: boolean) => Promise<unknown>;
  /** Al quitar (+1 → -1) o devolver (-1 → +1) una fila, para ajustar una cifra. */
  onCountChange?: (delta: number) => void;
}

// Quitar una fila con Deshacer diferido (openspec: refine-follow-requests-phase1, D2; add-follow-requests-sent-and-bulk,
// D2): la fila sale al instante y la petición se envía al vencer el aviso, con la siguiente acción igual o al salir de
// la vista (desmontaje y `pagehide`, con `keepalive`). Deshacer devuelve la fila sin tocar el servidor; si la petición
// falla, la fila vuelve y `pending.failed` lo indica.
export function useDeferredRemoval<T extends { id: string }>({
  items,
  setItems,
  send,
  onCountChange,
}: DeferredRemovalOptions<T>) {
  const [pending, setPending] = useState<DeferredRemoval<T> | null>(null);
  const pendingRef = useRef<DeferredRemoval<T> | null>(null);
  const sendRef = useRef(send);
  sendRef.current = send;

  useEffect(() => {
    const flush = () => {
      const current = pendingRef.current;
      pendingRef.current = null;
      if (current) void sendRef.current(current.item, true).catch(() => undefined);
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, []);

  const restore = useCallback(
    (removal: DeferredRemoval<T>) => {
      setItems((current) => {
        if (current.some((item) => item.id === removal.item.id)) return current;
        const next = [...current];
        next.splice(Math.min(removal.index, next.length), 0, removal.item);
        return next;
      });
      onCountChange?.(1);
    },
    [setItems, onCountChange],
  );

  const commit = useCallback(
    (removal: DeferredRemoval<T>) => {
      if (pendingRef.current?.item.id === removal.item.id) pendingRef.current = null;
      sendRef.current(removal.item, false).catch(() => {
        restore(removal);
        setPending({ ...removal, failed: true });
      });
    },
    [restore],
  );

  /** Envía ya lo que esté pendiente (p. ej. antes de una acción en lote). */
  const flushNow = useCallback(() => {
    const current = pendingRef.current;
    if (current) commit(current);
    setPending(null);
  }, [commit]);

  function remove(item: T) {
    const previous = pendingRef.current;
    if (previous) commit(previous);
    const index = items.findIndex((candidate) => candidate.id === item.id);
    setItems((current) => current.filter((candidate) => candidate.id !== item.id));
    onCountChange?.(-1);
    const next = { item, index, failed: false };
    pendingRef.current = next;
    setPending(next);
  }

  function undo() {
    if (!pending) return;
    pendingRef.current = null;
    restore(pending);
    setPending(null);
  }

  const dismiss = useCallback(() => setPending(null), []);

  return { pending, remove, undo, expire: flushNow, flushNow, dismiss };
}
