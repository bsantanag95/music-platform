import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  followedListIds,
  listSavedLists,
  listTrackedLists,
  saveList,
  savedStateFor,
  setListTracking,
  unsaveList,
} from "./saved-lists";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn(), insert: vi.fn(), delete: vi.fn() },
  relationsFor: vi.fn(),
  enrichLists: vi.fn(),
  countsByListId: vi.fn(async () => new Map()),
  deriveJourneyState: vi.fn(() => "in_progress"),
}));

vi.mock("@/db", () => ({ db: mocks.db }));
vi.mock("@/services/social/relations", () => ({ relationsFor: mocks.relationsFor }));
vi.mock("./lists", () => ({ enrichLists: mocks.enrichLists }));
vi.mock("@/services/journeys/progress", () => ({
  countsByListId: mocks.countsByListId,
  deriveJourneyState: mocks.deriveJourneyState,
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

const saver = "00000000-0000-4000-8000-000000000001";
const owner = "00000000-0000-4000-8000-000000000002";
const listId = "00000000-0000-4000-8000-000000000003";

const savedJoinRow = {
  following: false,
  tracking: false,
  id: listId,
  entityType: "release-group",
  title: "Discos que me cambiaron",
  description: null,
  audience: "public",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-02T00:00:00Z"),
  ownerId: owner,
  ownerUsername: "otra",
  ownerDisplayName: "Otra Persona",
  ownerVisibility: "public",
};

describe("servicio de listas guardadas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.relationsFor.mockResolvedValue(new Map([[owner, "none"]]));
    mocks.enrichLists.mockResolvedValue(new Map([[listId, { itemCount: 4, coverThumbs: ["c1"] }]]));
  });

  it("guarda una lista pública ajena visible", async () => {
    mocks.db.select
      // fila de la lista + dueño
      .mockReturnValueOnce(
        chain([{ id: listId, ownerId: owner, audience: "public", ownerVisibility: "public" }]),
      )
      // buildSavedSummaries
      .mockReturnValueOnce(chain([savedJoinRow]));
    mocks.db.insert.mockReturnValue(chain(undefined));

    const result = await saveList(saver, listId, true);
    expect(result.id).toBe(listId);
    expect(result.owner.username).toBe("otra");
    expect(result.itemCount).toBe(4);
    expect(result.unavailable).toBe(false);
  });

  it("rechaza guardar la propia lista", async () => {
    mocks.db.select.mockReturnValueOnce(
      chain([{ id: listId, ownerId: saver, audience: "public", ownerVisibility: "public" }]),
    );
    await expect(saveList(saver, listId)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("responde LIST_NOT_FOUND si la lista no existe", async () => {
    mocks.db.select.mockReturnValueOnce(chain([]));
    await expect(saveList(saver, listId)).rejects.toMatchObject({ code: "LIST_NOT_FOUND" });
  });

  it("responde LIST_NOT_FOUND si la lista no es visible para el lector", async () => {
    mocks.db.select.mockReturnValueOnce(
      chain([{ id: listId, ownerId: owner, audience: "followers", ownerVisibility: "public" }]),
    );
    // relation "none" → solo audiencia public visible
    await expect(saveList(saver, listId)).rejects.toMatchObject({ code: "LIST_NOT_FOUND" });
  });

  it("unsaveList es idempotente", async () => {
    mocks.db.delete.mockReturnValue(chain(undefined));
    await expect(unsaveList(saver, listId)).resolves.toBeUndefined();
  });

  it("listSavedLists marca unavailable cuando la lista dejó de ser visible", async () => {
    mocks.db.select.mockReturnValueOnce(
      chain([{ ...savedJoinRow, audience: "followers" }]),
    );
    mocks.relationsFor.mockResolvedValue(new Map([[owner, "none"]]));
    const result = await listSavedLists(saver);
    expect(result.lists[0]?.unavailable).toBe(true);
  });

  it("listSavedLists valida la paginación", async () => {
    await expect(listSavedLists(saver, 0)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("followedListIds devuelve solo las seguidas", async () => {
    mocks.db.select.mockReturnValueOnce(chain([{ listId }]));
    expect(await followedListIds(saver)).toEqual([listId]);
  });

  it("savedStateFor mapea el estado por lista", async () => {
    mocks.db.select.mockReturnValueOnce(chain([{ listId, following: true, tracking: false }]));
    const state = await savedStateFor(saver, [listId]);
    expect(state.get(listId)).toEqual({ saved: true, following: true, tracking: false });
  });

  describe("setListTracking", () => {
    it("activa tracking sin tocar following en el upsert", async () => {
      mocks.db.select
        .mockReturnValueOnce(
          chain([
            {
              id: listId,
              ownerId: owner,
              entityType: "release-group",
              audience: "public",
              ownerVisibility: "public",
            },
          ]),
        )
        .mockReturnValueOnce(chain([savedJoinRow]));
      let conflictSet: unknown;
      let insertValues: unknown;
      mocks.db.insert.mockReturnValueOnce({
        values: (v: unknown) => {
          insertValues = v;
          return {
            onConflictDoUpdate: (opts: { set: unknown }) => {
              conflictSet = opts.set;
              return chain(undefined);
            },
          };
        },
      });

      await setListTracking(saver, listId, true);

      expect(insertValues).toMatchObject({ saverId: saver, listId, following: false, tracking: true });
      expect(conflictSet).toEqual({ tracking: true });
    });

    it("rechaza trackear una lista que no es de álbumes", async () => {
      mocks.db.select.mockReturnValueOnce(
        chain([
          {
            id: listId,
            ownerId: owner,
            entityType: "artist",
            audience: "public",
            ownerVisibility: "public",
          },
        ]),
      );
      await expect(setListTracking(saver, listId, true)).rejects.toMatchObject({
        code: "VALIDATION_ERROR",
      });
    });

    it("rechaza trackear la propia lista", async () => {
      mocks.db.select.mockReturnValueOnce(
        chain([
          {
            id: listId,
            ownerId: saver,
            entityType: "release-group",
            audience: "public",
            ownerVisibility: "public",
          },
        ]),
      );
      await expect(setListTracking(saver, listId, true)).rejects.toMatchObject({
        code: "VALIDATION_ERROR",
      });
    });

    it("responde LIST_NOT_FOUND si la lista no es visible", async () => {
      mocks.db.select.mockReturnValueOnce(
        chain([
          {
            id: listId,
            ownerId: owner,
            entityType: "release-group",
            audience: "followers",
            ownerVisibility: "public",
          },
        ]),
      );
      await expect(setListTracking(saver, listId, true)).rejects.toMatchObject({
        code: "LIST_NOT_FOUND",
      });
    });
  });

  describe("listTrackedLists", () => {
    it("devuelve vacío sin consultar progreso cuando no hay trackeos", async () => {
      mocks.db.select.mockReturnValueOnce(chain([]));
      const result = await listTrackedLists(saver);
      expect(result).toEqual([]);
      expect(mocks.countsByListId).not.toHaveBeenCalled();
    });

    it("compone estado y progreso por lista trackeada, contra el diario de quien trackea", async () => {
      mocks.db.select.mockReturnValueOnce(
        chain([
          {
            listId,
            title: "Discos que me cambiaron",
            kind: "custom_journey",
            updatedAt: new Date("2026-01-02T00:00:00Z"),
            ownerId: owner,
            ownerUsername: "otra",
            ownerDisplayName: "Otra Persona",
          },
        ]),
      );
      mocks.countsByListId.mockResolvedValueOnce(new Map([[listId, { selected: 4, listened: 2 }]]));

      const result = await listTrackedLists(saver);

      expect(mocks.countsByListId).toHaveBeenCalledWith(saver, [listId]);
      expect(mocks.enrichLists).toHaveBeenCalledWith([listId]);
      expect(result).toEqual([
        expect.objectContaining({
          id: listId,
          kind: "custom_journey",
          owner: { id: owner, username: "otra", displayName: "Otra Persona" },
          progress: { selectedCount: 4, listenedCount: 2 },
          coverThumbUrl: "c1",
        }),
      ]);
    });
  });
});
