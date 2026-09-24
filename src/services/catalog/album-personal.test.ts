import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ select: vi.fn(), selectDistinct: vi.fn() }));
vi.mock("@/db", () => ({ db: { select: mocks.select, selectDistinct: mocks.selectDistinct } }));

const { getAlbumPersonalExtras } = await import("./album-personal");

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

beforeEach(() => vi.clearAllMocks());

describe("getAlbumPersonalExtras", () => {
  it("resume escuchas, reseña propia, listas propias y pistas escuchadas", async () => {
    const queue = [
      [{ count: 3, lastAt: "2026-09-12 10:00:00+00" }],
      [{ id: "review-1" }],
      [{ n: 2 }],
      [{ recordingId: "r1" }],
    ];
    mocks.select.mockImplementation(() => queryChain(queue.shift()));
    mocks.selectDistinct.mockImplementation(() =>
      queryChain([{ recordingId: "r2" }, { recordingId: null }]),
    );

    const extras = await getAlbumPersonalExtras("u1", "rg-1", ["r1", "r2"]);

    expect(extras.listens).toEqual({ count: 3, lastAt: "2026-09-12T10:00:00.000Z" });
    expect(extras.ownReviewId).toBe("review-1");
    expect(extras.ownListCount).toBe(2);
    expect([...extras.listenedRecordingIds]).toEqual(["r2"]);
    expect([...extras.favoriteRecordingIds]).toEqual(["r1"]);
  });

  it("sin actividad devuelve ceros y no consulta pistas si no hay grabaciones", async () => {
    const queue = [[{ count: 0, lastAt: null }], [], [{ n: 0 }]];
    mocks.select.mockImplementation(() => queryChain(queue.shift()));

    const extras = await getAlbumPersonalExtras("u1", "rg-1", []);

    expect(extras.listens).toEqual({ count: 0, lastAt: null });
    expect(extras.ownReviewId).toBeNull();
    expect(extras.ownListCount).toBe(0);
    expect(extras.listenedRecordingIds.size).toBe(0);
    expect(extras.favoriteRecordingIds.size).toBe(0);
    expect(mocks.selectDistinct).not.toHaveBeenCalled();
  });
});
