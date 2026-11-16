import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";

vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/services/share/images", () => ({ fetchImageBytes: vi.fn() }));

import { contrastRatio, toneFromImage, toneFromPixels } from "./tone";

const INK = "#14120f";

function solid(r: number, g: number, b: number, n = 48 * 48): Uint8Array {
  const out = new Uint8Array(n * 3);
  for (let i = 0; i < n; i++) out.set([r, g, b], i * 3);
  return out;
}

function hue(hex: string): number {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

describe("toneFromPixels (spec social-profiles, 'Tono del perfil')", () => {
  it("una carátula roja da un tono rojo", () => {
    const tone = toneFromPixels(solid(200, 30, 40));
    expect(tone).toMatch(/^#[0-9a-f]{6}$/);
    const h = hue(tone!);
    expect(h < 15 || h > 345).toBe(true);
  });

  it("toma el matiz dominante, no el promedio", () => {
    // 70 % azul, 30 % amarillo: un promedio daría un gris verdoso.
    const blue = solid(30, 60, 200, 1600);
    const yellow = solid(230, 200, 40, 704);
    const tone = toneFromPixels(Buffer.concat([Buffer.from(blue), Buffer.from(yellow)]));
    const h = hue(tone!);
    expect(h).toBeGreaterThan(200);
    expect(h).toBeLessThan(250);
  });

  it("gris, blanco y negro → null (ámbar)", () => {
    expect(toneFromPixels(solid(128, 128, 128))).toBeNull();
    expect(toneFromPixels(solid(250, 250, 250))).toBeNull();
    expect(toneFromPixels(solid(5, 5, 5))).toBeNull();
  });

  it("casi sin saturación → null", () => {
    expect(toneFromPixels(solid(120, 110, 105))).toBeNull();
  });

  it("siempre contrasta al menos 3:1 con la tinta, aun con un azul oscuro", () => {
    const colors: [number, number, number][] = [
      [20, 20, 160],
      [90, 0, 140],
      [200, 30, 40],
      [10, 120, 60],
    ];
    for (const [r, g, b] of colors) {
      const tone = toneFromPixels(solid(r, g, b));
      expect(contrastRatio(tone!, INK)).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("toneFromImage", () => {
  it("lee una imagen real con sharp", async () => {
    const png = await sharp({ create: { width: 64, height: 64, channels: 3, background: { r: 30, g: 140, b: 70 } } })
      .png()
      .toBuffer();
    const tone = await toneFromImage(png);
    const h = hue(tone!);
    expect(h).toBeGreaterThan(110);
    expect(h).toBeLessThan(170);
  });

  it("bytes ilegibles → null, sin lanzar", async () => {
    expect(await toneFromImage(Buffer.from("no es una imagen"))).toBeNull();
  });
});
