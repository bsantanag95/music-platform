import { beforeEach, describe, expect, it, vi } from "vitest";
import { listDiscoverLists } from "./discovery";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn() },
  enrichLists: vi.fn(),
  generatedRefsFor: vi.fn(),
  notGeneratedCollectionCondition: vi.fn(() => undefined),
  savedStateFor: vi.fn(),
  saveCountsFor: vi.fn(),
}));

vi.mock("@/db", () => ({ db: mocks.db }));
vi.mock("./lists", () => ({ enrichLists: mocks.enrichLists }));
vi.mock("@/services/discovery/collections/generated", () => ({ generatedRefsFor: mocks.generatedRefsFor }));
vi.mock("@/services/discovery/collections/conditions", () => ({
  notGeneratedCollectionCondition: mocks.notGeneratedCollectionCondition,
}));
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
  isOfficial: false,
};

describe("servicio de descubrir listas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.enrichLists.mockResolvedValue(new Map([[listId, { itemCount: 12, coverThumbs: ["a", "b"] }]]));
    mocks.savedStateFor.mockResolvedValue(new Map());
    mocks.saveCountsFor.mockResolvedValue(new Map([[listId, 7]]));
    mocks.generatedRefsFor.mockResolvedValue(new Map());
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

  it("aplica filtros de texto y tipo sin romper la respuesta", async () => {
    mocks.db.select.mockReturnValueOnce(chain([discoverRow]));
    const result = await listDiscoverLists(reader, 1, 20, {
      q: "  lo mejor  ",
      entityType: "release-group",
    });
    expect(result.lists).toHaveLength(1);
    expect(result.lists[0]?.saveCount).toBeUndefined();
  });

  it("con sort=popular incluye el conteo de guardados", async () => {
    mocks.db.select.mockReturnValueOnce(chain([{ ...discoverRow, saves: 7 }]));
    const result = await listDiscoverLists(reader, 1, 20, { sort: "popular" });
    expect(mocks.saveCountsFor).toHaveBeenCalled();
    expect(result.lists[0]?.saveCount).toBe(7);
  });

  it("expone `generated` en las colecciones generadas y null en las demás (redesign-lists-page, D2)", async () => {
    mocks.generatedRefsFor.mockResolvedValue(new Map([[listId, { templateKey: "grammy-winners", periodKey: "2025" }]]));
    mocks.db.select.mockReturnValueOnce(chain([discoverRow]));
    const result = await listDiscoverLists(reader, 1, 20, { q: "grammy" });
    expect(result.lists[0]?.generated).toEqual({ templateKey: "grammy-winners", periodKey: "2025" });
    expect(mocks.generatedRefsFor).toHaveBeenCalledWith([listId]);

    mocks.generatedRefsFor.mockResolvedValue(new Map());
    mocks.db.select.mockReturnValueOnce(chain([discoverRow]));
    expect((await listDiscoverLists(reader)).lists[0]?.generated).toBeNull();
  });

  it("sin texto excluye las colecciones generadas, también con orden o tipo; con texto las incluye (D3)", async () => {
    for (const filters of [undefined, { sort: "popular" as const }, { entityType: "release-group" as const }]) {
      mocks.notGeneratedCollectionCondition.mockClear();
      mocks.db.select.mockReturnValueOnce(chain([discoverRow]));
      await listDiscoverLists(reader, 1, 20, filters);
      expect(mocks.notGeneratedCollectionCondition).toHaveBeenCalledTimes(1);
    }
    for (const q of ["grammy", "  grammy  "]) {
      mocks.notGeneratedCollectionCondition.mockClear();
      mocks.db.select.mockReturnValueOnce(chain([discoverRow]));
      await listDiscoverLists(reader, 1, 20, { q, sort: "popular" });
      expect(mocks.notGeneratedCollectionCondition).not.toHaveBeenCalled();
    }
  });

  it("rechaza filtros inválidos", async () => {
    await expect(
      listDiscoverLists(reader, 1, 20, { entityType: "album" as never }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(
      listDiscoverLists(reader, 1, 20, { sort: "alpha" as never }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});
