import { describe, expect, it } from "vitest";
import { DEFAULT_TIER_LABELS, TIER_COUNT, tierBand, tierForScore } from "./tiers";

describe("tierForScore", () => {
  it("pone cada nota detallada en el nivel de su tramo", () => {
    expect([100, 91, 90, 81, 80, 71, 70, 61, 60, 41, 40, 1].map((detailedScore) => tierForScore({ stars: 3, detailedScore }))).toEqual([
      0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5,
    ]);
  });

  it("sin nota detallada usa el tramo de las estrellas", () => {
    expect([5, 4.5, 4, 3.5, 3, 2.5, 2, 0.5].map((stars) => tierForScore({ stars, detailedScore: null }))).toEqual([0, 1, 2, 3, 4, 4, 5, 5]);
  });
});

describe("niveles", () => {
  it("son seis, con un tramo cada uno", () => {
    expect(DEFAULT_TIER_LABELS).toHaveLength(TIER_COUNT);
    expect(tierBand(0).min).toBe(91);
    expect(tierBand(5).max).toBe(40);
    expect(() => tierBand(6)).toThrow(RangeError);
  });
});
