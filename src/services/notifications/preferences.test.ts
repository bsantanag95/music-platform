import { beforeEach, describe, expect, it, vi } from "vitest";
import { getNotificationPreferences, updateNotificationPreferences } from "./preferences";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn(), insert: vi.fn(), delete: vi.fn(), transaction: vi.fn() },
}));

vi.mock("@/db", () => ({ db: mocks.db }));

function mockPreferences(rows: Array<{ kind: string; enabled: boolean }>) {
  const where = vi.fn().mockResolvedValue(rows);
  const from = vi.fn(() => ({ where }));
  mocks.db.select.mockReturnValue({ from });
}

function mockWrites() {
  const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
  const values = vi.fn(() => ({ onConflictDoUpdate }));
  mocks.db.insert.mockReturnValue({ values });
  const where = vi.fn().mockResolvedValue(undefined);
  mocks.db.delete.mockReturnValue({ where });
  return { values, onConflictDoUpdate, where };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.db.transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
    callback({ insert: mocks.db.insert, delete: mocks.db.delete }),
  );
});

describe("getNotificationPreferences", () => {
  it("sin filas, cada tipo usa su defecto y los fijos se incluyen", async () => {
    mockPreferences([]);

    expect(await getNotificationPreferences("me")).toEqual({
      comment_reply: true,
      thread_reply: true,
      new_follower: true,
      follow_request: true,
      follow_accepted: true,
      moderation: true,
      comment_like_milestone: true,
      list_save_milestone: false,
      artist_release: true,
      artist_release_announced: false,
      artist_single: false,
    });
  });

  it("una fila desactivada pesa sobre el defecto", async () => {
    mockPreferences([{ kind: "thread_reply", enabled: false }]);

    expect((await getNotificationPreferences("me")).thread_reply).toBe(false);
  });
});

describe("updateNotificationPreferences", () => {
  it("rechaza un tipo fijo sin escribir nada", async () => {
    await expect(updateNotificationPreferences("me", { moderation: false })).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      status: 400,
    });
    expect(mocks.db.transaction).not.toHaveBeenCalled();
  });

  it("rechaza una solicitud de seguimiento: es fija", async () => {
    await expect(
      updateNotificationPreferences("me", { follow_request: false }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("desactivar guarda una fila para el tipo", async () => {
    const { values } = mockWrites();
    mockPreferences([{ kind: "comment_reply", enabled: false }]);

    const result = await updateNotificationPreferences("me", { comment_reply: false });

    expect(values).toHaveBeenCalledWith([{ userId: "me", kind: "comment_reply", enabled: false }]);
    expect(result.comment_reply).toBe(false);
  });

  it("volver a activar borra la fila: no se guarda lo que no difiere del defecto", async () => {
    const { where } = mockWrites();
    mockPreferences([]);

    const result = await updateNotificationPreferences("me", { new_follower: true });

    expect(where).toHaveBeenCalledTimes(1);
    expect(mocks.db.insert).not.toHaveBeenCalled();
    expect(result.new_follower).toBe(true);
  });

  it("activar un tipo que nace apagado sí guarda la fila", async () => {
    const { values } = mockWrites();
    mockPreferences([{ kind: "artist_single", enabled: true }]);

    const result = await updateNotificationPreferences("me", { artist_single: true });

    expect(values).toHaveBeenCalledWith([
      { userId: "me", kind: "artist_single", enabled: true },
    ]);
    expect(result.artist_single).toBe(true);
  });
});
