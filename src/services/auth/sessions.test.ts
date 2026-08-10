import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: { insert: vi.fn(), delete: vi.fn(), select: vi.fn() },
  cookie: vi.fn(),
}));

vi.mock("@/db", () => ({ db: mocks.db }));
vi.mock("@/db/schema", () => ({
  appUser: { id: "user.id" },
  session: { id: "session.id", userId: "session.userId", tokenHash: "session.tokenHash", expiresAt: "session.expiresAt" },
}));
vi.mock("drizzle-orm", () => ({
  and: vi.fn((...conditions) => ({ conditions })),
  eq: vi.fn((field, value) => ({ field, value })),
  lt: vi.fn(),
}));
vi.mock("next/headers", () => ({ cookies: () => ({ get: mocks.cookie }) }));

import { createSession, deleteAllSessions, resolveSession, rotateCurrentSession, SESSION_COOKIE, SESSION_TTL_MS } from "./sessions";

describe("sesiones server-side", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cookie.mockReturnValue(undefined);
  });

  it("crea tokens opacos con expiración fija", async () => {
    const values = vi.fn().mockResolvedValue(undefined);
    mocks.db.insert.mockReturnValue({ values });
    const before = Date.now();
    const result = await createSession("user-1");
    expect(result.token).toHaveLength(43);
    expect(values).toHaveBeenCalledWith(expect.objectContaining({ userId: "user-1", tokenHash: expect.any(String) }));
    expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(before + SESSION_TTL_MS);
  });

  it("trata una sesión expirada como anónima y la limpia sin bloquear", async () => {
    vi.useFakeTimers();
    mocks.cookie.mockReturnValue({ value: "opaque" });
    const limit = vi.fn().mockResolvedValue([{ sessionId: "s1", expiresAt: new Date(Date.now() - 1), user: { id: "u1" } }]);
    mocks.db.select.mockReturnValue({ from: () => ({ innerJoin: () => ({ where: () => ({ limit }) }) }) });
    const where = vi.fn().mockResolvedValue(undefined);
    mocks.db.delete.mockReturnValue({ where });
    const result = await resolveSession();
    expect(result).toBeNull();
    await vi.waitFor(() => expect(where).toHaveBeenCalledOnce());
    await vi.advanceTimersByTimeAsync(60_000);
    vi.useRealTimers();
  });

  it("agenda la limpieza aunque no haya cookie y captura errores del job", async () => {
    vi.useFakeTimers();
    const where = vi.fn().mockRejectedValue(new Error("db caida"));
    mocks.db.delete.mockReturnValue({ where });
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(resolveSession()).resolves.toBeNull();
    await vi.advanceTimersByTimeAsync(60_000);

    expect(where).toHaveBeenCalledOnce();
    expect(error).toHaveBeenCalledWith("No se pudieron limpiar las sesiones expiradas:", expect.any(Error));
    error.mockRestore();
    vi.useRealTimers();
  });

  it("revoca todas las sesiones del usuario", async () => {
    const where = vi.fn().mockResolvedValue(undefined);
    mocks.db.delete.mockReturnValue({ where });
    await deleteAllSessions("user-1");
    expect(where).toHaveBeenCalledOnce();
  });

  it("solo revoca la cookie actual si pertenece al usuario autenticado", async () => {
    mocks.cookie.mockReturnValue({ value: "cookie-de-otro" });
    const deleteWhere = vi.fn().mockResolvedValue(undefined);
    mocks.db.delete.mockReturnValue({ where: deleteWhere });
    const values = vi.fn().mockResolvedValue(undefined);
    mocks.db.insert.mockReturnValue({ values });

    await rotateCurrentSession("user-1");

    expect(mocks.cookie).toHaveBeenCalledWith(SESSION_COOKIE);
    expect(deleteWhere).toHaveBeenCalledOnce();
    expect(deleteWhere.mock.calls[0]?.[0]).toEqual({
      conditions: [
        expect.objectContaining({ field: "session.tokenHash" }),
        { field: "session.userId", value: "user-1" },
      ],
    });
    expect(values).toHaveBeenCalledWith(expect.objectContaining({ userId: "user-1" }));
  });

  it("no revoca nada si no hay token de cookie y crea una sesión nueva", async () => {
    const values = vi.fn().mockResolvedValue(undefined);
    mocks.db.insert.mockReturnValue({ values });

    await rotateCurrentSession("user-1");

    expect(mocks.db.delete).not.toHaveBeenCalled();
    expect(values).toHaveBeenCalledWith(expect.objectContaining({ userId: "user-1" }));
  });
});
