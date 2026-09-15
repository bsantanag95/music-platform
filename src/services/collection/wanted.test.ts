import { describe, expect, it, vi } from "vitest";
import {
  addWantedEntries,
  removeWantedEntry,
  updateWantedEntry,
  listOwnWanted,
  listOwnWantedForReleaseGroup,
} from "./wanted";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn(), transaction: vi.fn() },
}));

vi.mock("@/db", () => ({ db: mocks.db }));

// select().from().where().limit()  → assertAlbumExists
function whereLimit(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn(() => ({ limit }));
  return { from: vi.fn(() => ({ where })) };
}

// select().from().innerJoin().where().orderBy()
function joinWhereOrderBy(rows: unknown[]) {
  const orderBy = vi.fn().mockResolvedValue(rows);
  const where = vi.fn(() => ({ orderBy }));
  const chain = { innerJoin: vi.fn(() => chain), where };
  return { from: vi.fn(() => chain) };
}

// select().from().innerJoin().where().orderBy().limit().offset()  → paginado
function joinWherePaged(rows: unknown[]) {
  const offset = vi.fn().mockResolvedValue(rows);
  const limit = vi.fn(() => ({ offset }));
  const orderBy = vi.fn(() => ({ limit }));
  const where = vi.fn(() => ({ orderBy }));
  const chain = { innerJoin: vi.fn(() => chain), where };
  return { from: vi.fn(() => chain) };
}

function fakeTransaction(returnedIds: string[]) {
  let call = 0;
  return vi.fn(async (cb: (tx: unknown) => Promise<unknown>) => {
    const tx = {
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          returning: vi.fn().mockResolvedValue([{ id: returnedIds[call++] }]),
        })),
      })),
    };
    return cb(tx);
  });
}

const userId = "00000000-0000-4000-8000-000000000001";
const albumId = "00000000-0000-4000-8000-0000000000a1";

const entryRow = {
  id: "00000000-0000-4000-8000-0000000000e1",
  format: "vinyl",
  attributes: ["limited-edition"],
  note: null,
  createdAt: new Date("2026-02-01T00:00:00Z"),
  updatedAt: new Date("2026-02-01T00:00:00Z"),
  releaseGroupId: albumId,
  albumTitle: "The Dark Side of the Moon",
  albumCover: null,
};

describe("servicio de wishlist de colección", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("addWantedEntries crea una sola variante cuando el álbum existe", async () => {
    mocks.db.select
      .mockReturnValueOnce(whereLimit([{ id: albumId }])) // assertAlbumExists
      .mockReturnValueOnce(joinWhereOrderBy([entryRow])) // getOwnedEntries
      .mockReturnValueOnce(joinWhereOrderBy([])); // primaryArtistsFor
    mocks.db.transaction = fakeTransaction([entryRow.id]);

    const entries = await addWantedEntries(userId, albumId, [{ format: "vinyl" }]);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.format).toBe("vinyl");
  });

  it("addWantedEntries crea varias variantes en una sola operación", async () => {
    mocks.db.select
      .mockReturnValueOnce(whereLimit([{ id: albumId }]))
      .mockReturnValueOnce(
        joinWhereOrderBy([entryRow, { ...entryRow, id: "e2", format: "cd", attributes: ["remaster"] }]),
      )
      .mockReturnValueOnce(joinWhereOrderBy([]));
    mocks.db.transaction = fakeTransaction([entryRow.id, "e2"]);

    const entries = await addWantedEntries(userId, albumId, [
      { format: "vinyl", attributes: ["limited-edition"] },
      { format: "cd", attributes: ["remaster"] },
    ]);
    expect(entries.map((e) => e.format)).toEqual(["vinyl", "cd"]);
  });

  it("addWantedEntries acepta una variante sin formato ('cualquier formato')", async () => {
    mocks.db.select
      .mockReturnValueOnce(whereLimit([{ id: albumId }]))
      .mockReturnValueOnce(joinWhereOrderBy([{ ...entryRow, format: null, attributes: [] }]))
      .mockReturnValueOnce(joinWhereOrderBy([]));
    mocks.db.transaction = fakeTransaction([entryRow.id]);

    const entries = await addWantedEntries(userId, albumId, [{}]);
    expect(entries[0]!.format).toBeNull();
  });

  it("addWantedEntries rechaza un lote vacío o de más de 10 variantes", async () => {
    await expect(addWantedEntries(userId, albumId, [])).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
    const many = Array.from({ length: 11 }, () => ({}));
    await expect(addWantedEntries(userId, albumId, many)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it("addWantedEntries rechaza un álbum inexistente con ALBUM_NOT_FOUND", async () => {
    mocks.db.select.mockReturnValueOnce(whereLimit([]));
    await expect(addWantedEntries(userId, albumId, [{}])).rejects.toMatchObject({
      code: "ALBUM_NOT_FOUND",
      status: 404,
    });
  });

  it("updateWantedEntry aplica los cambios de una entrada propia", async () => {
    mocks.db.update.mockReturnValue({
      set: vi.fn(() => ({
        where: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([{ id: entryRow.id }]) })),
      })),
    });
    mocks.db.select
      .mockReturnValueOnce(joinWhereOrderBy([{ ...entryRow, format: "cd", attributes: [] }]))
      .mockReturnValueOnce(joinWhereOrderBy([]));

    const entry = await updateWantedEntry(entryRow.id, userId, { format: "cd", attributes: [] });
    expect(entry.format).toBe("cd");
  });

  it("updateWantedEntry acepta format: null para volver a 'cualquier formato'", async () => {
    const set = vi.fn(() => ({
      where: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([{ id: entryRow.id }]) })),
    }));
    mocks.db.update.mockReturnValue({ set });
    mocks.db.select
      .mockReturnValueOnce(joinWhereOrderBy([{ ...entryRow, format: null }]))
      .mockReturnValueOnce(joinWhereOrderBy([]));

    await updateWantedEntry(entryRow.id, userId, { format: null });
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ format: null }));
  });

  it("updateWantedEntry rechaza una entrada ajena o inexistente con WANTED_ENTRY_NOT_FOUND", async () => {
    mocks.db.update.mockReturnValue({
      set: vi.fn(() => ({ where: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([]) })) })),
    });
    await expect(updateWantedEntry("x", userId, { format: "cd" })).rejects.toMatchObject({
      code: "WANTED_ENTRY_NOT_FOUND",
      status: 404,
    });
  });

  it("removeWantedEntry borra una entrada propia", async () => {
    mocks.db.delete.mockReturnValue({
      where: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([{ id: entryRow.id }]) })),
    });
    await expect(removeWantedEntry(entryRow.id, userId)).resolves.toBeUndefined();
  });

  it("removeWantedEntry rechaza una entrada ajena o inexistente", async () => {
    mocks.db.delete.mockReturnValue({
      where: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([]) })),
    });
    await expect(removeWantedEntry("x", userId)).rejects.toMatchObject({
      code: "WANTED_ENTRY_NOT_FOUND",
    });
  });

  it("listOwnWanted rechaza una paginación inválida", async () => {
    await expect(listOwnWanted(userId, 0)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(listOwnWanted(userId, 1, 999)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it("listOwnWanted rechaza un orden inválido", async () => {
    await expect(
      // @ts-expect-error probamos un valor fuera del enum
      listOwnWanted(userId, 1, 20, { sort: "cheapest" }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("listOwnWanted pagina y acepta búsqueda por texto", async () => {
    const rows = Array.from({ length: 21 }, (_, i) => ({ ...entryRow, id: `entry-${i}` }));
    mocks.db.select
      .mockReturnValueOnce(joinWherePaged(rows))
      .mockReturnValueOnce(joinWhereOrderBy([]));

    const result = await listOwnWanted(userId, 1, 20, { q: "moon" });
    expect(result.entries).toHaveLength(20);
    expect(result.hasNext).toBe(true);
  });

  it("listOwnWantedForReleaseGroup devuelve las variantes deseadas de un álbum", async () => {
    mocks.db.select
      .mockReturnValueOnce(
        joinWhereOrderBy([entryRow, { ...entryRow, id: "e2", format: "cd", attributes: [] }]),
      )
      .mockReturnValueOnce(joinWhereOrderBy([]));

    const entries = await listOwnWantedForReleaseGroup(userId, albumId);
    expect(entries.map((e) => e.format)).toEqual(["vinyl", "cd"]);
  });
});
