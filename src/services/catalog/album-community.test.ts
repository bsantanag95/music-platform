import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  countLists: vi.fn(),
}));
vi.mock("@/db", () => ({ db: { select: mocks.select } }));
vi.mock("@/services/lists/discovery", () => ({ countPublicListsContainingItem: mocks.countLists }));

const {
  buildHistogram,
  getAlbumCommunityStats,
  getCommunityFavoriteRecordings,
  pickCommunityFavorites,
  summarizeRatings,
  thresholdCount,
} = await import("./album-community");

/** Cadena de consulta encadenable que, al esperarse, resuelve `result`. */
function queryChain(result: unknown) {
  const chain: object = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "then") {
          return (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
            Promise.resolve(result).then(resolve, reject);
        }
        return () => chain;
      },
    },
  );
  return chain;
}

function queueSelects(...results: unknown[]) {
  const queue = [...results];
  mocks.select.mockImplementation(() => queryChain(queue.shift()));
}

beforeEach(() => vi.clearAllMocks());

describe("thresholdCount", () => {
  it("devuelve el valor exacto con 0", () => {
    expect(thresholdCount(0)).toEqual({ kind: "exact", value: 0 });
  });

  it("oculta el valor entre 1 y 4", () => {
    expect(thresholdCount(1)).toEqual({ kind: "fewer", threshold: 5 });
    expect(thresholdCount(4)).toEqual({ kind: "fewer", threshold: 5 });
  });

  it("muestra el valor exacto desde 5", () => {
    expect(thresholdCount(5)).toEqual({ kind: "exact", value: 5 });
  });
});

describe("summarizeRatings", () => {
  const rows = [
    { stars: "5.0", n: 3 },
    { stars: "0.5", n: 2 },
  ];

  it("con 4 valoraciones devuelve el conteo sin media ni histograma", () => {
    expect(summarizeRatings({ count: 4, averageStars: 3.9, averageDetailedScore: 80 }, rows)).toEqual({
      count: 4,
      averageStars: null,
      averageDetailedScore: null,
      histogram: null,
    });
  });

  it("con 5 valoraciones devuelve media e histograma completo", () => {
    const summary = summarizeRatings({ count: 5, averageStars: 3.2, averageDetailedScore: 64 }, rows);
    expect(summary.averageStars).toBe(3.2);
    expect(summary.averageDetailedScore).toBe(64);
    expect(summary.histogram).toEqual([2, 0, 0, 0, 0, 0, 0, 0, 0, 3]);
  });
});

describe("buildHistogram", () => {
  it("rellena con ceros los valores sin valoraciones y respeta el orden de ½ a 5", () => {
    expect(buildHistogram([{ stars: "3.5", n: 7 }])).toEqual([0, 0, 0, 0, 0, 0, 7, 0, 0, 0]);
  });
});

describe("getAlbumCommunityStats", () => {
  it("combina los agregados y aplica los umbrales", async () => {
    queueSelects(
      [{ count: 12, averageStars: 4.25, averageDetailedScore: 86.5 }],
      [
        { stars: "4.0", n: 5 },
        { stars: "4.5", n: 7 },
      ],
      [{ n: 3 }],
      [{ n: 2 }],
      [{ n: 0 }],
    );
    mocks.countLists.mockResolvedValue(64);

    const stats = await getAlbumCommunityStats("rg-1");

    expect(stats.ratings).toEqual({
      count: 12,
      averageStars: 4.25,
      averageDetailedScore: 86.5,
      histogram: [0, 0, 0, 0, 0, 0, 0, 5, 7, 0],
    });
    expect(stats.reviewCount).toBe(3);
    expect(stats.collectors).toEqual({ kind: "fewer", threshold: 5 });
    expect(stats.seekers).toEqual({ kind: "exact", value: 0 });
    expect(stats.listCount).toBe(64);
    expect(mocks.countLists).toHaveBeenCalledWith({ type: "release-group", id: "rg-1" });
  });

  it("cuenta personas distintas: el conteo llega ya agregado por usuario", async () => {
    // Una persona con dos copias es una sola fila en count(distinct user_id).
    queueSelects([{ count: 0, averageStars: null, averageDetailedScore: null }], [], [{ n: 0 }], [{ n: 5 }], [{ n: 5 }]);
    mocks.countLists.mockResolvedValue(0);

    const stats = await getAlbumCommunityStats("rg-1");
    expect(stats.collectors).toEqual({ kind: "exact", value: 5 });
    expect(stats.ratings.histogram).toBeNull();
  });
});

describe("pickCommunityFavorites", () => {
  it("elige hasta 3 pistas con al menos 5 reacciones fuertes, de mayor a menor", () => {
    const picked = pickCommunityFavorites([
      { recordingId: "a", n: 5 },
      { recordingId: "b", n: 9 },
      { recordingId: "c", n: 4 },
      { recordingId: "d", n: 6 },
      { recordingId: "e", n: 7 },
    ]);
    expect([...picked]).toEqual(["b", "e", "d"]);
  });

  it("no marca ninguna pista por debajo del umbral", () => {
    expect(pickCommunityFavorites([{ recordingId: "a", n: 4 }]).size).toBe(0);
  });
});

describe("getCommunityFavoriteRecordings", () => {
  it("usa una sola consulta agrupada para todas las grabaciones", async () => {
    queueSelects([
      { recordingId: "r1", n: 8 },
      { recordingId: "r2", n: 2 },
    ]);
    const favorites = await getCommunityFavoriteRecordings(["r1", "r2", "r3"]);
    expect(mocks.select).toHaveBeenCalledTimes(1);
    expect([...favorites]).toEqual(["r1"]);
  });

  it("no consulta sin grabaciones", async () => {
    expect((await getCommunityFavoriteRecordings([])).size).toBe(0);
    expect(mocks.select).not.toHaveBeenCalled();
  });
});
