import { describe, expect, it } from "vitest";
import { BRAND_COLORS } from "./brand-tokens";
import { SCORE_BANDS, bandForDetailed, bandForStars, bandRangeLabel, scaleScore } from "./score-scale";

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)) as [
    number,
    number,
    number,
  ];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

describe("escala de la casa", () => {
  it("cubre 1–100 sin huecos ni solapamientos", () => {
    for (let score = 1; score <= 100; score++) {
      expect(SCORE_BANDS.filter((b) => score >= b.min && score <= b.max)).toHaveLength(1);
    }
  });

  it.each(SCORE_BANDS.map((b) => [bandRangeLabel(b), b] as const))(
    "el número del tramo %s contrasta al menos 4.5:1 con su fondo",
    (_label, band) => {
      expect(contrast(band.foreground, band.background)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it("solo el tramo 91–100 usa el dorado de la marca", () => {
    expect(SCORE_BANDS.filter((b) => b.background === BRAND_COLORS.amber).map(bandRangeLabel)).toEqual(["91–100"]);
    expect(bandForDetailed(95).background).toBe(BRAND_COLORS.amber);
    expect(bandForDetailed(88).background).not.toBe(BRAND_COLORS.amber);
  });

  it("una nota detallada muestra su número en su tramo", () => {
    const scaled = scaleScore({ stars: 4.5, detailedScore: 86 });
    expect(scaled.label).toBe("86");
    expect(bandRangeLabel(scaled.band)).toBe("81–90");
  });

  it("solo estrellas: tramo por estrellas y sin número inventado", () => {
    const scaled = scaleScore({ stars: 4.5, detailedScore: null });
    expect(scaled.label).toBe("4.5★");
    expect(bandRangeLabel(scaled.band)).toBe("81–90");
    expect(scaled.label).not.toMatch(/^\d+$/);
  });

  it.each([
    [0.5, "1–40"],
    [2, "1–40"],
    [2.5, "41–60"],
    [3, "41–60"],
    [3.5, "61–70"],
    [4, "71–80"],
    [5, "91–100"],
  ])("%s★ cae en el tramo %s", (stars, range) => {
    expect(bandRangeLabel(bandForStars(stars))).toBe(range);
  });

  it("rechaza notas fuera de 1–100", () => {
    expect(() => bandForDetailed(0)).toThrow(RangeError);
    expect(() => bandForDetailed(101)).toThrow(RangeError);
  });
});
