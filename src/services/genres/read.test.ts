import { describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ db: {} }));

const { descriptorsOf, genreDisplayName, parseFamilyKey } = await import("./read");

describe("genreDisplayName", () => {
  it("en español usa la etiqueta de Wikidata y, si no hay, el nombre de MusicBrainz", () => {
    expect(genreDisplayName({ name: "progressive rock", nameEs: "rock progresivo" }, "es")).toBe("rock progresivo");
    expect(genreDisplayName({ name: "shoegaze", nameEs: null }, "es")).toBe("shoegaze");
  });

  it("en inglés usa siempre el nombre de MusicBrainz", () => {
    expect(genreDisplayName({ name: "progressive rock", nameEs: "rock progresivo" }, "en")).toBe("progressive rock");
  });
});

describe("parseFamilyKey", () => {
  it("acepta las claves de familia, sin distinguir mayúsculas ni espacios", () => {
    expect(parseFamilyKey("latin")).toBe("latin");
    expect(parseFamilyKey(" Hip-Hop ")).toBe("hip-hop");
  });

  it("rechaza lo que no es una familia", () => {
    expect(parseFamilyKey("inexistente")).toBeNull();
    expect(parseFamilyKey("shoegaze")).toBeNull();
  });
});

describe("descriptorsOf", () => {
  it("traduce los géneros descriptores y suma Banda sonora por el tipo secundario", () => {
    expect(descriptorsOf(["christmas music", "instrumental"], ["Soundtrack", "Compilation"])).toEqual([
      "instrumental",
      "christmas",
      "soundtrack",
    ]);
  });

  it("sin descriptores ni Soundtrack no devuelve nada", () => {
    expect(descriptorsOf([], null)).toEqual([]);
    expect(descriptorsOf(["post-rock"], ["Live"])).toEqual([]);
  });
});
