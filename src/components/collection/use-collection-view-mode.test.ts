import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { COLLECTION_VIEW_MODE_STORAGE_KEY } from "./collection-view-mode";
import { useCollectionViewMode } from "./use-collection-view-mode";

// El entorno de test no expone un `localStorage` funcional; se instala un doble
// en memoria. El caso "lanza" lo reemplaza por uno que tira.
function installStorage(impl: Partial<Storage>) {
  Object.defineProperty(window, "localStorage", { configurable: true, value: impl });
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

describe("useCollectionViewMode", () => {
  beforeEach(() => {
    installStorage(memoryStorage());
  });

  it("sin preferencia guardada arranca en 'shelf'", () => {
    const { result } = renderHook(() => useCollectionViewMode());
    expect(result.current[0]).toBe("shelf");
  });

  it("respeta una preferencia guardada válida", () => {
    window.localStorage.setItem(COLLECTION_VIEW_MODE_STORAGE_KEY, "index");
    const { result } = renderHook(() => useCollectionViewMode());
    expect(result.current[0]).toBe("index");
  });

  it("ignora un valor guardado inválido", () => {
    window.localStorage.setItem(COLLECTION_VIEW_MODE_STORAGE_KEY, "loco");
    const { result } = renderHook(() => useCollectionViewMode());
    expect(result.current[0]).toBe("shelf");
  });

  it("persiste el nuevo modo al actualizar", () => {
    const { result } = renderHook(() => useCollectionViewMode());
    act(() => result.current[1]("detailed"));
    expect(result.current[0]).toBe("detailed");
    expect(window.localStorage.getItem(COLLECTION_VIEW_MODE_STORAGE_KEY)).toBe("detailed");
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
    const { result } = renderHook(() => useCollectionViewMode());
    expect(result.current[0]).toBe("shelf");
    act(() => result.current[1]("index"));
    expect(result.current[0]).toBe("index");
  });
});
