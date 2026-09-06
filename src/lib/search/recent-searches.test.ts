import { describe, it, expect, beforeEach } from "vitest";
import {
  clearRecentSearches,
  pushRecentSearch,
  readRecentSearches,
  removeRecentSearch,
} from "./recent-searches";

// El entorno de test no expone un `localStorage` funcional; se instala un
// doble en memoria (mismo patrón que use-list-view-mode.test.ts).
function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
  } as unknown as Storage;
}

beforeEach(() => {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: memoryStorage(),
  });
});

describe("recent-searches", () => {
  it("guarda la más reciente al frente", () => {
    pushRecentSearch("Queen");
    pushRecentSearch("Radiohead");

    expect(readRecentSearches()).toEqual(["Radiohead", "Queen"]);
  });

  it("deduplica sin distinguir mayúsculas y reordena al frente", () => {
    pushRecentSearch("Queen");
    pushRecentSearch("Radiohead");
    pushRecentSearch("queen");

    expect(readRecentSearches()).toEqual(["queen", "Radiohead"]);
  });

  it("recorta a las 6 más recientes", () => {
    for (const q of ["a", "b", "c", "d", "e", "f", "g"]) pushRecentSearch(q);

    expect(readRecentSearches()).toEqual(["g", "f", "e", "d", "c", "b"]);
  });

  it("ignora texto vacío", () => {
    pushRecentSearch("   ");
    expect(readRecentSearches()).toEqual([]);
  });

  it("quita una entrada puntual y todas", () => {
    pushRecentSearch("Queen");
    pushRecentSearch("Radiohead");

    expect(removeRecentSearch("queen")).toEqual(["Radiohead"]);
    expect(clearRecentSearches()).toEqual([]);
  });

  it("devuelve lista vacía ante JSON corrupto", () => {
    window.localStorage.setItem("mp:catalog-recent-searches", "{not json");
    expect(readRecentSearches()).toEqual([]);
  });
});
