import { describe, expect, it } from "vitest";
import { MIN_VOTERS_FOR_COUNTS, rankGenres } from "./rank";

const g = (slug: string, score: number, inherited = false) => ({ slug, score, inherited });

describe("rankGenres", () => {
  it("el primero es el principal y los que llegan a la mitad son secundarios", () => {
    const ranked = rankGenres([g("shoegaze", 4), g("dream-pop", 2), g("noise-pop", 1)]);
    expect(ranked.map((x) => [x.slug, x.rank])).toEqual([
      ["shoegaze", "primary"],
      ["dream-pop", "secondary"],
      ["noise-pop", "other"],
    ]);
  });

  it("el umbral nunca baja de 1 puntaje", () => {
    const ranked = rankGenres([g("rock", 1), g("pop", 1)]);
    expect(ranked.map((x) => x.rank)).toEqual(["primary", "secondary"]);
  });

  it("un puntaje impar redondea hacia arriba el umbral (5 → 2,5)", () => {
    const ranked = rankGenres([g("a", 5), g("b", 3), g("c", 2)]);
    expect(ranked.map((x) => x.rank)).toEqual(["primary", "secondary", "other"]);
  });

  it("los heredados no tienen principal ni secundarios", () => {
    const ranked = rankGenres([g("rock", 0, true), g("art-rock", 0, true)]);
    expect(ranked.every((x) => x.rank === "other")).toBe(true);
  });

  it("sin géneros devuelve vacío", () => {
    expect(rankGenres([])).toEqual([]);
  });

  it("las cifras de votos se publican desde 5 votantes", () => {
    expect(MIN_VOTERS_FOR_COUNTS).toBe(5);
  });
});
