import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ results: [] as unknown[][] }));

vi.mock("@/db", () => ({ db: { execute: async () => state.results.shift() ?? [] } }));
vi.mock("./read", () => ({ albumInGenreTree: () => ({}), genreWithDescendants: () => ({}) }));

const { applyStatsThresholds, getGenreStats } = await import("./stats");

const decades = (...pairs: [number, number][]) => pairs.map(([decade, count]) => ({ decade, count }));

describe("applyStatsThresholds", () => {
  it("con 5 valoraciones o más muestra media y cantidad", () => {
    const stats = applyStatsThresholds({
      albumCount: 412,
      artistCount: 138,
      ratingCount: 1204,
      averageStars: 4.1,
      decades: decades([1990, 5], [1980, 9], [1970, 20]),
    });
    expect(stats).toMatchObject({ albumCount: 412, artistCount: 138, ratingCount: 1204, averageStars: 4.1, peakDecade: 1970 });
  });

  it("bajo 5 valoraciones omite media y cantidad pero conserva álbumes y artistas", () => {
    const stats = applyStatsThresholds({ albumCount: 9, artistCount: 3, ratingCount: 4, averageStars: 5, decades: [] });
    expect(stats.ratingCount).toBeNull();
    expect(stats.averageStars).toBeNull();
    expect(stats.albumCount).toBe(9);
  });

  it("con una sola década no hay década de auge ni distribución", () => {
    const stats = applyStatsThresholds({ albumCount: 4, artistCount: 1, ratingCount: 0, averageStars: null, decades: decades([1990, 4]) });
    expect(stats.peakDecade).toBeNull();
    expect(stats.decades).toEqual([]);
    expect(stats.allDecades).toEqual([1990]);
  });

  it("a igualdad de álbumes gana la década más antigua", () => {
    const stats = applyStatsThresholds({
      albumCount: 10,
      artistCount: 2,
      ratingCount: 0,
      averageStars: null,
      decades: decades([2000, 5], [1990, 5]),
    });
    expect(stats.peakDecade).toBe(1990);
  });
});

describe("getGenreStats", () => {
  beforeEach(() => {
    state.results = [];
  });

  it("une las cifras y las décadas de las dos consultas", async () => {
    state.results = [
      [{ album_count: 3, artist_count: 2, rating_count: 6, average_stars: 3.5 }],
      [
        { decade: 2000, count: 1 },
        { decade: 1990, count: 2 },
      ],
    ];
    await expect(getGenreStats("g-1")).resolves.toEqual({
      albumCount: 3,
      artistCount: 2,
      ratingCount: 6,
      averageStars: 3.5,
      peakDecade: 1990,
      decades: decades([2000, 1], [1990, 2]),
      allDecades: [2000, 1990],
    });
  });

  it("un género sin filas devuelve ceros y nada de comunidad", async () => {
    state.results = [[], []];
    await expect(getGenreStats("g-1")).resolves.toEqual({
      albumCount: 0,
      artistCount: 0,
      ratingCount: null,
      averageStars: null,
      peakDecade: null,
      decades: [],
      allDecades: [],
    });
  });
});
