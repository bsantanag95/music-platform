import { describe, expect, it } from "vitest";
import { curvePoints, discographyValue } from "./discography";

describe("discographyValue", () => {
  it("usa la detallada si existe", () => {
    expect(discographyValue({ stars: 4.5, detailedScore: 86 })).toBe(86);
  });

  it("sin detallada, ubica por estrellas", () => {
    expect(discographyValue({ stars: 4, detailedScore: null })).toBe(80);
  });
});

describe("curvePoints", () => {
  const disc = (year: number | null, stars: number) => ({ year, stars, detailedScore: null });

  it("reparte los puntos y una nota alta queda arriba", () => {
    const [first, second, third] = curvePoints([disc(1980, 5), disc(1981, 2.5), disc(1982, 0.5)], 120, 120, 10);
    expect([first!.x, second!.x, third!.x]).toEqual([10, 60, 110]);
    expect(first!.y).toBeLessThan(second!.y);
    expect(second!.y).toBeLessThan(third!.y);
  });

  it("un disco sin año queda afuera y los demás conservan su índice", () => {
    expect(curvePoints([disc(1980, 5), disc(null, 4), disc(1982, 3)], 100, 100).map((point) => point.index)).toEqual([0, 2]);
  });

  it("un solo punto va al centro", () => {
    expect(curvePoints([disc(1980, 5)], 100, 100, 10)[0]!.x).toBe(50);
  });
});
