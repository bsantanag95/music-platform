import { beforeEach, describe, expect, it, vi } from "vitest";
import { listFeaturedLists, listPopularLists, listsFromFollowing } from "./community";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn() },
  enrichLists: vi.fn(),
  savedStateFor: vi.fn(),
  saveCountsFor: vi.fn(),
}));

vi.mock("@/db", () => ({ db: mocks.db }));
vi.mock("./lists", () => ({ enrichLists: mocks.enrichLists }));
vi.mock("./saved-lists", () => ({
  savedStateFor: mocks.savedStateFor,
  saveCountsFor: mocks.saveCountsFor,
}));

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

const row = {
  id: listId,
  entityType: "release-group",
  title: "Esenciales",
  description: null,
  createdAt: new Date("2026-03-01T00:00:00Z"),
  updatedAt: new Date("2026-03-01T00:00:00Z"),
  ownerId: "00000000-0000-4000-8000-000000000002",
  ownerUsername: "curador",
  ownerDisplayName: null,
};

describe("servicio de listas de la comunidad", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.enrichLists.mockResolvedValue(
      new Map([[listId, { itemCount: 5, coverThumbs: ["a"] }]]),
    );
    mocks.savedStateFor.mockResolvedValue(new Map());
    mocks.saveCountsFor.mockResolvedValue(new Map([[listId, 7]]));
  });

  it("Destacadas: enriquece sin paginar", async () => {
    mocks.db.select.mockReturnValueOnce(chain([row]));
    const result = await listFeaturedLists(reader);
    expect(result.lists).toHaveLength(1);
    expect(result.lists[0]?.itemCount).toBe(5);
    expect(result.lists[0]?.saveCount).toBeUndefined();
  });

  it("Populares: adjunta el conteo agregado de guardados", async () => {
    mocks.db.select.mockReturnValueOnce(chain([{ ...row, saves: 7 }]));
    const result = await listPopularLists(reader, 1, 20);
    expect(result.lists[0]?.saveCount).toBe(7);
    expect(mocks.saveCountsFor).toHaveBeenCalled();
  });

  it("Populares: valida la paginación", async () => {
    await expect(listPopularLists(reader, 0)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("De seguidos: sin lector responde AUTH_REQUIRED", async () => {
    await expect(
      listsFromFollowing("" as unknown as string),
    ).rejects.toMatchObject({ code: "AUTH_REQUIRED" });
  });

  it("De seguidos: mapea filas y marca hasNext", async () => {
    const many = Array.from({ length: 21 }, (_, i) => ({ ...row, id: `${listId}-${i}` }));
    mocks.db.select.mockReturnValueOnce(chain(many));
    mocks.enrichLists.mockResolvedValue(new Map());
    const result = await listsFromFollowing(reader, 1, 20);
    expect(result.lists).toHaveLength(20);
    expect(result.hasNext).toBe(true);
  });
});
