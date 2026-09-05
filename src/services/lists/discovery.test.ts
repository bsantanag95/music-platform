import { beforeEach, describe, expect, it, vi } from "vitest";
import { listDiscoverLists } from "./discovery";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn() },
  enrichLists: vi.fn(),
  savedStateFor: vi.fn(),
}));

vi.mock("@/db", () => ({ db: mocks.db }));
vi.mock("./lists", () => ({ enrichLists: mocks.enrichLists }));
vi.mock("./saved-lists", () => ({ savedStateFor: mocks.savedStateFor }));

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

const reader = "00000000-0000-4000-8000-000000000001";
const listId = "00000000-0000-4000-8000-000000000003";

const discoverRow = {
  id: listId,
  entityType: "release-group",
  title: "Lo mejor de 2026",
  description: "una nota",
  createdAt: new Date("2026-03-01T00:00:00Z"),
  updatedAt: new Date("2026-03-01T00:00:00Z"),
  ownerId: "00000000-0000-4000-8000-000000000002",
  ownerUsername: "curador",
  ownerDisplayName: null,
};

describe("servicio de descubrir listas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.enrichLists.mockResolvedValue(new Map([[listId, { itemCount: 12, coverThumbs: ["a", "b"] }]]));
    mocks.savedStateFor.mockResolvedValue(new Map());
  });

  it("devuelve listas públicas recientes con enriquecimiento", async () => {
    mocks.db.select.mockReturnValueOnce(chain([discoverRow]));
    const result = await listDiscoverLists(reader);
    expect(result.lists).toHaveLength(1);
    expect(result.lists[0]?.itemCount).toBe(12);
    expect(result.lists[0]?.coverThumbs).toEqual(["a", "b"]);
    expect(result.lists[0]?.owner.username).toBe("curador");
    expect(result.lists[0]?.saved).toBe(false);
  });

  it("refleja el estado de guardado del lector", async () => {
    mocks.db.select.mockReturnValueOnce(chain([discoverRow]));
    mocks.savedStateFor.mockResolvedValue(new Map([[listId, { saved: true, following: true }]]));
    const result = await listDiscoverLists(reader);
    expect(result.lists[0]?.saved).toBe(true);
    expect(result.lists[0]?.following).toBe(true);
  });

  it("marca hasNext cuando hay más de una página", async () => {
    const many = Array.from({ length: 21 }, (_, i) => ({ ...discoverRow, id: `${listId}-${i}` }));
    mocks.db.select.mockReturnValueOnce(chain(many));
    mocks.enrichLists.mockResolvedValue(new Map());
    const result = await listDiscoverLists(reader, 1, 20);
    expect(result.lists).toHaveLength(20);
    expect(result.hasNext).toBe(true);
  });

  it("valida la paginación", async () => {
    await expect(listDiscoverLists(reader, 0)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(listDiscoverLists(reader, 1, 999)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("devuelve vacío sin listas públicas", async () => {
    mocks.db.select.mockReturnValueOnce(chain([]));
    const result = await listDiscoverLists(reader);
    expect(result.lists).toEqual([]);
    expect(result.hasNext).toBe(false);
  });
});
