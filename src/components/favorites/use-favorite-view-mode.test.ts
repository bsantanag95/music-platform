import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FAVORITE_VIEW_MODE_STORAGE_KEY } from "./favorite-view-mode";
import { useFavoriteViewMode } from "./use-favorite-view-mode";

// El entorno de test no expone un `localStorage` funcional; se instala un doble en memoria.
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

describe("useFavoriteViewMode", () => {
  beforeEach(() => {
    installStorage(memoryStorage());
  });

  it("sin preferencia guardada arranca en 'detailed'", () => {
    const { result } = renderHook(() => useFavoriteViewMode());
    expect(result.current[0]).toBe("detailed");
  });

  it("una preferencia guardada válida la pisa y `ready` es verdadero", () => {
    window.localStorage.setItem(FAVORITE_VIEW_MODE_STORAGE_KEY, "index");
    const { result } = renderHook(() => useFavoriteViewMode());
    expect(result.current[0]).toBe("index");
    expect(result.current[2]).toBe(true);
  });

  it("ignora un valor guardado inválido", () => {
    window.localStorage.setItem(FAVORITE_VIEW_MODE_STORAGE_KEY, "loco");
    const { result } = renderHook(() => useFavoriteViewMode());
    expect(result.current[0]).toBe("detailed");
  });

  it("persiste el nuevo modo al actualizar", () => {
    const { result } = renderHook(() => useFavoriteViewMode());
    act(() => result.current[1]("graphic"));
    expect(result.current[0]).toBe("graphic");
    expect(window.localStorage.getItem(FAVORITE_VIEW_MODE_STORAGE_KEY)).toBe("graphic");
  });

  it("no rompe si el almacenamiento lanza, y `ready` también llega", () => {
    installStorage({
      getItem: vi.fn(() => {
        throw new Error("bloqueado");
      }),
      setItem: vi.fn(() => {
        throw new Error("bloqueado");
      }),
    });
    const { result } = renderHook(() => useFavoriteViewMode());
    expect(result.current[0]).toBe("detailed");
    expect(result.current[2]).toBe(true);
    act(() => result.current[1]("index"));
    expect(result.current[0]).toBe("index");
  });
});
