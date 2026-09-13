import { describe, expect, it, vi } from "vitest";
import {
  toggleWantToListen,
  removeWantToListenEntry,
  removeWantToListenEntryForTarget,
  isWantToListen,
  resolveWantToListenTarget,
  listMyWantToListen,
  type WantToListenTarget,
} from "./want-to-listen";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));

vi.mock("@/db", () => ({ db: mocks.db }));

// select().from().where().limit() → terminal limit
function whereLimit(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where }));
  return { from };
}

// select().from().leftJoin()×2.where().limit() → join del detalle/owned
function joinLimit(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn(() => ({ limit }));
  const chain = { leftJoin: vi.fn(() => chain), where };
  const from = vi.fn(() => chain);
  return { from };
}

// select().from().leftJoin()×2.where().orderBy().limit().offset() → paginado
function joinPaged(rows: unknown[]) {
  const offset = vi.fn().mockResolvedValue(rows);
  const limit = vi.fn(() => ({ offset }));
  const orderBy = vi.fn(() => ({ limit }));
  const where = vi.fn(() => ({ orderBy }));
  const chain = { leftJoin: vi.fn(() => chain), where };
  const from = vi.fn(() => chain);
  return { from };
}

const target: WantToListenTarget = { type: "artist", id: "00000000-0000-4000-8000-000000000001" };
const user = "00000000-0000-4000-8000-000000000002";

const entryRow = {
  id: "00000000-0000-4000-8000-000000000003",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  artistId: target.id,
  releaseGroupId: null,
  artistName: "Pink Floyd",
  releaseTitle: null,
  releaseCover: null,
};

describe("servicio de want-to-listen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resuelve el objetivo y rechaza uno inexistente con WANT_TO_LISTEN_TARGET_INVALID", async () => {
    mocks.db.select.mockReturnValue(whereLimit([{ id: target.id }]));
    const resolved = await resolveWantToListenTarget("artist", target.id);
    expect(resolved.type).toBe("artist");

    mocks.db.select.mockReturnValue(whereLimit([]));
    await expect(resolveWantToListenTarget("artist", target.id)).rejects.toMatchObject({
      code: "WANT_TO_LISTEN_TARGET_INVALID",
      status: 404,
    });
  });

  it("isWantToListen devuelve true cuando existe la fila y false cuando no", async () => {
    mocks.db.select.mockReturnValue(whereLimit([{ id: "wtl1" }]));
    await expect(isWantToListen(target, user)).resolves.toBe(true);

    mocks.db.select.mockReturnValue(whereLimit([]));
    await expect(isWantToListen(target, user)).resolves.toBe(false);
  });

  it("crea una entrada nueva cuando no existe (toggle on)", async () => {
    mocks.db.select
      .mockReturnValueOnce(whereLimit([{ id: target.id }])) // resolveWantToListenTarget - artista existe
      .mockReturnValueOnce(whereLimit([])) // buscar existente
      .mockReturnValueOnce(joinLimit([entryRow])); // getOwnedEntry
    const values = vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([entryRow]),
    });
    mocks.db.insert.mockReturnValue({ values });

    const result = await toggleWantToListen(target, user);
    expect(result).not.toBeNull();
    expect(result?.id).toBe(entryRow.id);
    expect(result?.targetType).toBe("artist");
  });

  it("elimina una entrada existente (toggle off)", async () => {
    mocks.db.select
      .mockReturnValueOnce(whereLimit([{ id: target.id }])) // resolveWantToListenTarget - artista existe
      .mockReturnValueOnce(whereLimit([{ id: entryRow.id }])); // buscar existente
    mocks.db.delete.mockReturnValue({ where: vi.fn().mockResolvedValue([]) });

    const result = await toggleWantToListen(target, user);
    expect(result).toBeNull();
  });

  it("rechaza un objetivo inexistente con WANT_TO_LISTEN_TARGET_INVALID", async () => {
    mocks.db.select.mockReturnValue(whereLimit([])); // resolveWantToListenTarget - artista no existe

    await expect(
      toggleWantToListen({ type: "artist", id: "00000000-0000-4000-8000-000000000099" }, user),
    ).rejects.toMatchObject({ code: "WANT_TO_LISTEN_TARGET_INVALID" });
  });

  it("removeWantToListenEntry es idempotente", async () => {
    mocks.db.delete.mockReturnValue({ where: vi.fn().mockResolvedValue([]) });
    await expect(removeWantToListenEntry(target, user)).resolves.toBeUndefined();
  });

  it("removeWantToListenEntryForTarget ignora objetivos de tipo canción", async () => {
    await removeWantToListenEntryForTarget({ type: "recording", id: "r1" }, user);
    expect(mocks.db.delete).not.toHaveBeenCalled();
  });

  it("removeWantToListenEntryForTarget borra para artista o álbum", async () => {
    mocks.db.delete.mockReturnValue({ where: vi.fn().mockResolvedValue([]) });
    await removeWantToListenEntryForTarget({ type: "release-group", id: "rg1" }, user);
    expect(mocks.db.delete).toHaveBeenCalled();
  });

  it("rechaza una paginación inválida", async () => {
    await expect(listMyWantToListen(user, 0)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(listMyWantToListen(user, 1, 0)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it("listMyWantToListen devuelve vacío cuando no hay entradas", async () => {
    mocks.db.select.mockReturnValueOnce(joinPaged([]));

    const result = await listMyWantToListen(user);
    expect(result.items).toEqual([]);
    expect(result.hasNext).toBe(false);
  });

  it("listMyWantToListen serializa entradas de artista y de álbum", async () => {
    const albumRow = {
      id: "00000000-0000-4000-8000-000000000004",
      createdAt: new Date("2026-01-02T00:00:00Z"),
      artistId: null,
      releaseGroupId: "00000000-0000-4000-8000-000000000005",
      artistName: null,
      releaseTitle: "The Dark Side of the Moon",
      releaseCover: "https://example.com/cover.jpg",
    };
    mocks.db.select.mockReturnValueOnce(joinPaged([entryRow, albumRow]));

    const result = await listMyWantToListen(user);
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({ targetType: "artist", target: { title: "Pink Floyd" } });
    expect(result.items[1]).toMatchObject({
      targetType: "release-group",
      target: { title: "The Dark Side of the Moon", coverThumbUrl: "https://example.com/cover.jpg" },
    });
  });
});
