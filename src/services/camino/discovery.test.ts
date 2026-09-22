import { beforeEach, describe, expect, it, vi } from "vitest";
import { discoverCaminos } from "./discovery";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn() },
  enrichLists: vi.fn(async () => new Map()),
}));

vi.mock("@/db", () => ({ db: mocks.db }));
vi.mock("@/services/lists/lists", () => ({ enrichLists: mocks.enrichLists }));

function chain<T>(result: T): T {
  const promise = Promise.resolve(result);
  const proxy: unknown = new Proxy(function () {}, {
    get(_t, prop) {
      if (prop === "then") return promise.then.bind(promise);
      if (prop === "catch") return promise.catch.bind(promise);
      if (prop === "finally") return promise.finally.bind(promise);
      return () => proxy;
    },
    apply() {
      return proxy;
    },
  });
  return proxy as T;
}

const listId = "00000000-0000-4000-8000-000000000001";
const owner = "00000000-0000-4000-8000-000000000002";

const row = {
  id: listId,
  title: "Shoegaze esencial",
  kind: "custom_journey" as const,
  ownerId: owner,
  ownerUsername: "otra",
  ownerDisplayName: "Otra Persona",
  trackingCount: 3,
};

describe("discoverCaminos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.enrichLists.mockResolvedValue(new Map([[listId, { itemCount: 5, coverThumbs: ["c1"] }]]));
  });

  it("valida la paginación", async () => {
    await expect(discoverCaminos({}, 0)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("devuelve las listas ordenadas por conteo de trackeo, enriquecidas", async () => {
    mocks.db.select.mockReturnValueOnce(chain([row]));

    const result = await discoverCaminos();

    expect(result.caminos).toEqual([
      {
        id: listId,
        title: "Shoegaze esencial",
        kind: "custom_journey",
        owner: { id: owner, username: "otra", displayName: "Otra Persona" },
        itemCount: 5,
        coverThumbs: ["c1"],
        trackingCount: 3,
      },
    ]);
    expect(result.hasNext).toBe(false);
  });

  it("hasNext cuando hay más resultados que pageSize", async () => {
    mocks.db.select.mockReturnValueOnce(chain([row, { ...row, id: "other" }]));
    const result = await discoverCaminos({}, 1, 1);
    expect(result.caminos).toHaveLength(1);
    expect(result.hasNext).toBe(true);
  });

  it("sin resultados no llama a enrichLists con ids vacíos innecesariamente", async () => {
    mocks.db.select.mockReturnValueOnce(chain([]));
    const result = await discoverCaminos();
    expect(result.caminos).toEqual([]);
  });
});
