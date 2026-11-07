import { describe, expect, it } from "vitest";
import { curvePoints, discographyValue, effectiveView, songViewAvailable } from "./discography";

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

describe("songViewAvailable", () => {
  const rated = (id: string) => ({ recordingId: id, score: { stars: 4, detailedScore: null } });
  const unrated = (id: string) => ({ recordingId: id, score: null });

  it("desde 10 canciones en 2 discos", () => {
    const first = { tracks: Array.from({ length: 6 }, (_, i) => rated(`a${i}`)) };
    const second = { tracks: [...Array.from({ length: 4 }, (_, i) => rated(`b${i}`)), unrated("b9")] };
    expect(songViewAvailable([first, second])).toBe(true);
  });

  it("10 canciones en un solo disco no alcanzan", () => {
    expect(songViewAvailable([{ tracks: Array.from({ length: 12 }, (_, i) => rated(`a${i}`)) }])).toBe(false);
  });

  it("una canción repetida en dos discos cuenta una vez", () => {
    const shared = Array.from({ length: 9 }, (_, i) => rated(`s${i}`));
    expect(songViewAvailable([{ tracks: shared }, { tracks: shared }])).toBe(false);
  });
});

describe("effectiveView", () => {
  it("la pedida si está disponible", () => {
    expect(effectiveView("song", { disc: true, song: true })).toBe("song");
  });

  it("si no, la otra", () => {
    expect(effectiveView("song", { disc: true, song: false })).toBe("disc");
    expect(effectiveView("disc", { disc: false, song: true })).toBe("song");
  });
});
