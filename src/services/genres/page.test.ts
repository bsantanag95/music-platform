import { beforeEach, describe, expect, it, vi } from "vitest";

// Base mockeada: `select` resuelve desde una cola en el orden de las consultas de getGenrePage;
// `execute` devuelve los artistas. El SQL real lo cubre el smoke test (scratch).
const state = vi.hoisted(() => ({
  found: null as Record<string, unknown> | null,
  selects: [] as unknown[][],
  artists: [] as unknown[],
}));

vi.mock("@/db", () => {
  const chain = () => {
    const proxy: unknown = new Proxy(function () {}, {
      get(_t, prop) {
        if (prop === "then") {
          const result = Promise.resolve(state.selects.shift() ?? []);
          return result.then.bind(result);
        }
        return () => proxy;
      },
    });
    return proxy;
  };
  return { db: { select: chain, execute: async () => state.artists } };
});
vi.mock("./read", () => ({
  findStyleGenreBySlug: async () => state.found,
  genreWithDescendants: () => ({}),
}));

const { getGenrePage } = await import("./page");

const g = (id: string, slug: string) => ({ id, slug, name: slug, nameEs: null });

beforeEach(() => {
  state.found = { id: "g0", slug: "shoegaze", name: "shoegaze", nameEs: null, kind: "style" };
  state.selects = [];
  state.artists = [];
});

describe("getGenrePage", () => {
  it("un slug que no es un estilo visible devuelve null y no consulta nada más", async () => {
    state.found = null;
    await expect(getGenrePage("instrumental")).resolves.toBeNull();
  });

  it("arma familias, padres, subgéneros y artistas", async () => {
    // Orden de las consultas: familias, padres, hijos, fusión, influencias.
    state.selects = [[{ key: "rock" }], [g("p1", "alternative-rock")], [g("c1", "blackgaze")], [], []];
    state.artists = [{ id: "a1", name: "Slowdive", type: "group", album_count: 9 }];

    const page = await getGenrePage("shoegaze");

    expect(page?.families).toEqual(["rock"]);
    expect(page?.parents).toEqual([{ slug: "alternative-rock", name: "alternative-rock", nameEs: null }]);
    expect(page?.children.map((c) => c.slug)).toEqual(["blackgaze"]);
    expect(page?.artists).toEqual([{ id: "a1", name: "Slowdive", type: "group", albumCount: 9 }]);
  });

  it("los cercanos van fusión primero, sin repetir padres ni subgéneros, hasta 8", async () => {
    const fusion = [g("p1", "alternative-rock"), g("f1", "black-metal")];
    const influences = [g("c1", "blackgaze"), g("i1", "noise-pop"), ...Array.from({ length: 9 }, (_, i) => g(`x${i}`, `otro-${i}`))];
    state.selects = [[], [g("p1", "alternative-rock")], [g("c1", "blackgaze")], fusion, influences];

    const page = await getGenrePage("shoegaze");

    expect(page?.related.map((r) => r.slug).slice(0, 3)).toEqual(["black-metal", "noise-pop", "otro-0"]);
    expect(page?.related).toHaveLength(8);
    expect(page?.related.map((r) => r.slug)).not.toContain("alternative-rock");
    expect(page?.related.map((r) => r.slug)).not.toContain("blackgaze");
  });
});
