import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: { insert: vi.fn(), delete: vi.fn(), select: vi.fn(), update: vi.fn() },
  cookie: vi.fn(),
  userAgent: vi.fn(),
}));

vi.mock("@/db", () => ({ db: mocks.db }));
vi.mock("@/db/schema", () => ({
  appUser: { id: "user.id" },
  session: {
    id: "session.id",
    userId: "session.userId",
    tokenHash: "session.tokenHash",
    expiresAt: "session.expiresAt",
    createdAt: "session.createdAt",
    lastSeenAt: "session.lastSeenAt",
    remember: "session.remember",
  },
}));
vi.mock("drizzle-orm", () => ({
  and: vi.fn((...conditions) => ({ conditions })),
  eq: vi.fn((field, value) => ({ field, value })),
  ne: vi.fn((field, value) => ({ ne: field, value })),
  or: vi.fn((...conditions) => ({ or: conditions })),
  isNull: vi.fn((field) => ({ isNull: field })),
  lt: vi.fn(),
}));
vi.mock("next/headers", () => ({
  cookies: () => ({ get: mocks.cookie }),
  headers: async () => ({ get: mocks.userAgent }),
}));

import {
  createSession,
  deleteAllSessions,
  deleteOtherSessions,
  EPHEMERAL_SESSION_TTL_MS,
  LAST_SEEN_THROTTLE_MS,
  REMEMBER_COOKIE_MAX_AGE_S,
  resolveSession,
  rotateCurrentSession,
  SESSION_COOKIE,
  SESSION_TTL_MS,
  setSessionCookie,
} from "./sessions";

describe("sesiones server-side", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cookie.mockReturnValue(undefined);
    mocks.userAgent.mockReturnValue(null);
  });

  it("crea tokens opacos de sesión mantenida por defecto", async () => {
    const values = vi.fn().mockResolvedValue(undefined);
    mocks.db.insert.mockReturnValue({ values });
    const before = Date.now();
    const result = await createSession("user-1");
    expect(result.token).toHaveLength(43);
    expect(result.remember).toBe(true);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", tokenHash: expect.any(String), remember: true }),
    );
    expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(before + SESSION_TTL_MS);
  });

  it("una sesión no mantenida caduca a las 24 horas", async () => {
    const values = vi.fn().mockResolvedValue(undefined);
    mocks.db.insert.mockReturnValue({ values });
    const before = Date.now();
    const result = await createSession("user-1", { remember: false });
    expect(result.remember).toBe(false);
    expect(values).toHaveBeenCalledWith(expect.objectContaining({ remember: false }));
    expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(before + EPHEMERAL_SESSION_TTL_MS);
    expect(result.expiresAt.getTime()).toBeLessThan(before + EPHEMERAL_SESSION_TTL_MS + 60_000);
  });

  describe("cookie de sesión", () => {
    function cookieOptions(remember?: boolean): Record<string, unknown> {
      const set = vi.fn();
      const response = { cookies: { set } } as unknown as Response;
      if (remember === undefined) setSessionCookie(response, "token");
      else setSessionCookie(response, "token", remember);
      expect(set).toHaveBeenCalledWith(SESSION_COOKIE, "token", expect.any(Object));
      return set.mock.calls[0]?.[2] as Record<string, unknown>;
    }

    it("una sesión mantenida lleva el tope de los navegadores como maxAge", () => {
      expect(cookieOptions(true)).toEqual({
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: REMEMBER_COOKIE_MAX_AGE_S,
      });
      expect(REMEMBER_COOKIE_MAX_AGE_S).toBe(400 * 24 * 60 * 60);
    });

    it("por defecto es mantenida", () => {
      expect(cookieOptions()).toHaveProperty("maxAge", REMEMBER_COOKIE_MAX_AGE_S);
    });

    it("una sesión no mantenida es una cookie de sesión, sin maxAge ni expires", () => {
      const options = cookieOptions(false);
      expect(options).toEqual({ httpOnly: true, secure: true, sameSite: "lax", path: "/" });
      expect(options).not.toHaveProperty("maxAge");
      expect(options).not.toHaveProperty("expires");
    });
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
    const deleteWhere = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([]) });
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

  describe("rotar conserva la elección", () => {
    function rotateFrom(replaced: { remember: boolean }[]) {
      mocks.cookie.mockReturnValue({ value: "cookie-actual" });
      const returning = vi.fn().mockResolvedValue(replaced);
      mocks.db.delete.mockReturnValue({ where: vi.fn().mockReturnValue({ returning }) });
      const values = vi.fn().mockResolvedValue(undefined);
      mocks.db.insert.mockReturnValue({ values });
      return { values, returning };
    }

    it("una sesión no mantenida rota a una no mantenida", async () => {
      const { values } = rotateFrom([{ remember: false }]);
      const result = await rotateCurrentSession("user-1");
      expect(result.remember).toBe(false);
      expect(values).toHaveBeenCalledWith(expect.objectContaining({ remember: false }));
    });

    it("una sesión mantenida rota a una mantenida", async () => {
      const { values } = rotateFrom([{ remember: true }]);
      const result = await rotateCurrentSession("user-1");
      expect(result.remember).toBe(true);
      expect(values).toHaveBeenCalledWith(expect.objectContaining({ remember: true }));
    });

    it("sin sesión que reemplazar (cookie de otro usuario) es mantenida", async () => {
      rotateFrom([]);
      expect((await rotateCurrentSession("user-1")).remember).toBe(true);
    });

    it("una elección explícita manda sobre la sesión reemplazada", async () => {
      const { values } = rotateFrom([{ remember: true }]);
      const result = await rotateCurrentSession("user-1", { remember: false });
      expect(result.remember).toBe(false);
      expect(values).toHaveBeenCalledWith(expect.objectContaining({ remember: false }));
    });
  });

  it("guarda solo la etiqueta del dispositivo, nunca el User-Agent completo", async () => {
    mocks.userAgent.mockReturnValue(
      "Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0",
    );
    const values = vi.fn().mockResolvedValue(undefined);
    mocks.db.insert.mockReturnValue({ values });

    await createSession("user-1");

    const stored = values.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(stored.deviceLabel).toBe("Firefox · Linux");
    expect(stored.lastSeenAt).toBeInstanceOf(Date);
    expect(JSON.stringify(stored)).not.toContain("Mozilla");
  });

  it("deja la sesión sin etiqueta cuando el User-Agent no se reconoce", async () => {
    mocks.userAgent.mockReturnValue("curl/8.4.0");
    const values = vi.fn().mockResolvedValue(undefined);
    mocks.db.insert.mockReturnValue({ values });

    await createSession("user-1");

    expect(values).toHaveBeenCalledWith(expect.objectContaining({ deviceLabel: null }));
  });

  it("cierra todas las sesiones salvo la actual", async () => {
    const where = vi.fn().mockResolvedValue(undefined);
    mocks.db.delete.mockReturnValue({ where });

    await deleteOtherSessions("user-1", "actual");

    expect(where.mock.calls[0]?.[0]).toEqual({
      conditions: [
        { field: "session.userId", value: "user-1" },
        { ne: "session.id", value: "actual" },
      ],
    });
  });

  describe("última actividad", () => {
    function resolvedRow(lastSeenAt: Date | null, remember = true) {
      mocks.cookie.mockReturnValue({ value: "opaque" });
      const row = {
        sessionId: "s1",
        sessionCreatedAt: new Date("2026-09-01T00:00:00Z"),
        lastSeenAt,
        expiresAt: new Date(Date.now() + 60_000),
        remember,
        user: { id: "u1" },
      };
      mocks.db.select.mockReturnValue({
        from: () => ({ innerJoin: () => ({ where: () => ({ limit: vi.fn().mockResolvedValue([row]) }) }) }),
      });
      const where = vi.fn().mockResolvedValue(undefined);
      const set = vi.fn().mockReturnValue({ where });
      mocks.db.update.mockReturnValue({ set });
      return { set, where };
    }

    it("devuelve la fecha de inicio de la sesión para la autenticación reciente", async () => {
      resolvedRow(new Date());
      const result = await resolveSession();
      expect(result?.sessionCreatedAt).toEqual(new Date("2026-09-01T00:00:00Z"));
    });

    it("no escribe si la última actividad es de hace menos de 10 minutos", async () => {
      resolvedRow(new Date(Date.now() - LAST_SEEN_THROTTLE_MS + 60_000));
      await resolveSession();
      expect(mocks.db.update).not.toHaveBeenCalled();
    });

    it("escribe la actividad si pasaron más de 10 minutos", async () => {
      const { set } = resolvedRow(new Date(Date.now() - LAST_SEEN_THROTTLE_MS - 60_000));
      await resolveSession();
      expect(mocks.db.update).toHaveBeenCalledOnce();
      expect(set).toHaveBeenCalledWith({ lastSeenAt: expect.any(Date), expiresAt: expect.any(Date) });
    });

    it("una sesión mantenida extiende su vencimiento 30 días desde la actividad", async () => {
      const { set } = resolvedRow(null);
      const before = Date.now();
      await resolveSession();
      const written = set.mock.calls[0]?.[0] as { lastSeenAt: Date; expiresAt: Date };
      expect(written.expiresAt.getTime()).toBeGreaterThanOrEqual(before + SESSION_TTL_MS);
      expect(written.expiresAt.getTime()).toBeLessThan(before + SESSION_TTL_MS + 60_000);
    });

    it("una sesión no mantenida registra la actividad pero no se renueva", async () => {
      const { set } = resolvedRow(null, false);
      await resolveSession();
      expect(set).toHaveBeenCalledWith({ lastSeenAt: expect.any(Date) });
      expect(set.mock.calls[0]?.[0]).not.toHaveProperty("expiresAt");
    });

    it("escribe la actividad de una sesión anterior al registro (sin fecha)", async () => {
      resolvedRow(null);
      await resolveSession();
      expect(mocks.db.update).toHaveBeenCalledOnce();
    });

    it("una ráfaga de peticiones dentro de la ventana escribe como mucho una vez", async () => {
      // Cada resolución compara con la fecha guardada; tras escribir, la base
      // devuelve la fecha nueva, así que las siguientes ya no escriben.
      resolvedRow(null);
      await resolveSession();
      resolvedRow(new Date());
      mocks.db.update.mockClear();
      for (let request = 0; request < 20; request++) await resolveSession();
      expect(mocks.db.update).not.toHaveBeenCalled();
    });
  });
});
