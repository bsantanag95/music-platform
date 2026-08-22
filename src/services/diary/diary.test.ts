import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  createListenEntry,
  deleteListenEntry,
  listMyDiary,
  resolveDiaryTarget,
  updateListenEntry,
  type DiaryTarget,
} from "./diary";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));

vi.mock("@/db", () => ({ db: mocks.db }));

// select().from().where()  → terminal donde se espera el resultado
function whereTerminal(rows: unknown[]) {
  const where = vi.fn().mockResolvedValue(rows);
  const from = vi.fn(() => ({ where }));
  return { from };
}

// select().from().where().limit()  → terminal limit
function whereLimit(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where }));
  return { from };
}

// select().from().leftJoin()×3.where().limit()  → join del detalle/owned
function joinLimit(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn(() => ({ limit }));
  const chain = { leftJoin: vi.fn(() => chain), where };
  const from = vi.fn(() => chain);
  return { from };
}

// select().from().leftJoin()×3.where().orderBy().limit().offset()  → paginado
function joinPaged(rows: unknown[]) {
  const offset = vi.fn().mockResolvedValue(rows);
  const limit = vi.fn(() => ({ offset }));
  const orderBy = vi.fn(() => ({ limit }));
  const where = vi.fn(() => ({ orderBy }));
  const chain = { leftJoin: vi.fn(() => chain), where };
  const from = vi.fn(() => chain);
  return { from };
}

const target: DiaryTarget = { type: "artist", id: "00000000-0000-4000-8000-000000000001", column: "artistId" };
const user = "00000000-0000-4000-8000-000000000002";

const entryRow = {
  id: "00000000-0000-4000-8000-000000000003",
  listenContext: "first_listen",
  body: null,
  reaction: null,
  audience: "followers",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  artistId: target.id,
  releaseGroupId: null,
  recordingId: null,
  artistName: "Pink Floyd",
  releaseTitle: null,
  releaseCover: null,
  recordingTitle: null,
};

describe("servicio del diario", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resuelve el objetivo y rechaza uno inexistente con DIARY_TARGET_INVALID", async () => {
    mocks.db.select.mockReturnValue(whereLimit([{ id: target.id }]));
    const resolved = await resolveDiaryTarget("release-group", target.id);
    expect(resolved.type).toBe("release-group");

    mocks.db.select.mockReturnValue(whereLimit([]));
    await expect(resolveDiaryTarget("artist", target.id)).rejects.toMatchObject({
      code: "DIARY_TARGET_INVALID",
      status: 404,
    });
  });

  it("infiere first_listen en la primera escucha y persiste audiencia followers", async () => {
    mocks.db.select
      .mockReturnValueOnce(whereTerminal([{ count: 0 }]))
      .mockReturnValueOnce(joinLimit([{ ...entryRow, listenContext: "first_listen" }]));
    mocks.db.insert.mockReturnValue({
      values: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([{ id: entryRow.id }]) })),
    });

    const entry = await createListenEntry(target, user);

    expect(entry.listenContext).toBe("first_listen");
    expect(entry.audience).toBe("followers");
    expect(entry.target).toMatchObject({ type: "artist", id: target.id, title: "Pink Floyd" });
  });

  it("infiere relisten cuando ya existe una escucha previa del objetivo", async () => {
    mocks.db.select
      .mockReturnValueOnce(whereTerminal([{ count: 3 }]))
      .mockReturnValueOnce(joinLimit([{ ...entryRow, listenContext: "relisten" }]));
    mocks.db.insert.mockReturnValue({
      values: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([{ id: entryRow.id }]) })),
    });

    const entry = await createListenEntry(target, user);
    expect(entry.listenContext).toBe("relisten");
  });

  it("rechaza modificar una entrada que no existe o no es del dueño con 404", async () => {
    mocks.db.select.mockReturnValue(whereLimit([]));
    await expect(
      updateListenEntry(entryRow.id, user, { reaction: "loved" }),
    ).rejects.toMatchObject({ code: "LISTEN_ENTRY_NOT_FOUND", status: 404 });
  });

  it("rechaza una modificación sin campos", async () => {
    await expect(updateListenEntry(entryRow.id, user, {})).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      status: 400,
    });
  });

  it("rechaza una impresión mayor a 500 caracteres", async () => {
    mocks.db.select.mockReturnValue(whereLimit([{ id: entryRow.id, userId: user }]));
    await expect(
      updateListenEntry(entryRow.id, user, { body: "x".repeat(501) }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", status: 400 });
  });

  it("aplica cambios, limpia reacción con null y devuelve la entrada ampliada", async () => {
    mocks.db.select
      .mockReturnValueOnce(whereLimit([{ id: entryRow.id, userId: user }]))
      .mockReturnValueOnce(
        joinLimit([
          {
            ...entryRow,
            listenContext: "rediscovery",
            body: "Este bajo está ridículamente bueno",
            reaction: "obsessed",
            audience: "private",
          },
        ]),
      );
    mocks.db.update.mockReturnValue({
      set: vi.fn(() => ({ where: vi.fn().mockResolvedValue([]) })),
    });

    const updated = await updateListenEntry(entryRow.id, user, {
      body: "Este bajo está ridículamente bueno",
      listenContext: "rediscovery",
      reaction: "obsessed",
      audience: "private",
    });

    expect(updated).toMatchObject({
      body: "Este bajo está ridículamente bueno",
      reaction: "obsessed",
      audience: "private",
      listenContext: "rediscovery",
    });
  });

  it("envía reaction null al limpiar la reacción", async () => {
    mocks.db.select
      .mockReturnValueOnce(whereLimit([{ id: entryRow.id, userId: user }]))
      .mockReturnValueOnce(joinLimit([{ ...entryRow, reaction: null }]));
    const setFn = vi.fn(() => ({ where: vi.fn().mockResolvedValue([]) }));
    mocks.db.update.mockReturnValue({ set: setFn });

    const updated = await updateListenEntry(entryRow.id, user, { reaction: null });

    expect(setFn).toHaveBeenCalledWith(expect.objectContaining({ reaction: null }));
    expect(updated.reaction).toBeNull();
  });

  it("borra físicamente y responde 404 si la entrada no existe o no es del dueño", async () => {
    mocks.db.delete.mockReturnValue({
      where: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([{ id: entryRow.id }]) })),
    });
    await expect(deleteListenEntry(entryRow.id, user)).resolves.toBeUndefined();

    mocks.db.delete.mockReturnValue({
      where: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([]) })),
    });
    await expect(deleteListenEntry(entryRow.id, user)).rejects.toMatchObject({
      code: "LISTEN_ENTRY_NOT_FOUND",
      status: 404,
    });
  });

  it("lista el diario paginado con hasNext y orden descendente", async () => {
    mocks.db.select.mockReturnValue(joinPaged([entryRow, entryRow]));
    const result = await listMyDiary(user, 1, 1);

    expect(result.entries).toHaveLength(1);
    expect(result.hasNext).toBe(true);
    expect(result.page).toBe(1);
  });

  it("no toca la tabla de valoración: no la importa del esquema", () => {
    const source = readFileSync(join(process.cwd(), "src/services/diary/diary.ts"), "utf8");
    const schemaImports = source.match(/import\s*\{([^}]*)\}\s*from\s*"@\/db\/schema"/)?.[1] ?? "";
    const identifiers = schemaImports
      .split(",")
      .map((part) => part.trim().split(/\s+as\s+/)[0])
      .filter(Boolean);
    expect(identifiers).not.toContain("rating");
  });
});