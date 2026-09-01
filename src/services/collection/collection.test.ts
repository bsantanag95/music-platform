import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  addEntry,
  updateEntry,
  removeEntry,
  listOwnCollection,
  listProfileCollection,
  listOwnEntriesForReleaseGroup,
} from "./collection";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn() },
  getProfileByUsername: vi.fn(),
}));

vi.mock("@/db", () => ({ db: mocks.db }));
vi.mock("@/services/social/profiles", () => ({
  getProfileByUsername: mocks.getProfileByUsername,
}));

// select().from().where().limit()
function whereLimit(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn(() => ({ limit }));
  return { from: vi.fn(() => ({ where })) };
}

// select().from().innerJoin().where().limit()
function joinWhereLimit(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn(() => ({ limit }));
  const chain = { innerJoin: vi.fn(() => chain), where };
  return { from: vi.fn(() => chain) };
}

// select().from().innerJoin().where().orderBy()  → primaryArtistsFor
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

const userId = "00000000-0000-4000-8000-000000000001";
const albumId = "00000000-0000-4000-8000-0000000000a1";

const entryRow = {
  id: "00000000-0000-4000-8000-0000000000e1",
  format: "vinyl",
  attributes: ["limited-edition", "colored-vinyl"],
  note: "portada alternativa",
  audience: "followers",
  createdAt: new Date("2026-02-01T00:00:00Z"),
  updatedAt: new Date("2026-02-01T00:00:00Z"),
  releaseGroupId: albumId,
  albumTitle: "The Dark Side of the Moon",
  albumCover: null,
};

describe("servicio de colección física", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("addEntry crea una entrada nueva cuando el álbum existe", async () => {
    mocks.db.select
      .mockReturnValueOnce(whereLimit([{ id: albumId }])) // assertAlbumExists
      .mockReturnValueOnce(joinWhereLimit([entryRow])) // getOwnedEntry
      .mockReturnValueOnce(joinWhereOrderBy([])); // primaryArtistsFor
    mocks.db.insert.mockReturnValue({
      values: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([{ id: entryRow.id }]) })),
    });

    const entry = await addEntry(userId, { releaseGroupId: albumId, format: "vinyl" });
    expect(entry.id).toBe(entryRow.id);
    expect(entry.format).toBe("vinyl");
    expect(entry.album.title).toBe("The Dark Side of the Moon");
  });

  it("addEntry rechaza un álbum inexistente con ALBUM_NOT_FOUND", async () => {
    mocks.db.select.mockReturnValueOnce(whereLimit([]));
    await expect(
      addEntry(userId, { releaseGroupId: albumId, format: "cd" }),
    ).rejects.toMatchObject({ code: "ALBUM_NOT_FOUND", status: 404 });
  });

  it("addEntry crea otra entrada aunque ya exista una para el mismo álbum y formato", async () => {
    // No hay lectura de duplicados: sólo assertAlbumExists + insert + getOwnedEntry.
    mocks.db.select
      .mockReturnValueOnce(whereLimit([{ id: albumId }]))
      .mockReturnValueOnce(joinWhereLimit([{ ...entryRow, id: "otra-copia" }]))
      .mockReturnValueOnce(joinWhereOrderBy([]));
    mocks.db.insert.mockReturnValue({
      values: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([{ id: "otra-copia" }]) })),
    });

    const entry = await addEntry(userId, { releaseGroupId: albumId, format: "vinyl" });
    expect(entry.id).toBe("otra-copia");
  });

  it("addEntry normaliza y deduplica atributos según el orden canónico", async () => {
    const values = vi.fn(() => ({ returning: vi.fn().mockResolvedValue([{ id: entryRow.id }]) }));
    mocks.db.select
      .mockReturnValueOnce(whereLimit([{ id: albumId }]))
      .mockReturnValueOnce(joinWhereLimit([entryRow]))
      .mockReturnValueOnce(joinWhereOrderBy([]));
    mocks.db.insert.mockReturnValue({ values });

    await addEntry(userId, {
      releaseGroupId: albumId,
      format: "vinyl",
      attributes: ["colored-vinyl", "limited-edition", "colored-vinyl"],
    });

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ attributes: ["limited-edition", "colored-vinyl"] }),
    );
  });

  it("updateEntry rechaza una entrada ajena o inexistente con COLLECTION_ENTRY_NOT_FOUND", async () => {
    mocks.db.update.mockReturnValue({
      set: vi.fn(() => ({ where: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([]) })) })),
    });
    await expect(updateEntry("x", userId, { format: "cd" })).rejects.toMatchObject({
      code: "COLLECTION_ENTRY_NOT_FOUND",
      status: 404,
    });
  });

  it("updateEntry aplica los cambios de una entrada propia", async () => {
    mocks.db.update.mockReturnValue({
      set: vi.fn(() => ({
        where: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([{ id: entryRow.id }]) })),
      })),
    });
    mocks.db.select
      .mockReturnValueOnce(joinWhereLimit([{ ...entryRow, format: "cd" }]))
      .mockReturnValueOnce(joinWhereOrderBy([]));

    const entry = await updateEntry(entryRow.id, userId, { format: "cd" });
    expect(entry.format).toBe("cd");
  });

  it("removeEntry borra una entrada propia", async () => {
    mocks.db.delete.mockReturnValue({
      where: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([{ id: entryRow.id }]) })),
    });
    await expect(removeEntry(entryRow.id, userId)).resolves.toBeUndefined();
  });

  it("removeEntry rechaza una entrada ajena o inexistente", async () => {
    mocks.db.delete.mockReturnValue({
      where: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([]) })),
    });
    await expect(removeEntry("x", userId)).rejects.toMatchObject({
      code: "COLLECTION_ENTRY_NOT_FOUND",
    });
  });

  it("listOwnCollection rechaza una paginación inválida", async () => {
    await expect(listOwnCollection(userId, 0)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(listOwnCollection(userId, 1, 999)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it("listOwnCollection pagina con hasNext y filtra por formato", async () => {
    const rows = Array.from({ length: 21 }, (_, i) => ({ ...entryRow, id: `entry-${i}` }));
    const where = vi.fn(() => ({
      orderBy: vi.fn(() => ({ limit: vi.fn(() => ({ offset: vi.fn().mockResolvedValue(rows) })) })),
    }));
    const chain = { innerJoin: vi.fn(() => chain), where };
    mocks.db.select
      .mockReturnValueOnce({ from: vi.fn(() => chain) })
      .mockReturnValueOnce(joinWhereOrderBy([]));

    const result = await listOwnCollection(userId, 1, 20, { format: "vinyl" });
    expect(result.entries).toHaveLength(20);
    expect(result.hasNext).toBe(true);
    // El filtro de formato se tradujo a una condición en el where.
    expect(where).toHaveBeenCalled();
  });

  it("listOwnCollection vacía no consulta artistas", async () => {
    mocks.db.select.mockReturnValueOnce(joinWherePaged([]));
    const result = await listOwnCollection(userId);
    expect(result.entries).toEqual([]);
    expect(mocks.db.select).toHaveBeenCalledTimes(1);
  });

  it("listProfileCollection devuelve vacío cuando no hay permiso (perfil privado sin relación)", async () => {
    mocks.getProfileByUsername.mockResolvedValue({
      id: "otro",
      profileVisibility: "private",
      relation: "none",
      blockedByMe: false,
    });
    const result = await listProfileCollection("otro", userId);
    expect(result.entries).toEqual([]);
    expect(mocks.db.select).not.toHaveBeenCalled();
  });

  it("listProfileCollection devuelve vacío ante bloqueo", async () => {
    mocks.getProfileByUsername.mockResolvedValue({
      id: "otro",
      profileVisibility: "public",
      relation: "none",
      blockedByMe: true,
    });
    const result = await listProfileCollection("otro", userId);
    expect(result.entries).toEqual([]);
  });

  it("listProfileCollection de un perfil público devuelve entradas", async () => {
    mocks.getProfileByUsername.mockResolvedValue({
      id: "otro",
      profileVisibility: "public",
      relation: "none",
      blockedByMe: false,
    });
    mocks.db.select
      .mockReturnValueOnce(joinWherePaged([entryRow]))
      .mockReturnValueOnce(joinWhereOrderBy([{ releaseGroupId: albumId, position: 0, artistId: "a1", artistName: "Pink Floyd" }]));

    const result = await listProfileCollection("otro", userId);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]!.album.artistName).toBe("Pink Floyd");
  });

  it("listProfileCollection permite a un seguidor aprobado ver la colección", async () => {
    mocks.getProfileByUsername.mockResolvedValue({
      id: "otro",
      profileVisibility: "private",
      relation: "following",
      blockedByMe: false,
    });
    mocks.db.select
      .mockReturnValueOnce(joinWherePaged([entryRow]))
      .mockReturnValueOnce(joinWhereOrderBy([]));

    const result = await listProfileCollection("otro", userId);
    expect(result.entries).toHaveLength(1);
  });

  it("listOwnEntriesForReleaseGroup devuelve las copias del usuario para un álbum", async () => {
    mocks.db.select
      .mockReturnValueOnce(joinWhereOrderBy([entryRow, { ...entryRow, id: "e2", format: "cd" }]))
      .mockReturnValueOnce(joinWhereOrderBy([]));

    const entries = await listOwnEntriesForReleaseGroup(userId, albumId);
    expect(entries.map((e) => e.format)).toEqual(["vinyl", "cd"]);
  });

  it("no importa favoritos, ratings, comentarios, escuchas ni listas", () => {
    const content = readFileSync(join(import.meta.dirname, "collection.ts"), "utf-8");
    expect(content).not.toMatch(/schema.*import.*\b(favorite|rating|comment|listenEntry|userList)\b/);
    expect(content).not.toMatch(/from "@\/services\/(favorites|social\/rating|diary|lists)"/);
  });
});
