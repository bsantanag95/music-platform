import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WANT_TO_LISTEN_VIEW_MODE_STORAGE_KEY } from "./want-to-listen-view-mode";
import { useWantToListenViewMode } from "./use-want-to-listen-view-mode";

// El entorno de test no expone un `localStorage` funcional; se instala un doble
// en memoria. El caso "lanza" lo reemplaza por uno que tira.
function installStorage(impl: Partial<Storage>) {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: impl,
  });
}

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
  } as unknown as Storage;
}

describe("useWantToListenViewMode", () => {
  beforeEach(() => {
    installStorage(memoryStorage());
  });

  it("sin preferencia guardada arranca en 'detailed'", () => {
    const { result } = renderHook(() => useWantToListenViewMode());
    expect(result.current[0]).toBe("detailed");
  });

  it("respeta una preferencia guardada válida", () => {
    window.localStorage.setItem(WANT_TO_LISTEN_VIEW_MODE_STORAGE_KEY, "graphic");
    const { result } = renderHook(() => useWantToListenViewMode());
    expect(result.current[0]).toBe("graphic");
  });

  it("ignora un valor guardado inválido", () => {
    window.localStorage.setItem(WANT_TO_LISTEN_VIEW_MODE_STORAGE_KEY, "loco");
    const { result } = renderHook(() => useWantToListenViewMode());
    expect(result.current[0]).toBe("detailed");
  });

  it("persiste el nuevo modo al actualizar", () => {
    const { result } = renderHook(() => useWantToListenViewMode());
    act(() => result.current[1]("index"));
    expect(result.current[0]).toBe("index");
    expect(window.localStorage.getItem(WANT_TO_LISTEN_VIEW_MODE_STORAGE_KEY)).toBe("index");
  });

  it("no rompe si el almacenamiento lanza", () => {
    installStorage({
      getItem: vi.fn(() => {
        throw new Error("bloqueado");
      }),
      setItem: vi.fn(() => {
        throw new Error("bloqueado");
      }),
    });
    const { result } = renderHook(() => useWantToListenViewMode());
    expect(result.current[0]).toBe("detailed");
    act(() => result.current[1]("graphic"));
    expect(result.current[0]).toBe("graphic");
  });
});
