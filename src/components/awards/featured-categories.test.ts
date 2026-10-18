import { describe, expect, it } from "vitest";
import { FEATURED_CATEGORIES, splitFeatured } from "./featured-categories";

describe("splitFeatured", () => {
  it("las cuatro primeras del campo general van destacadas y el resto como filas, en el orden curado", () => {
    const { featured, rest } = splitFeatured(["album", "record", "song", "new-artist", "producer", "songwriter"]);

    expect(FEATURED_CATEGORIES).toBe(4);
    expect(featured).toEqual(["album", "record", "song", "new-artist"]);
    expect(rest).toEqual(["producer", "songwriter"]);
  });

  it("con exactamente cuatro no queda ninguna fila", () => {
    expect(splitFeatured([1, 2, 3, 4]).rest).toEqual([]);
  });

  it("con menos de cuatro todas son destacadas", () => {
    expect(splitFeatured([1, 2])).toEqual({ featured: [1, 2], rest: [] });
  });

  it("sin categorías no hay nada", () => {
    expect(splitFeatured([])).toEqual({ featured: [], rest: [] });
  });
});
