import { describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ db: {} }));

const { rankByMatchTier } = await import("./local-match");

describe("rankByMatchTier", () => {
  it("antepone exactas y palabras completas a subcadenas a mitad de palabra", () => {
    // Orden de similitud tal como podría devolverlo la base.
    const bySimilarity = ["Jack Perricone", "Ennio Morricone", "Despised Icon", "Icon", "ICON"];
    expect(rankByMatchTier(bySimilarity, (name) => name, "icon")).toEqual([
      "Icon",
      "ICON",
      "Despised Icon",
      "Jack Perricone",
      "Ennio Morricone",
    ]);
  });

  it("dentro de un mismo nivel conserva el orden de la base", () => {
    const rows = [{ name: "Icon", id: "b" }, { name: "Icon", id: "a" }];
    expect(rankByMatchTier(rows, (row) => row.name, "icon").map((row) => row.id)).toEqual([
      "b",
      "a",
    ]);
  });
});
