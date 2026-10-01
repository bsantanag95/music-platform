import { describe, expect, it } from "vitest";
import { isScoreCoherent, scoreRange, starsFromScore } from "./rating-range";

describe("starsFromScore", () => {
  it("es la inversa exacta de las bandas para todo puntaje de 1 a 100", () => {
    for (let score = 1; score <= 100; score++) {
      expect(isScoreCoherent(starsFromScore(score), score)).toBe(true);
    }
  });

  it("deriva los extremos de las bandas", () => {
    expect(starsFromScore(10)).toBe(0.5);
    expect(starsFromScore(11)).toBe(1);
    expect(starsFromScore(86)).toBe(4.5);
    expect(starsFromScore(90)).toBe(4.5);
    expect(starsFromScore(100)).toBe(5);
  });
});

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
