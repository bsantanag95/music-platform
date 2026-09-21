import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  const state = { updates: [] as unknown[], deleteCount: 0, createRows: [{ id: "u1" }] as unknown[] };

  function chain(next: () => unknown): unknown {
    const target: unknown = new Proxy(function () {}, {
      get(_t, prop) {
        if (prop === "then") {
          const result = Promise.resolve(next());
          return result.then.bind(result);
        }
        return () => target;
      },
    });
    return target;
  }

  const executor = {
    update: () => ({
      set: (value: unknown) => {
        state.updates.push(value);
        return chain(() => state.createRows);
      },
    }),
    delete: () =>
      chain(() => {
        state.deleteCount += 1;
        return undefined;
      }),
  };
  const db = {
    ...executor,
    transaction: async (callback: (tx: typeof executor) => Promise<unknown>) => callback(executor),
  };

  return {
    state,
    db,
    requireRecentAuth: vi.fn(),
    deleteOtherSessions: vi.fn(),
    send: vi.fn(),
    getEmailTransport: vi.fn(),
  };
});

vi.mock("@/db", () => ({ db: h.db }));
vi.mock("./recent-auth", () => ({ requireRecentAuth: h.requireRecentAuth }));
vi.mock("./sessions", () => ({ deleteOtherSessions: h.deleteOtherSessions }));
vi.mock("@/services/email", () => ({ getEmailTransport: h.getEmailTransport }));

import { hashPassword, verifyPassword } from "./password";
import { changePassword, createPassword } from "./password-change";
import type { ResolvedSession } from "./sessions";

async function sessionFor(password: string | null): Promise<ResolvedSession> {
  return {
    sessionId: "s1",
    sessionCreatedAt: new Date(),
    user: {
      id: "u1",
      email: "ana@example.com",
      passwordHash: password === null ? null : await hashPassword(password),
    },
  } as unknown as ResolvedSession;
}

beforeEach(() => {
  vi.clearAllMocks();
  h.state.updates = [];
  h.state.deleteCount = 0;
  h.state.createRows = [{ id: "u1" }];
  h.requireRecentAuth.mockResolvedValue(undefined);
  h.send.mockResolvedValue(undefined);
  h.getEmailTransport.mockReturnValue({ send: h.send });
});

describe("changePassword", () => {
  const input = { currentPassword: "actual-123", newPassword: "nueva-456", revokeOtherSessions: false, locale: "es" };

  it("guarda el hash nuevo (nunca la contraseña), invalida los tokens de reset y avisa por correo", async () => {
    const current = await sessionFor("actual-123");

    await changePassword(current, input);

    expect(h.requireRecentAuth).toHaveBeenCalledWith(current, "actual-123");
    const stored = (h.state.updates[0] as { passwordHash: string }).passwordHash;
    expect(stored).not.toContain("nueva-456");
    expect(await verifyPassword(stored, "nueva-456")).toBe(true);
    expect(h.state.deleteCount).toBe(1);
    expect((h.send.mock.calls[0]?.[0] as { to: string }).to).toBe("ana@example.com");
  });

  it("con revokeOtherSessions cierra las demás sesiones y conserva la actual", async () => {
    const current = await sessionFor("actual-123");
    await changePassword(current, { ...input, revokeOtherSessions: true });
    expect(h.deleteOtherSessions).toHaveBeenCalledWith("u1", "s1");
  });

  it("sin revokeOtherSessions no toca las demás sesiones", async () => {
    await changePassword(await sessionFor("actual-123"), input);
    expect(h.deleteOtherSessions).not.toHaveBeenCalled();
  });

  it("propaga una contraseña actual incorrecta sin cambiar nada", async () => {
    h.requireRecentAuth.mockRejectedValue(Object.assign(new Error("x"), { code: "INVALID_CREDENTIALS" }));
    await expect(changePassword(await sessionFor("actual-123"), input)).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
    });
    expect(h.state.updates).toHaveLength(0);
    expect(h.deleteOtherSessions).not.toHaveBeenCalled();
  });

  it("rechaza una contraseña nueva igual a la actual", async () => {
    await expect(
      changePassword(await sessionFor("actual-123"), { ...input, newPassword: "actual-123" }),
    ).rejects.toMatchObject({ code: "PASSWORD_REUSED" });
    expect(h.state.updates).toHaveLength(0);
  });

  it("rechaza cambiar la contraseña de una cuenta que no tiene", async () => {
    await expect(changePassword(await sessionFor(null), input)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(h.requireRecentAuth).not.toHaveBeenCalled();
  });

  it("un fallo del correo no deshace el cambio", async () => {
    h.send.mockRejectedValue(new Error("smtp caído"));
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(changePassword(await sessionFor("actual-123"), input)).resolves.toBeUndefined();
    expect(h.state.updates).toHaveLength(1);
    log.mockRestore();
  });
});

describe("createPassword", () => {
  it("crea la contraseña de una cuenta sin ella con autenticación reciente", async () => {
    const current = await sessionFor(null);
    await createPassword(current, { newPassword: "nueva-456", locale: "en" });
    expect(h.requireRecentAuth).toHaveBeenCalledWith(current);
    const stored = (h.state.updates[0] as { passwordHash: string }).passwordHash;
    expect(await verifyPassword(stored, "nueva-456")).toBe(true);
    expect(h.send).toHaveBeenCalled();
  });

  it("propaga REAUTH_REQUIRED sin crear nada", async () => {
    h.requireRecentAuth.mockRejectedValue(Object.assign(new Error("x"), { code: "REAUTH_REQUIRED" }));
    await expect(createPassword(await sessionFor(null), { newPassword: "nueva-456", locale: "es" })).rejects.toMatchObject({
      code: "REAUTH_REQUIRED",
    });
    expect(h.state.updates).toHaveLength(0);
  });

  it("rechaza crear una contraseña en una cuenta que ya tiene", async () => {
    await expect(
      createPassword(await sessionFor("actual-123"), { newPassword: "nueva-456", locale: "es" }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(h.state.updates).toHaveLength(0);
  });

  it("no pisa una contraseña creada en paralelo (el UPDATE no afecta filas)", async () => {
    h.state.createRows = [];
    await expect(
      createPassword(await sessionFor(null), { newPassword: "nueva-456", locale: "es" }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(h.send).not.toHaveBeenCalled();
  });
});
