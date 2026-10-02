import { beforeEach, describe, expect, it, vi } from "vitest";

// Base mockeada con cadenas que resuelven desde una cola; el SQL real lo cubre el smoke test.
const state = vi.hoisted(() => ({ results: [] as unknown[][], descriptors: new Map<string, string[]>() }));

vi.mock("@/db", () => {
  const chain: unknown = new Proxy(function () {}, {
    get(_t, prop) {
      if (prop === "then") {
        const result = Promise.resolve(state.results.shift() ?? []);
        return result.then.bind(result);
      }
      return () => chain;
    },
  });
  return { db: { select: () => chain } };
});
vi.mock("./read", () => ({ albumDescriptors: async () => state.descriptors }));

const { getAlbumGenres, getArtistGenres, getSongGenres } = await import("./display");

beforeEach(() => {
  state.results = [];
  state.descriptors = new Map();
});

describe("getArtistGenres", () => {
  it("devuelve las semillas como propias y sin descriptores", async () => {
    state.results = [[{ slug: "shoegaze", name: "shoegaze", nameEs: null }]];
    await expect(getArtistGenres("a1")).resolves.toEqual({
      genres: [{ slug: "shoegaze", name: "shoegaze", nameEs: null, inherited: false }],
      descriptors: [],
    });
  });
});

describe("getAlbumGenres", () => {
  it("conserva la marca de herencia de la vista y suma los descriptores", async () => {
    state.results = [
      [
        { slug: "rock", name: "rock", nameEs: null, inherited: true },
        { slug: "art-rock", name: "art rock", nameEs: null, inherited: true },
      ],
    ];
    state.descriptors = new Map([["rg1", ["instrumental", "soundtrack"]]]);
    const result = await getAlbumGenres("rg1");
    expect(result.genres.every((g) => g.inherited)).toBe(true);
    expect(result.descriptors).toEqual(["instrumental", "soundtrack"]);
  });

  it("un álbum sin géneros ni descriptores devuelve vacío", async () => {
    await expect(getAlbumGenres("rg1")).resolves.toEqual({ genres: [], descriptors: [] });
  });
});

describe("getSongGenres", () => {
  it("marca como heredados los géneros del disco principal y omite los descriptores", async () => {
    state.results = [[{ slug: "rock", name: "rock", nameEs: null, inherited: false }]];
    state.descriptors = new Map([["rg1", ["orchestral"]]]);
    await expect(getSongGenres("rg1")).resolves.toEqual({
      genres: [{ slug: "rock", name: "rock", nameEs: null, inherited: true }],
      descriptors: [],
    });
  });

  it("sin disco principal no consulta nada", async () => {
    await expect(getSongGenres(null)).resolves.toEqual({ genres: [], descriptors: [] });
  });
});
