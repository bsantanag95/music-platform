import { beforeEach, describe, expect, it, vi } from "vitest";

// Base mockeada: `select` resuelve desde una cola en el orden de las consultas de getGenrePage;
// `execute` devuelve los conteos de álbumes por subgénero. El SQL real lo cubre el smoke test (scratch).
const state = vi.hoisted(() => ({
  found: null as Record<string, unknown> | null,
  selects: [] as unknown[][],
  counts: [] as unknown[],
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
  return { db: { select: chain, execute: async () => state.counts } };
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
  state.counts = [];
});

describe("getGenrePage", () => {
  it("un slug que no es un estilo visible devuelve null y no consulta nada más", async () => {
    state.found = null;
    await expect(getGenrePage("instrumental")).resolves.toBeNull();
  });

  it("arma familias, padres y subgéneros con su cantidad de álbumes", async () => {
    // Orden de las consultas: familias, padres, hijos, fusión, influencias.
    state.selects = [[{ key: "rock" }], [g("p1", "alternative-rock")], [g("c1", "blackgaze")], [], []];
    state.counts = [{ id: "c1", album_count: 7 }];

    const page = await getGenrePage("shoegaze");

    expect(page?.families).toEqual(["rock"]);
    expect(page?.parents).toEqual([{ slug: "alternative-rock", name: "alternative-rock", nameEs: null }]);
    expect(page?.children).toEqual([{ slug: "blackgaze", name: "blackgaze", nameEs: null, albumCount: 7 }]);
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

  it("ordena los subgéneros por álbumes y, a igualdad, por nombre en el idioma pedido", async () => {
    const children = [{ ...g("c1", "a"), name: "zeta", nameEs: "alfa" }, { ...g("c2", "b"), name: "beta", nameEs: "zulu" }, g("c3", "c"), g("c4", "d")];
    state.selects = [[], [], children, [], []];
    state.counts = [
      { id: "c1", album_count: 3 },
      { id: "c2", album_count: 3 },
      { id: "c3", album_count: 40 },
    ];
    const es = await getGenrePage("shoegaze", "es");
    expect(es?.children.map((c) => c.slug)).toEqual(["c", "a", "b", "d"]);

    state.selects = [[], [], children.slice(0, 2), [], []];
    const en = await getGenrePage("shoegaze", "en");
    expect(en?.children.map((c) => c.slug)).toEqual(["b", "a"]);
  });

  it("un subgénero sin álbumes queda al final con cero", async () => {
    state.selects = [[], [], [g("c1", "a"), g("c2", "b")], [], []];
    state.counts = [{ id: "c2", album_count: 1 }];
    const page = await getGenrePage("shoegaze");
    expect(page?.children.map((c) => [c.slug, c.albumCount])).toEqual([
      ["b", 1],
      ["a", 0],
    ]);
  });
});
