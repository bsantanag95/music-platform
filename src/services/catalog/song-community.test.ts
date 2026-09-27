import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  reactions: vi.fn(),
  lists: vi.fn(),
}));
vi.mock("@/db", () => ({ db: { select: mocks.select } }));
vi.mock("./recording-reactions", () => ({ getRecordingReactionSummary: mocks.reactions }));
vi.mock("@/services/lists/discovery", () => ({ countPublicListsContainingItem: mocks.lists }));

const { getSongCommunityStats, summarizeSongCommunity } = await import("./song-community");

function chain(result: unknown) {
  const proxy: object = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "then") return (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve);
        return () => proxy;
      },
    },
  );
  return proxy;
}

beforeEach(() => vi.clearAllMocks());

describe("summarizeSongCommunity", () => {
  it("con suficientes datos muestra media, reacción predominante y favoritas", () => {
    expect(
      summarizeSongCommunity({
        ratingCount: 128,
        averageStars: 4.3,
        reactionCount: 60,
        topReaction: "obsessed",
        favoriteCount: 41,
        listCount: 23,
      }),
    ).toEqual({
      ratings: { count: 128, averageStars: 4.3 },
      reactions: { count: 60, top: "obsessed" },
      favorites: { kind: "exact", value: 41 },
      listCount: 23,
    });
  });

  it("por debajo de 5 oculta la media y la predominante y resume las favoritas", () => {
    const stats = summarizeSongCommunity({
      ratingCount: 4,
      averageStars: 5,
      reactionCount: 3,
      topReaction: "loved",
      favoriteCount: 2,
      listCount: 0,
    });
    expect(stats.ratings).toEqual({ count: 4, averageStars: null });
    expect(stats.reactions).toEqual({ count: 3, top: null });
    expect(stats.favorites).toEqual({ kind: "fewer", threshold: 5 });
  });

  it("sin favoritas no dice 'menos de 5'", () => {
    const stats = summarizeSongCommunity({
      ratingCount: 0,
      averageStars: null,
      reactionCount: 0,
      topReaction: null,
      favoriteCount: 0,
      listCount: 0,
    });
    expect(stats.favorites).toEqual({ kind: "exact", value: 0 });
  });
});

describe("getSongCommunityStats", () => {
  it("combina valoraciones, reacciones públicas, favoritas y listas de la grabación", async () => {
    const queue: unknown[] = [[{ count: 7, averageStars: 3.5 }], [{ n: 6 }]];
    mocks.select.mockImplementation(() => chain(queue.shift()));
    mocks.reactions.mockResolvedValue({ total: 9, top: "loved", byReaction: {} });
    mocks.lists.mockResolvedValue(2);

    await expect(getSongCommunityStats("rec-1")).resolves.toEqual({
      ratings: { count: 7, averageStars: 3.5 },
      reactions: { count: 9, top: "loved" },
      favorites: { kind: "exact", value: 6 },
      listCount: 2,
    });
    expect(mocks.reactions).toHaveBeenCalledWith("rec-1");
    expect(mocks.lists).toHaveBeenCalledWith({ type: "recording", id: "rec-1" });
  });
});
