import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getNotificationPreferences,
  getNotificationSettings,
  setNotificationDigestEnabled,
  updateNotificationPreferences,
  updateNotificationSettings,
} from "./preferences";

const mocks = vi.hoisted(() => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(),
  },
}));

vi.mock("@/db", () => ({ db: mocks.db }));

function mockPreferences(rows: Array<{ kind: string; enabled: boolean }>) {
  const where = vi.fn().mockResolvedValue(rows);
  const from = vi.fn(() => ({ where }));
  mocks.db.select.mockReturnValue({ from });
}

/**
 * Cola una lectura de `app_user` (`.limit(1)`). Los ajustes encadenan varias
 * lecturas por llamada, así que el orden importa: se encolan en el orden en que
 * las hace el código.
 */
function queueUserRow(row: { emailDigest: boolean; emailVerifiedAt: Date | null } | null) {
  const limit = vi.fn().mockResolvedValue(row ? [row] : []);
  const where = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where }));
  mocks.db.select.mockReturnValueOnce({ from });
  return { where, limit };
}

/** Cola una lectura de `notificationPreference` (devuelve las filas directo). */
function queuePreferences(rows: Array<{ kind: string; enabled: boolean }>) {
  const where = vi.fn().mockResolvedValue(rows);
  const from = vi.fn(() => ({ where }));
  mocks.db.select.mockReturnValueOnce({ from });
  return { where };
}

function mockWrites() {
  const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
  const values = vi.fn(() => ({ onConflictDoUpdate }));
  mocks.db.insert.mockReturnValue({ values });
  const where = vi.fn().mockResolvedValue(undefined);
  mocks.db.delete.mockReturnValue({ where });
  return { values, onConflictDoUpdate, where };
}

function mockUserUpdate() {
  const where = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn(() => ({ where }));
  mocks.db.update.mockReturnValue({ set });
  return { set, where };
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
      artist_award: true,
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

describe("resumen semanal", () => {
  it("los ajustes traen el opt-in y si el email está verificado", async () => {
    queueUserRow({ emailDigest: true, emailVerifiedAt: new Date("2026-10-01T00:00:00.000Z") });
    mockPreferences([]);

    const settings = await getNotificationSettings("me");

    expect(settings.emailDigest).toBe(true);
    expect(settings.emailVerified).toBe(true);
    expect(settings.preferences.artist_award).toBe(true);
  });

  it("sin verificar, emailVerified es falso", async () => {
    queueUserRow({ emailDigest: false, emailVerifiedAt: null });
    mockPreferences([]);

    const settings = await getNotificationSettings("me");

    expect(settings.emailDigest).toBe(false);
    expect(settings.emailVerified).toBe(false);
  });

  it("una cuenta inexistente responde USER_NOT_FOUND", async () => {
    queueUserRow(null);
    mockPreferences([]);

    await expect(getNotificationSettings("me")).rejects.toMatchObject({
      code: "USER_NOT_FOUND",
      status: 404,
    });
  });

  it("activar sin email verificado responde 409 y no escribe", async () => {
    queueUserRow({ emailDigest: false, emailVerifiedAt: null });

    await expect(setNotificationDigestEnabled("me", true)).rejects.toMatchObject({
      code: "EMAIL_NOT_VERIFIED",
      status: 409,
    });
    expect(mocks.db.update).not.toHaveBeenCalled();
  });

  it("activar con el email verificado enciende el resumen", async () => {
    queueUserRow({ emailDigest: false, emailVerifiedAt: new Date("2026-10-01T00:00:00.000Z") });
    const { set } = mockUserUpdate();

    await setNotificationDigestEnabled("me", true);

    expect(set).toHaveBeenCalledWith({ notificationDigestEnabled: true });
  });

  it("desactivar no exige verificación y apaga el resumen", async () => {
    const { set } = mockUserUpdate();

    await setNotificationDigestEnabled("me", false);

    expect(set).toHaveBeenCalledWith({ notificationDigestEnabled: false });
    // No se consulta el email para apagar.
    expect(mocks.db.select).not.toHaveBeenCalled();
  });

  it("el cambio parcial aplica el resumen y los tipos, y devuelve el estado", async () => {
    // Orden de lecturas: verificación, preferencias tras escribir, ajustes
    // (cuenta) y preferencias de la respuesta.
    queueUserRow({ emailDigest: false, emailVerifiedAt: new Date("2026-10-01T00:00:00.000Z") });
    queuePreferences([{ kind: "comment_reply", enabled: false }]);
    queueUserRow({ emailDigest: true, emailVerifiedAt: new Date("2026-10-01T00:00:00.000Z") });
    mockPreferences([{ kind: "comment_reply", enabled: false }]);
    const { set } = mockUserUpdate();
    mockWrites();

    const settings = await updateNotificationSettings("me", {
      emailDigest: true,
      preferences: { comment_reply: false },
    });

    expect(set).toHaveBeenCalledWith({ notificationDigestEnabled: true });
    expect(settings.emailDigest).toBe(true);
    expect(settings.preferences.comment_reply).toBe(false);
  });

  it("un cambio solo de tipos no toca el resumen", async () => {
    // Orden de lecturas: preferencias tras escribir, cuenta de los ajustes y
    // preferencias de la respuesta.
    queuePreferences([]);
    queueUserRow({ emailDigest: false, emailVerifiedAt: new Date("2026-10-01T00:00:00.000Z") });
    mockPreferences([]);
    mockWrites();

    await updateNotificationSettings("me", { preferences: { new_follower: true } });

    expect(mocks.db.update).not.toHaveBeenCalled();
  });
});
