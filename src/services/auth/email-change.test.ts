import { beforeEach, describe, expect, it, vi } from "vitest";

// Cadenas de Drizzle simuladas: cada select/delete se resuelve con el siguiente
// resultado encolado, en el orden en que el servicio las ejecuta. El SQL real
// lo cubre scripts/smoke-test-account-settings.ts contra Postgres.
const h = vi.hoisted(() => {
  const state = {
    selects: [] as unknown[][],
    deletes: [] as unknown[][],
    inserts: [] as unknown[],
    updates: [] as unknown[],
    conflictSets: [] as unknown[],
    deleteCount: 0,
    failUpdate: null as unknown,
  };

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
    select: () => chain(() => state.selects.shift() ?? []),
    delete: () =>
      chain(() => {
        state.deleteCount += 1;
        return state.deletes.shift() ?? [];
      }),
    insert: () => ({
      values: (value: unknown) => {
        state.inserts.push(value);
        return {
          onConflictDoUpdate: (config: { set: unknown }) => {
            state.conflictSets.push(config.set);
            return chain(() => undefined);
          },
        };
      },
    }),
    update: () => ({
      set: (value: unknown) => {
        state.updates.push(value);
        return chain(() => {
          if (state.failUpdate) throw state.failUpdate;
          return undefined;
        });
      },
    }),
  };

  const db = {
    ...executor,
    transaction: async (callback: (tx: typeof executor) => Promise<unknown>) => callback(executor),
  };

  return {
    state,
    db,
    getEmailTransport: vi.fn(),
    requireRecentAuth: vi.fn(),
    send: vi.fn(),
  };
});

vi.mock("@/db", () => ({ db: h.db }));
vi.mock("@/services/email", () => ({ getEmailTransport: h.getEmailTransport }));
vi.mock("./recent-auth", () => ({ requireRecentAuth: h.requireRecentAuth }));

import {
  confirmEmailChange,
  EMAIL_CHANGE_TTL_MS,
  findValidEmailChangeToken,
  getPendingEmailChange,
  requestEmailChange,
} from "./email-change";
import type { ResolvedSession } from "./sessions";

const current = {
  sessionId: "s1",
  sessionCreatedAt: new Date(),
  user: { id: "u1", email: "ana@example.com" },
} as unknown as ResolvedSession;

beforeEach(() => {
  vi.clearAllMocks();
  h.state.selects = [];
  h.state.deletes = [];
  h.state.inserts = [];
  h.state.updates = [];
  h.state.conflictSets = [];
  h.state.deleteCount = 0;
  h.state.failUpdate = null;
  h.send.mockResolvedValue(undefined);
  h.getEmailTransport.mockReturnValue({ send: h.send });
  h.requireRecentAuth.mockResolvedValue(undefined);
});

describe("requestEmailChange", () => {
  it("guarda un token con hash de 24 horas y manda el enlace al email NUEVO", async () => {
    h.state.selects = [[]];

    await requestEmailChange(current, { newEmail: "  Nuevo@Ejemplo.com ", password: "pw", locale: "es" });

    expect(h.requireRecentAuth).toHaveBeenCalledWith(current, "pw");
    const stored = h.state.inserts[0] as { userId: string; newEmail: string; tokenHash: string; expiresAt: Date };
    expect(stored).toMatchObject({ userId: "u1", newEmail: "nuevo@ejemplo.com" });
    expect(stored.tokenHash).toHaveLength(64);
    expect(stored.expiresAt.getTime() - Date.now()).toBeGreaterThan(EMAIL_CHANGE_TTL_MS - 5000);

    const message = h.send.mock.calls[0]?.[0] as { to: string; text: string };
    expect(message.to).toBe("nuevo@ejemplo.com");
    expect(message.text).toContain("/es/auth/change-email?token=");
    // El token en claro va en el correo, nunca en la base.
    const token = /token=([^\s&]+)/.exec(message.text)?.[1];
    expect(token).toBeTruthy();
    expect(stored.tokenHash).not.toContain(token);
  });

  it("no cambia el email de la cuenta al pedirlo", async () => {
    h.state.selects = [[]];
    await requestEmailChange(current, { newEmail: "nuevo@ejemplo.com", locale: "es" });
    expect(h.state.updates).toHaveLength(0);
  });

  it("un pedido nuevo reemplaza al pendiente (upsert por usuario)", async () => {
    h.state.selects = [[]];
    await requestEmailChange(current, { newEmail: "otro@ejemplo.com", locale: "en" });
    expect(h.state.conflictSets[0]).toMatchObject({ newEmail: "otro@ejemplo.com" });
    expect((h.send.mock.calls[0]?.[0] as { text: string }).text).toContain("/en/auth/change-email");
  });

  it("rechaza un email inválido para el factor de identidad antes de tocar nada", async () => {
    h.requireRecentAuth.mockRejectedValue(Object.assign(new Error("x"), { code: "INVALID_CREDENTIALS" }));
    await expect(requestEmailChange(current, { newEmail: "nuevo@ejemplo.com", locale: "es" })).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
    });
    expect(h.state.inserts).toHaveLength(0);
    expect(h.send).not.toHaveBeenCalled();
  });

  it("rechaza el email actual, sin distinguir mayúsculas", async () => {
    await expect(requestEmailChange(current, { newEmail: "ANA@example.com", locale: "es" })).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
    expect(h.send).not.toHaveBeenCalled();
  });

  it("rechaza un email de otra cuenta con EMAIL_TAKEN, sin enviar correo", async () => {
    h.state.selects = [[{ id: "otra" }]];
    await expect(requestEmailChange(current, { newEmail: "fran@example.com", locale: "es" })).rejects.toMatchObject({
      code: "EMAIL_TAKEN",
    });
    expect(h.state.inserts).toHaveLength(0);
    expect(h.send).not.toHaveBeenCalled();
  });

  it("falla cerrado: si el envío falla, borra el token y propaga el error", async () => {
    h.state.selects = [[]];
    h.send.mockRejectedValue(new Error("smtp caído"));

    await expect(requestEmailChange(current, { newEmail: "nuevo@ejemplo.com", locale: "es" })).rejects.toThrow(
      "smtp caído",
    );
    expect(h.state.deleteCount).toBe(1);
  });

  it("propaga un transporte no configurado sin gastar el intento de contraseña", async () => {
    h.getEmailTransport.mockImplementation(() => {
      throw new Error("EMAIL_CONFIG_MISSING");
    });
    await expect(requestEmailChange(current, { newEmail: "nuevo@ejemplo.com", locale: "es" })).rejects.toThrow(
      "EMAIL_CONFIG_MISSING",
    );
    expect(h.requireRecentAuth).not.toHaveBeenCalled();
  });
});

describe("confirmEmailChange", () => {
  const valid = () => {
    h.state.deletes = [[{ userId: "u1", newEmail: "nuevo@ejemplo.com" }]];
    h.state.selects = [[{ email: "ana@example.com" }], []];
  };

  it("actualiza el email como verificado, descarta la verificación pendiente y avisa al anterior", async () => {
    valid();

    const result = await confirmEmailChange("token", "es");

    expect(result).toEqual({ email: "nuevo@ejemplo.com" });
    expect(h.state.updates).toEqual([{ email: "nuevo@ejemplo.com", emailVerifiedAt: expect.any(Date) }]);
    // Consumo del token + borrado de tokens de verificación pendientes.
    expect(h.state.deleteCount).toBe(2);
    const notice = h.send.mock.calls[0]?.[0] as { to: string; text: string };
    expect(notice.to).toBe("ana@example.com");
    expect(notice.text).toContain("nuevo@ejemplo.com");
  });

  it("rechaza un enlace vencido o ya usado sin cambiar nada", async () => {
    h.state.deletes = [[]];
    await expect(confirmEmailChange("viejo", "es")).rejects.toMatchObject({ code: "INVALID_VERIFICATION_TOKEN" });
    expect(h.state.updates).toHaveLength(0);
    expect(h.send).not.toHaveBeenCalled();
  });

  it("rechaza con EMAIL_TAKEN si otra cuenta tomó el email entre el pedido y la confirmación", async () => {
    h.state.deletes = [[{ userId: "u1", newEmail: "nuevo@ejemplo.com" }]];
    h.state.selects = [[{ email: "ana@example.com" }], [{ id: "otra" }]];

    await expect(confirmEmailChange("token", "es")).rejects.toMatchObject({ code: "EMAIL_TAKEN" });
    expect(h.state.updates).toHaveLength(0);
    expect(h.send).not.toHaveBeenCalled();
  });

  it("traduce una unique violation por carrera a EMAIL_TAKEN", async () => {
    valid();
    h.state.failUpdate = { code: "23505" };
    await expect(confirmEmailChange("token", "es")).rejects.toMatchObject({ code: "EMAIL_TAKEN" });
  });

  it("un fallo al avisar al email anterior no deshace el cambio", async () => {
    valid();
    h.send.mockRejectedValue(new Error("smtp caído"));
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(confirmEmailChange("token", "es")).resolves.toEqual({ email: "nuevo@ejemplo.com" });
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});

describe("consultas del cambio pendiente", () => {
  it("getPendingEmailChange devuelve el cambio vigente o null", async () => {
    const expiresAt = new Date(Date.now() + 1000);
    h.state.selects = [[{ newEmail: "nuevo@ejemplo.com", expiresAt }]];
    expect(await getPendingEmailChange("u1")).toEqual({ newEmail: "nuevo@ejemplo.com", expiresAt });
    h.state.selects = [[]];
    expect(await getPendingEmailChange("u1")).toBeNull();
  });

  it("findValidEmailChangeToken solo consulta, no consume", async () => {
    h.state.selects = [[{ newEmail: "nuevo@ejemplo.com" }]];
    expect(await findValidEmailChangeToken("token")).toEqual({ newEmail: "nuevo@ejemplo.com" });
    expect(h.state.deleteCount).toBe(0);
  });
});
