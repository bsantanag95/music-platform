import { beforeEach, describe, expect, it, vi } from "vitest";

// Cada `select` resuelve el siguiente conteo de la cola (oyentes, seguidores, favoritos);
// el SQL real (personas distintas, cuentas activas) lo cubre la base, no este mock.
const state = vi.hoisted(() => ({ counts: [] as number[] }));

vi.mock("@/db", () => {
  function chain(): unknown {
    const target: unknown = new Proxy(function () {}, {
      get(_t, prop) {
        if (prop === "then") {
          const result = Promise.resolve([{ n: state.counts.shift() ?? 0 }]);
          return result.then.bind(result);
        }
        return () => target;
      },
    });
    return target;
  }
  return { db: { select: () => chain() } };
});
vi.mock("@/services/lists/discovery", () => ({ countPublicListsContainingItem: vi.fn(async () => 12) }));

const { getArtistCommunityStats } = await import("./artist-community");

beforeEach(() => {
  state.counts = [];
});

describe("getArtistCommunityStats", () => {
  it("devuelve conteos exactos desde 5 y listas visibles", async () => {
    state.counts = [312, 120, 34];
    expect(await getArtistCommunityStats("a1", ["rg1"])).toEqual({
      listeners: { kind: "exact", value: 312 },
      followers: { kind: "exact", value: 120 },
      favorites: { kind: "exact", value: 34 },
      listCount: 12,
    });
  });

  it("entre 1 y 4 personas informa 'menos de 5', con 0 el valor exacto", async () => {
    state.counts = [3, 0, 4];
    const stats = await getArtistCommunityStats("a1", []);
    expect(stats.listeners).toEqual({ kind: "fewer", threshold: 5 });
    expect(stats.followers).toEqual({ kind: "exact", value: 0 });
    expect(stats.favorites).toEqual({ kind: "fewer", threshold: 5 });
  });

  it("no expone promedio de estrellas, Pendiente ni recorridos", async () => {
    state.counts = [10, 10, 10];
    const stats = await getArtistCommunityStats("a1", []);
    expect(Object.keys(stats).sort()).toEqual(["favorites", "followers", "listCount", "listeners"]);
  });
});
