import { describe, expect, it } from "vitest";
import { isScoreCoherent, scoreRange } from "./rating-range";

describe("scoreRange", () => {
  it("devuelve el tramo de 10 puntos de cada valor de estrellas", () => {
    expect(scoreRange(0.5)).toEqual({ min: 1, max: 10 });
    expect(scoreRange(1)).toEqual({ min: 11, max: 20 });
    expect(scoreRange(4)).toEqual({ min: 71, max: 80 });
    expect(scoreRange(5)).toEqual({ min: 91, max: 100 });
  });
});

describe("isScoreCoherent", () => {
  it("acepta los bordes del tramo y la ausencia de puntaje", () => {
    expect(isScoreCoherent(3, 51)).toBe(true);
    expect(isScoreCoherent(3, 60)).toBe(true);
    expect(isScoreCoherent(3, null)).toBe(true);
  });

  it("rechaza valores fuera del tramo o no enteros", () => {
    expect(isScoreCoherent(3, 50)).toBe(false);
    expect(isScoreCoherent(3, 61)).toBe(false);
    expect(isScoreCoherent(5, 95.5)).toBe(false);
    expect(isScoreCoherent(3, 95)).toBe(false);
  });
});
