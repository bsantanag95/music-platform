import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RATING_VIEW_MODE_STORAGE_KEY } from "./rating-view-mode";
import { useRatingViewMode } from "./use-rating-view-mode";

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

describe("useRatingViewMode", () => {
  beforeEach(() => {
    installStorage(memoryStorage());
  });

  it("sin preferencia guardada arranca en 'graphic'", () => {
    const { result } = renderHook(() => useRatingViewMode());
    expect(result.current[0]).toBe("graphic");
  });

  it("una preferencia guardada distinta del defecto la pisa", () => {
    window.localStorage.setItem(RATING_VIEW_MODE_STORAGE_KEY, "detailed");
    const { result } = renderHook(() => useRatingViewMode());
    expect(result.current[0]).toBe("detailed");
  });

  it("respeta una preferencia guardada válida", () => {
    window.localStorage.setItem(RATING_VIEW_MODE_STORAGE_KEY, "graphic");
    const { result } = renderHook(() => useRatingViewMode());
    expect(result.current[0]).toBe("graphic");
  });

  it("ignora un valor guardado inválido", () => {
    window.localStorage.setItem(RATING_VIEW_MODE_STORAGE_KEY, "loco");
    const { result } = renderHook(() => useRatingViewMode());
    expect(result.current[0]).toBe("graphic");
  });

  it("persiste el nuevo modo al actualizar", () => {
    const { result } = renderHook(() => useRatingViewMode());
    act(() => result.current[1]("index"));
    expect(result.current[0]).toBe("index");
    expect(window.localStorage.getItem(RATING_VIEW_MODE_STORAGE_KEY)).toBe("index");
  });

  it("usa la clave propia de valoraciones", () => {
    expect(RATING_VIEW_MODE_STORAGE_KEY).toBe("music-platform:rating-view-mode");
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
    const { result } = renderHook(() => useRatingViewMode());
    expect(result.current[0]).toBe("graphic");
    act(() => result.current[1]("index"));
    expect(result.current[0]).toBe("index");
  });
});
