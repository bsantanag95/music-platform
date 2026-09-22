import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addAlbumToCamino,
  archiveCamino,
  createCamino,
  deleteCamino,
  getOwnedCamino,
  getUserCaminoDetail,
  listMyCaminos,
  listVisibleCaminos,
  removeAlbumFromCamino,
  unarchiveCamino,
} from "./camino";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn() },
  resolveNewContentAudience: vi.fn(async () => "followers"),
  normalizeTitle: vi.fn((t: string) => t.trim()),
  normalizeDescription: vi.fn((d: string | null) => d),
  resolveListTarget: vi.fn(async (type: string, id: string) => ({ type, id })),
  enrichLists: vi.fn(async () => new Map()),
  countsByListId: vi.fn(async () => new Map()),
  deriveJourneyState: vi.fn(() => "in_progress"),
  listenedReleaseGroupIds: vi.fn(async () => new Set<string>()),
  audiencesForProfile: vi.fn(() => ["public"]),
  getProfileByUsername: vi.fn(),
  savedStateFor: vi.fn(async () => new Map()),
}));

vi.mock("@/db", () => ({ db: mocks.db }));
vi.mock("@/services/social/default-audience", () => ({
  resolveNewContentAudience: mocks.resolveNewContentAudience,
}));
vi.mock("@/services/lists/lists", () => ({
  normalizeTitle: mocks.normalizeTitle,
  normalizeDescription: mocks.normalizeDescription,
  resolveListTarget: mocks.resolveListTarget,
  enrichLists: mocks.enrichLists,
}));
vi.mock("@/services/journeys/progress", () => ({
  countsByListId: mocks.countsByListId,
  deriveJourneyState: mocks.deriveJourneyState,
  listenedReleaseGroupIds: mocks.listenedReleaseGroupIds,
}));
vi.mock("@/services/social/visibility", () => ({
  audiencesForProfile: mocks.audiencesForProfile,
}));
vi.mock("@/services/social/profiles", () => ({
  getProfileByUsername: mocks.getProfileByUsername,
}));
vi.mock("@/services/lists/saved-lists", () => ({
  savedStateFor: mocks.savedStateFor,
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

const ownerId = "00000000-0000-4000-8000-000000000001";
const caminoId = "00000000-0000-4000-8000-000000000002";
const releaseGroupId = "00000000-0000-4000-8000-000000000003";

const caminoRow = {
  id: caminoId,
  ownerId,
  title: "Shoegaze esencial",
  description: null,
  audience: "followers",
  journeyArchivedAt: null as Date | null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

/** Prepara los selects de `getOwnedCamino`/`buildDetail`: fila + álbumes. */
function mockOwnedCamino(row: unknown, albums: unknown[] = []) {
  mocks.db.select.mockReturnValueOnce(chain([row])).mockReturnValueOnce(chain(albums));
}

describe("servicio de Camino", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveNewContentAudience.mockResolvedValue("followers");
    mocks.deriveJourneyState.mockReturnValue("in_progress");
    mocks.listenedReleaseGroupIds.mockResolvedValue(new Set());
    mocks.audiencesForProfile.mockReturnValue(["public"]);
    mocks.getProfileByUsername.mockResolvedValue({ id: ownerId, username: "otra" });
    mocks.savedStateFor.mockResolvedValue(new Map());
    mocks.countsByListId.mockResolvedValue(new Map());
    mocks.enrichLists.mockResolvedValue(new Map());
  });

  describe("createCamino", () => {
    it("crea con kind='custom_journey' y entityType fijo a release-group", async () => {
      let inserted: unknown;
      mocks.db.insert.mockReturnValue(chain([caminoRow]));
      mocks.db.insert.mockImplementationOnce(() => ({
        values: (v: unknown) => {
          inserted = v;
          return chain([caminoRow]);
        },
      }));
      mocks.db.select.mockReturnValue(chain([]));

      await createCamino(ownerId, { title: "Shoegaze esencial" });

      expect(inserted).toMatchObject({
        ownerId,
        entityType: "release-group",
        kind: "custom_journey",
      });
      expect(mocks.resolveNewContentAudience).toHaveBeenCalledWith(ownerId, "list", undefined);
    });
  });

  describe("getOwnedCamino", () => {
    it("lanza CAMINO_NOT_FOUND cuando no existe o no es propio", async () => {
      mocks.db.select.mockReturnValueOnce(chain([]));
      await expect(getOwnedCamino(caminoId, ownerId)).rejects.toMatchObject({
        code: "CAMINO_NOT_FOUND",
        status: 404,
      });
    });

    it("devuelve el detalle con progreso derivado de los álbumes actuales", async () => {
      const albums = [
        { id: releaseGroupId, title: "Loveless", coverThumbUrl: null },
        { id: "00000000-0000-4000-8000-000000000004", title: "Souvlaki", coverThumbUrl: null },
      ];
      mockOwnedCamino(caminoRow, albums);
      mocks.listenedReleaseGroupIds.mockResolvedValueOnce(new Set([releaseGroupId]));

      const detail = await getOwnedCamino(caminoId, ownerId);

      expect(detail.progress).toEqual({ selectedCount: 2, listenedCount: 1 });
      expect(detail.albums.find((a) => a.id === releaseGroupId)?.listened).toBe(true);
      expect(mocks.listenedReleaseGroupIds).toHaveBeenCalledWith(
        ownerId,
        expect.arrayContaining([releaseGroupId]),
      );
    });
  });

  describe("addAlbumToCamino", () => {
    it("agrega el álbum de forma idempotente vía onConflictDoNothing", async () => {
      mocks.db.select.mockReturnValueOnce(chain([caminoRow])); // requireOwnedCamino
      mocks.db.select.mockReturnValueOnce(chain([{ max: 2 }])); // maxPos
      let conflictTarget: unknown;
      mocks.db.insert.mockReturnValueOnce({
        values: () => ({
          onConflictDoNothing: (opts: { target: unknown }) => {
            conflictTarget = opts.target;
            return chain([{ id: "item-1" }]);
          },
        }),
      });
      mocks.db.update.mockReturnValue(chain(undefined));
      mockOwnedCamino(caminoRow, []); // getOwnedCamino tras el alta

      await addAlbumToCamino(caminoId, ownerId, releaseGroupId);

      expect(mocks.resolveListTarget).toHaveBeenCalledWith("release-group", releaseGroupId);
      expect(conflictTarget).toBeDefined();
    });

    it("un álbum ya presente no dispara el update de recencia", async () => {
      mocks.db.select.mockReturnValueOnce(chain([caminoRow]));
      mocks.db.select.mockReturnValueOnce(chain([{ max: 1 }]));
      mocks.db.insert.mockReturnValueOnce({
        values: () => ({ onConflictDoNothing: () => chain([]) }), // sin filas: ya existía
      });
      mockOwnedCamino(caminoRow, []);

      await addAlbumToCamino(caminoId, ownerId, releaseGroupId);

      expect(mocks.db.update).not.toHaveBeenCalled();
    });

    it("sobre un Camino ajeno responde CAMINO_NOT_FOUND", async () => {
      mocks.db.select.mockReturnValueOnce(chain([]));
      await expect(addAlbumToCamino(caminoId, ownerId, releaseGroupId)).rejects.toMatchObject({
        code: "CAMINO_NOT_FOUND",
      });
    });
  });

  describe("removeAlbumFromCamino", () => {
    it("quita el álbum y no falla si no estaba", async () => {
      mocks.db.select.mockReturnValueOnce(chain([caminoRow]));
      mocks.db.delete.mockReturnValue(chain(undefined));
      mockOwnedCamino(caminoRow, []);

      await expect(removeAlbumFromCamino(caminoId, ownerId, releaseGroupId)).resolves.toBeDefined();
      expect(mocks.db.delete).toHaveBeenCalled();
    });
  });

  describe("archivar / desarchivar", () => {
    it("archiveCamino fija journeyArchivedAt", async () => {
      mocks.db.select.mockReturnValueOnce(chain([caminoRow]));
      let updatedSet: unknown;
      mocks.db.update.mockReturnValueOnce({
        set: (v: unknown) => {
          updatedSet = v;
          return { where: () => ({ returning: () => chain([{ ...caminoRow, journeyArchivedAt: new Date() }]) }) };
        },
      });
      mocks.db.select.mockReturnValueOnce(chain([])); // álbumes del detalle

      await archiveCamino(caminoId, ownerId);

      expect(updatedSet).toHaveProperty("journeyArchivedAt");
    });

    it("archivar un Camino ajeno responde CAMINO_NOT_FOUND", async () => {
      mocks.db.select.mockReturnValueOnce(chain([]));
      await expect(archiveCamino(caminoId, ownerId)).rejects.toMatchObject({
        code: "CAMINO_NOT_FOUND",
      });
    });
  });

  describe("deleteCamino", () => {
    it("borra un Camino propio", async () => {
      mocks.db.select.mockReturnValueOnce(chain([caminoRow]));
      mocks.db.delete.mockReturnValue(chain(undefined));
      await expect(deleteCamino(caminoId, ownerId)).resolves.toBeUndefined();
      expect(mocks.db.delete).toHaveBeenCalled();
    });

    it("borrar un Camino ajeno responde CAMINO_NOT_FOUND y no borra nada", async () => {
      mocks.db.select.mockReturnValueOnce(chain([]));
      await expect(deleteCamino(caminoId, ownerId)).rejects.toMatchObject({
        code: "CAMINO_NOT_FOUND",
      });
      expect(mocks.db.delete).not.toHaveBeenCalled();
    });
  });

  describe("listMyCaminos", () => {
    it("devuelve vacío sin consultar progreso cuando no hay Caminos", async () => {
      mocks.db.select.mockReturnValueOnce(chain([]));
      const result = await listMyCaminos(ownerId);
      expect(result).toEqual([]);
      expect(mocks.countsByListId).not.toHaveBeenCalled();
    });

    it("compone estado y progreso por cada Camino", async () => {
      mocks.db.select.mockReturnValueOnce(chain([caminoRow]));
      mocks.countsByListId.mockResolvedValueOnce(new Map([[caminoId, { selected: 3, listened: 3 }]]));
      mocks.deriveJourneyState.mockReturnValueOnce("complete");

      const result = await listMyCaminos(ownerId);

      expect(result).toEqual([
        expect.objectContaining({
          id: caminoId,
          state: "complete",
          progress: { selectedCount: 3, listenedCount: 3 },
        }),
      ]);
    });
  });

  describe("getUserCaminoDetail", () => {
    it("devuelve el detalle cuando la audiencia es visible", async () => {
      mockOwnedCamino(caminoRow, []);
      const detail = await getUserCaminoDetail(caminoId, ownerId, ["public", "followers"]);
      expect(detail.id).toBe(caminoId);
    });

    it("sin audiencias visibles, responde CAMINO_NOT_FOUND sin consultar la base", async () => {
      await expect(getUserCaminoDetail(caminoId, ownerId, [])).rejects.toMatchObject({
        code: "CAMINO_NOT_FOUND",
      });
      expect(mocks.db.select).not.toHaveBeenCalled();
    });

    it("Camino inexistente o no visible responde CAMINO_NOT_FOUND", async () => {
      mocks.db.select.mockReturnValueOnce(chain([]));
      await expect(getUserCaminoDetail(caminoId, ownerId, ["public"])).rejects.toMatchObject({
        code: "CAMINO_NOT_FOUND",
      });
    });
  });

  describe("listVisibleCaminos", () => {
    it("valida la paginación", async () => {
      await expect(listVisibleCaminos("otra", null, 0)).rejects.toMatchObject({
        code: "VALIDATION_ERROR",
      });
    });

    it("sin audiencias visibles, devuelve vacío sin consultar user_list", async () => {
      mocks.audiencesForProfile.mockReturnValue([]);
      const result = await listVisibleCaminos("otra", "viewer-1");
      expect(result).toEqual({ caminos: [], page: 1, pageSize: 20, totalCount: 0 });
      expect(mocks.db.select).not.toHaveBeenCalled();
    });

    it("devuelve los Caminos visibles con progreso propio del dueño y tracking del visitante", async () => {
      mocks.db.select
        .mockReturnValueOnce(chain([caminoRow]))
        .mockReturnValueOnce(chain([{ n: 1 }]));
      mocks.countsByListId.mockResolvedValueOnce(new Map([[caminoId, { selected: 4, listened: 2 }]]));
      mocks.enrichLists.mockResolvedValueOnce(
        new Map([[caminoId, { itemCount: 4, coverThumbs: ["c1"] }]]),
      );
      mocks.savedStateFor.mockResolvedValueOnce(
        new Map([[caminoId, { saved: true, following: false, tracking: true }]]),
      );

      const result = await listVisibleCaminos("otra", "viewer-1", 1, 20);

      expect(mocks.countsByListId).toHaveBeenCalledWith(ownerId, [caminoId]);
      expect(mocks.savedStateFor).toHaveBeenCalledWith("viewer-1", [caminoId]);
      expect(result).toEqual({
        caminos: [
          {
            id: caminoId,
            title: caminoRow.title,
            state: "in_progress",
            progress: { selectedCount: 4, listenedCount: 2 },
            itemCount: 4,
            coverThumbs: ["c1"],
            tracking: true,
          },
        ],
        page: 1,
        pageSize: 20,
        totalCount: 1,
      });
    });

    it("sin sesión, no consulta el tracking del visitante", async () => {
      mocks.db.select.mockReturnValueOnce(chain([caminoRow])).mockReturnValueOnce(chain([{ n: 1 }]));
      const result = await listVisibleCaminos("otra", null);
      expect(mocks.savedStateFor).not.toHaveBeenCalled();
      expect(result.caminos[0]?.tracking).toBe(false);
    });
  });

  describe("unarchiveCamino", () => {
    it("limpia journeyArchivedAt", async () => {
      mocks.db.select.mockReturnValueOnce(chain([{ ...caminoRow, journeyArchivedAt: new Date() }]));
      let updatedSet: unknown;
      mocks.db.update.mockReturnValueOnce({
        set: (v: unknown) => {
          updatedSet = v;
          return { where: () => ({ returning: () => chain([caminoRow]) }) };
        },
      });
      mocks.db.select.mockReturnValueOnce(chain([]));

      await unarchiveCamino(caminoId, ownerId);

      expect(updatedSet).toEqual({ journeyArchivedAt: null });
    });
  });
});
