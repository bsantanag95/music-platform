import { describe, expect, it, vi } from "vitest";
import {
  createList,
  deleteList,
  getOwnedList,
  getUserListDetail,
  listMyLists,
  listUserLists,
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

function whereLimit(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where }));
  return { from };
}

// select().from().where() → terminal directo (sin limit), para agregados
function whereRows(rows: unknown[]) {
  const where = vi.fn().mockResolvedValue(rows);
  const from = vi.fn(() => ({ where }));
  return { from };
}

function joinAll(rows: unknown[]) {
  const orderBy = vi.fn().mockResolvedValue(rows);
  const where = vi.fn(() => ({ orderBy }));
  const chain = { leftJoin: vi.fn(() => chain), where };
  const from = vi.fn(() => chain);
  return { from };
}

function paged(rows: unknown[]) {
  const offset = vi.fn().mockResolvedValue(rows);
  const limit = vi.fn(() => ({ offset }));
  const orderBy = vi.fn(() => ({ limit }));
  const where = vi.fn(() => ({ orderBy }));
  const from = vi.fn(() => ({ where }));
  return { from };
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

describe("servicio de listas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resuelve el objetivo y rechaza uno inexistente con LIST_TARGET_INVALID", async () => {
    mocks.db.select.mockReturnValue(whereLimit([{ id: target.id }]));
    const resolved = await resolveListTarget("artist", target.id);
    expect(resolved.type).toBe("artist");

    mocks.db.select.mockReturnValue(whereLimit([]));
    await expect(resolveListTarget("artist", target.id)).rejects.toMatchObject({
      code: "LIST_TARGET_INVALID",
      status: 404,
    });
  });

  it("crea una lista válida y normaliza título y descripción", async () => {
    mocks.db.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([listRow]) }),
    });
    mocks.db.select
      .mockReturnValueOnce(whereLimit([listRow]))  // getOwnedList
      .mockReturnValueOnce(joinAll([]));  // listItems

    const result = await createList({ ownerId: owner, entityType: "artist", title: "  Favoritos de los 80  " });
    expect(result.title).toBe("Favoritos de los 80");
    expect(result.entityType).toBe("artist");
    expect(result.audience).toBe("followers");
    expect(result.items).toEqual([]);
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
    mocks.db.select.mockReturnValue(whereLimit([]));
    await expect(getOwnedList(listRow.id, "otro")).rejects.toMatchObject({
      code: "LIST_NOT_FOUND",
      status: 404,
    });
  });

  it("updateList valida que haya al menos un campo", async () => {
    await expect(updateList(listRow.id, owner, {})).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it("updateList actualiza audiencia y rechaza lista ajena", async () => {
    mocks.db.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ ...listRow, audience: "public" }]) }),
      }),
    });
    mocks.db.select
      .mockReturnValueOnce(whereLimit([{ ...listRow, audience: "public" }]))
      .mockReturnValueOnce(joinAll([]));

    const result = await updateList(listRow.id, owner, { audience: "public" });
    expect(result.audience).toBe("public");

    mocks.db.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([]) }),
      }),
    });
    await expect(updateList(listRow.id, "ajeno", { audience: "public" })).rejects.toMatchObject({
      code: "LIST_NOT_FOUND",
    });
  });

  it("deleteList borra solo listas propias", async () => {
    mocks.db.delete.mockReturnValue({
      where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: listRow.id }]) }),
    });
    await expect(deleteList(listRow.id, owner)).resolves.toBeUndefined();

    mocks.db.delete.mockReturnValue({
      where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([]) }),
    });
    await expect(deleteList(listRow.id, "ajeno")).rejects.toMatchObject({ code: "LIST_NOT_FOUND" });
  });

  it("listMyLists pagina y valida paginación", async () => {
    mocks.db.select.mockReturnValue(paged([listRow]));
    const result = await listMyLists(owner);
    expect(result.lists.length).toBe(1);

    await expect(listMyLists(owner, 0)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
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

  it("addItemToList agrega al final y rechaza tipo distinto", async () => {
    mocks.db.select
      .mockReturnValueOnce(whereLimit([listRow]))  // validar lista
      .mockReturnValueOnce(whereLimit([{ id: target.id }]))  // resolveListTarget
      .mockReturnValueOnce(whereRows([{ max: 2 }]))  // max position
      .mockReturnValueOnce(whereLimit([listRow]))  // getOwnedList
      .mockReturnValueOnce(joinAll([]));  // listItems
    mocks.db.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: "i1" }]) }),
      }),
    });

    const result = await addItemToList(listRow.id, owner, target);
    expect(result.id).toBe(listRow.id);

    vi.clearAllMocks();
    mocks.db.select.mockReturnValue(whereLimit([listRow]));
    await expect(addItemToList(listRow.id, owner, { type: "recording", id: target.id })).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it("removeItemFromList elimina el ítem de una lista propia", async () => {
    mocks.db.select
      .mockReturnValueOnce(whereLimit([{ id: listRow.id }]))  // validar lista
      .mockReturnValueOnce(whereLimit([listRow]))  // getOwnedList
      .mockReturnValueOnce(joinAll([]));  // listItems
    mocks.db.delete.mockReturnValue({ where: vi.fn().mockResolvedValue([]) });

    const result = await removeItemFromList(listRow.id, "i1", owner);
    expect(result.id).toBe(listRow.id);
  });

  it("reorderListItems reordena dentro de una transacción", async () => {
    mocks.db.select
      .mockReturnValueOnce(whereLimit([{ id: listRow.id }]))  // validar lista
      .mockReturnValueOnce(whereLimit([listRow]))  // getOwnedList
      .mockReturnValueOnce(joinAll([]));  // listItems
    mocks.db.transaction.mockImplementation(async (cb: (tx: unknown) => Promise<void>) => {
      mocks.db.update.mockReturnValue({
        set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
      });
      await cb(mocks.db);
    });

    const result = await reorderListItems(listRow.id, owner, ["i2", "i1"]);
    expect(result.id).toBe(listRow.id);
    expect(mocks.db.transaction).toHaveBeenCalled();
  });
});