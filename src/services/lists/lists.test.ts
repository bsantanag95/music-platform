import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createList,
  deleteList,
  getOwnedList,
  getUserListDetail,
  listMyLists,
  listUserLists,
  pinList,
  unpinList,
  updateList,
  addItemToList,
  removeItemFromList,
  reorderListItems,
  resolveListTarget,
  type ListTarget,
} from "./lists";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn(), transaction: vi.fn() },
  getProfileByUsername: vi.fn(),
}));

vi.mock("@/db", () => ({ db: mocks.db }));
vi.mock("@/services/social/profiles", () => ({
  getProfileByUsername: mocks.getProfileByUsername,
}));

// Proxy encadenable: cualquier método (`.from`, `.leftJoin`, `.where`,
// `.orderBy`, `.limit`, `.offset`, `.groupBy`, `.returning`, ...) devuelve el
// mismo proxy, y hacer `await` en cualquier punto resuelve `result`. Evita
// rehacer una cadena de mocks a mano por cada forma de query.
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

const owner = "00000000-0000-4000-8000-000000000001";
const target: ListTarget = { type: "artist", id: "00000000-0000-4000-8000-000000000002" };

const listRow = {
  id: "00000000-0000-4000-8000-000000000003",
  ownerId: owner,
  entityType: "artist",
  title: "Favoritos de los 80",
  description: null,
  audience: "followers",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

const albumListRow = { ...listRow, entityType: "release-group", title: "Discos que me cambiaron" };

/** Prepara los mocks de `select` para un `getOwnedList`: fila + ítems + pin. */
function mockOwnedList(row: unknown, items: unknown[] = [], pinned = false) {
  mocks.db.select
    .mockReturnValueOnce(chain([row]))
    .mockReturnValueOnce(chain(items))
    .mockReturnValueOnce(chain(pinned ? [{ listId: (row as { id: string }).id }] : []));
}

describe("servicio de listas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resuelve el objetivo y rechaza uno inexistente con LIST_TARGET_INVALID", async () => {
    mocks.db.select.mockReturnValue(chain([{ id: target.id }]));
    const resolved = await resolveListTarget("artist", target.id);
    expect(resolved.type).toBe("artist");

    mocks.db.select.mockReturnValue(chain([]));
    await expect(resolveListTarget("artist", target.id)).rejects.toMatchObject({
      code: "LIST_TARGET_INVALID",
      status: 404,
    });
  });

  it("crea una lista válida y normaliza título y descripción", async () => {
    mocks.db.insert.mockReturnValue(chain([listRow]));
    mockOwnedList(listRow);

    const result = await createList({ ownerId: owner, entityType: "artist", title: "  Favoritos de los 80  " });
    expect(result.title).toBe("Favoritos de los 80");
    expect(result.entityType).toBe("artist");
    expect(result.audience).toBe("followers");
    expect(result.items).toEqual([]);
    expect(result.itemCount).toBe(0);
    expect(result.coverThumbs).toEqual([]);
    expect(result.pinned).toBe(false);
  });

  it("rechaza título vacío", async () => {
    await expect(createList({ ownerId: owner, entityType: "artist", title: "   " })).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it("rechaza descripción demasiado larga", async () => {
    await expect(
      createList({ ownerId: owner, entityType: "artist", title: "ok", description: "x".repeat(501) }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("getOwnedList devuelve 404 para lista ajena", async () => {
    mocks.db.select.mockReturnValue(chain([]));
    await expect(getOwnedList(listRow.id, "otro")).rejects.toMatchObject({
      code: "LIST_NOT_FOUND",
      status: 404,
    });
  });

  it("getOwnedList devuelve el detalle con conteo, carátulas y estado de fijado", async () => {
    mockOwnedList(
      albumListRow,
      [
        {
          id: "i1",
          position: 1,
          artistId: null,
          releaseGroupId: "rg1",
          recordingId: null,
          artistName: null,
          releaseTitle: "A",
          releaseCover: "http://c/1",
          recordingTitle: null,
        },
        {
          id: "i2",
          position: 2,
          artistId: null,
          releaseGroupId: "rg2",
          recordingId: null,
          artistName: null,
          releaseTitle: "B",
          releaseCover: null,
          recordingTitle: null,
        },
      ],
      true,
    );
    const result = await getOwnedList(albumListRow.id, owner);
    expect(result.itemCount).toBe(2);
    expect(result.coverThumbs).toEqual(["http://c/1"]);
    expect(result.pinned).toBe(true);
  });

  it("enriquece los ítems con artista acreditado y carátula representativa de canción", async () => {
    const songListRow = { ...listRow, entityType: "recording", title: "Temas del año" };
    mockOwnedList(songListRow, [
      {
        id: "i1",
        position: 1,
        artistId: null,
        releaseGroupId: "rg1",
        recordingId: null,
        artistName: null,
        releaseTitle: "Rumours",
        releaseCover: "http://c/rumours",
        recordingTitle: null,
        creditedArtist: "Fleetwood Mac",
        songCover: null,
      },
      {
        id: "i2",
        position: 2,
        artistId: null,
        releaseGroupId: null,
        recordingId: "rec1",
        artistName: null,
        releaseTitle: null,
        releaseCover: null,
        recordingTitle: "Dreams",
        creditedArtist: "Fleetwood Mac",
        songCover: "http://c/song",
      },
      {
        id: "i3",
        position: 3,
        artistId: null,
        releaseGroupId: null,
        recordingId: "rec2",
        artistName: null,
        releaseTitle: null,
        releaseCover: null,
        recordingTitle: "Rara",
        creditedArtist: null,
        songCover: null,
      },
    ]);
    const result = await getOwnedList(songListRow.id, owner);
    expect(result.items[0]?.target.artistName).toBe("Fleetwood Mac");
    expect(result.items[1]?.target).toMatchObject({
      title: "Dreams",
      artistName: "Fleetwood Mac",
      coverThumbUrl: "http://c/song",
    });
    expect(result.items[2]?.target.coverThumbUrl).toBeNull();
    // coverThumbs del detalle combina la del álbum y la representativa de canción
    expect(result.coverThumbs).toEqual(["http://c/rumours", "http://c/song"]);
  });

  it("updateList valida que haya al menos un campo", async () => {
    await expect(updateList(listRow.id, owner, {})).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it("updateList actualiza audiencia y rechaza lista ajena", async () => {
    mocks.db.update.mockReturnValue(chain([{ ...listRow, audience: "public" }]));
    mockOwnedList({ ...listRow, audience: "public" });

    const result = await updateList(listRow.id, owner, { audience: "public" });
    expect(result.audience).toBe("public");

    mocks.db.update.mockReturnValue(chain([]));
    await expect(updateList(listRow.id, "ajeno", { audience: "public" })).rejects.toMatchObject({
      code: "LIST_NOT_FOUND",
    });
  });

  it("deleteList borra solo listas propias", async () => {
    mocks.db.delete.mockReturnValue(chain([{ id: listRow.id }]));
    await expect(deleteList(listRow.id, owner)).resolves.toBeUndefined();

    mocks.db.delete.mockReturnValue(chain([]));
    await expect(deleteList(listRow.id, "ajeno")).rejects.toMatchObject({ code: "LIST_NOT_FOUND" });
  });

  it("listMyLists pagina, enriquece y valida paginación", async () => {
    mocks.db.select
      // página de listas (join con pin)
      .mockReturnValueOnce(chain([{ list: albumListRow, pinnedAt: new Date("2026-02-01T00:00:00Z") }]))
      // enrichLists: conteos
      .mockReturnValueOnce(chain([{ listId: albumListRow.id, n: 3 }]))
      // enrichLists: carátulas
      .mockReturnValueOnce(
        chain([
          { listId: albumListRow.id, cover: "http://c/1", rn: 1 },
          { listId: albumListRow.id, cover: "http://c/2", rn: 2 },
        ]),
      );
    const result = await listMyLists(owner);
    expect(result.lists.length).toBe(1);
    expect(result.lists[0]?.itemCount).toBe(3);
    expect(result.lists[0]?.coverThumbs).toEqual(["http://c/1", "http://c/2"]);
    expect(result.lists[0]?.pinned).toBe(true);

    await expect(listMyLists(owner, 0)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("listMyLists rechaza sort y entityType inválidos", async () => {
    await expect(
      listMyLists(owner, 1, 20, { sort: "loco" as never }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(
      listMyLists(owner, 1, 20, { entityType: "cancion" as never }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("listMyLists acepta búsqueda, filtro por tipo y orden alfabético", async () => {
    mocks.db.select
      .mockReturnValueOnce(chain([{ list: albumListRow, pinnedAt: null }]))
      .mockReturnValueOnce(chain([]))
      .mockReturnValueOnce(chain([]));
    const result = await listMyLists(owner, 1, 20, {
      q: "  disco ",
      entityType: "release-group",
      sort: "alpha",
    });
    expect(result.lists[0]?.pinned).toBe(false);
    expect(result.lists[0]?.itemCount).toBe(0);
  });

  it("listUserLists devuelve vacío sin permiso", async () => {
    mocks.getProfileByUsername.mockResolvedValue({
      id: "u1",
      profileVisibility: "private",
      relation: "none",
      blockedByMe: false,
    });
    const result = await listUserLists("usuario", owner);
    expect(result.lists).toEqual([]);
  });

  it("listUserLists enriquece las listas visibles", async () => {
    mocks.getProfileByUsername.mockResolvedValue({
      id: "u1",
      profileVisibility: "public",
      relation: "none",
      blockedByMe: false,
    });
    mocks.db.select
      .mockReturnValueOnce(chain([albumListRow]))
      .mockReturnValueOnce(chain([{ listId: albumListRow.id, n: 5 }]))
      .mockReturnValueOnce(chain([{ listId: albumListRow.id, cover: "http://c/1", rn: 1 }]));
    const result = await listUserLists("usuario", owner);
    expect(result.lists[0]?.itemCount).toBe(5);
    expect(result.lists[0]?.coverThumbs).toEqual(["http://c/1"]);
    expect(result.lists[0]?.pinned).toBe(false);
  });

  it("getUserListDetail oculta listas no visibles", async () => {
    mocks.getProfileByUsername.mockResolvedValue({
      id: "u1",
      profileVisibility: "private",
      relation: "none",
      blockedByMe: false,
    });
    await expect(getUserListDetail("usuario", listRow.id, owner)).rejects.toMatchObject({
      code: "LIST_NOT_FOUND",
    });
  });

  it("pinList fija una lista propia y rechaza una ajena", async () => {
    mocks.db.select.mockReturnValueOnce(chain([{ id: listRow.id }]));
    mocks.db.insert.mockReturnValue(chain([]));
    await expect(pinList(listRow.id, owner)).resolves.toBeUndefined();

    mocks.db.select.mockReturnValueOnce(chain([]));
    await expect(pinList(listRow.id, "ajeno")).rejects.toMatchObject({ code: "LIST_NOT_FOUND" });
  });

  it("unpinList desfija una lista propia y rechaza una ajena", async () => {
    mocks.db.select.mockReturnValueOnce(chain([{ id: listRow.id }]));
    mocks.db.delete.mockReturnValue(chain([]));
    await expect(unpinList(listRow.id, owner)).resolves.toBeUndefined();

    mocks.db.select.mockReturnValueOnce(chain([]));
    await expect(unpinList(listRow.id, "ajeno")).rejects.toMatchObject({ code: "LIST_NOT_FOUND" });
  });

  it("addItemToList agrega al final y rechaza tipo distinto", async () => {
    mocks.db.select
      .mockReturnValueOnce(chain([listRow])) // validar lista
      .mockReturnValueOnce(chain([{ id: target.id }])) // resolveListTarget
      .mockReturnValueOnce(chain([{ max: 2 }])); // max position
    mockOwnedList(listRow); // getOwnedList al final
    mocks.db.insert.mockReturnValue(chain([{ id: "i1" }]));

    const result = await addItemToList(listRow.id, owner, target);
    expect(result.id).toBe(listRow.id);

    vi.clearAllMocks();
    mocks.db.select.mockReturnValue(chain([listRow]));
    await expect(addItemToList(listRow.id, owner, { type: "recording", id: target.id })).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it("removeItemFromList elimina el ítem de una lista propia", async () => {
    mocks.db.select.mockReturnValueOnce(chain([{ id: listRow.id }])); // validar lista
    mockOwnedList(listRow);
    mocks.db.delete.mockReturnValue(chain([]));

    const result = await removeItemFromList(listRow.id, "i1", owner);
    expect(result.id).toBe(listRow.id);
  });

  it("reorderListItems reordena dentro de una transacción", async () => {
    mocks.db.select.mockReturnValueOnce(chain([{ id: listRow.id }])); // validar lista
    mockOwnedList(listRow);
    mocks.db.transaction.mockImplementation(async (cb: (tx: unknown) => Promise<void>) => {
      mocks.db.update.mockReturnValue(chain([]));
      await cb(mocks.db);
    });

    const result = await reorderListItems(listRow.id, owner, ["i2", "i1"]);
    expect(result.id).toBe(listRow.id);
    expect(mocks.db.transaction).toHaveBeenCalled();
  });
});
