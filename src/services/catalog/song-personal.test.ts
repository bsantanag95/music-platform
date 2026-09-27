import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ select: vi.fn() }));
vi.mock("@/db", () => ({ db: { select: mocks.select } }));

const { getSongPersonalExtras } = await import("./song-personal");

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

describe("getSongPersonalExtras", () => {
  it("resume las escuchas con la última reacción y trae las listas propias", async () => {
    const queue: unknown[] = [
      [{ count: 3 }],
      [{ createdAt: new Date("2026-09-12T20:00:00Z"), reaction: "obsessed" }],
      [{ listId: "l1", itemId: "i1", title: "Baladas" }],
    ];
    mocks.select.mockImplementation(() => chain(queue.shift()));

    await expect(getSongPersonalExtras("u1", "rec-1")).resolves.toEqual({
      listens: { count: 3, lastAt: "2026-09-12T20:00:00.000Z", lastReaction: "obsessed" },
      ownListMemberships: [{ listId: "l1", itemId: "i1", title: "Baladas", kind: "standard" }],
    });
  });

  it("sin escuchas ni listas", async () => {
    const queue: unknown[] = [[{ count: 0 }], [], []];
    mocks.select.mockImplementation(() => chain(queue.shift()));

    await expect(getSongPersonalExtras("u1", "rec-1")).resolves.toEqual({
      listens: { count: 0, lastAt: null, lastReaction: null },
      ownListMemberships: [],
    });
  });
});
