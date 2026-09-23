import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  const state = {
    updates: [] as unknown[],
    deletes: [] as string[],
    reactivateRows: [{ id: "u1" }] as unknown[],
    deleteError: null as unknown,
    txOrder: [] as string[],
    avatarImageId: null as string | null,
  };

  function chain(next: () => unknown): unknown {
    const target: unknown = new Proxy(function () {}, {
      get(_t, prop) {
        if (prop === "then") {
          const result = Promise.resolve().then(next);
          return result.then.bind(result);
        }
        return () => target;
      },
    });
    return target;
  }

  // El nombre de la tabla lo da el mock de `@/db/schema` (objetos con `__name`).
  const executor = {
    update: () => ({
      set: (value: unknown) => {
        state.updates.push(value);
        state.txOrder.push("update");
        return chain(() => state.reactivateRows);
      },
    }),
    delete: (table: { __name: string }) =>
      chain(() => {
        state.deletes.push(table.__name);
        state.txOrder.push(`delete:${table.__name}`);
        if (state.deleteError && table.__name === "app_user") throw state.deleteError;
        return undefined;
      }),
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve(state.avatarImageId !== null ? [{ avatarImageId: state.avatarImageId }] : [{ avatarImageId: null }]),
        }),
      }),
    }),
  };
  const db = {
    ...executor,
    transaction: async (callback: (tx: typeof executor) => Promise<unknown>) => callback(executor),
  };
  return { state, db, requireRecentAuth: vi.fn() };
});

vi.mock("@/db", () => ({ db: h.db }));
vi.mock("@/db/schema", () => ({
  appUser: { __name: "app_user", id: "app_user.id", deactivatedAt: "app_user.deactivated_at", avatarImageId: "app_user.avatar_image_id" },
  session: { __name: "session", userId: "session.user_id" },
}));
vi.mock("./recent-auth", () => ({ requireRecentAuth: h.requireRecentAuth }));
vi.mock("@/services/storage", () => ({
  imageService: { deleteImage: vi.fn().mockResolvedValue(undefined) },
}));

import { deactivateAccount, deleteAccount, reactivateAccount } from "./account-lifecycle";
import type { ResolvedSession } from "./sessions";

const current = { sessionId: "s1", sessionCreatedAt: new Date(), user: { id: "u1", username: "ana" } } as unknown as ResolvedSession;
const code = async (promise: Promise<unknown>) => {
  try {
    await promise;
    return null;
  } catch (error) {
    return (error as { code?: string }).code ?? "OTHER";
  }
};

beforeEach(() => {
  vi.clearAllMocks();
  h.state.updates = [];
  h.state.deletes = [];
  h.state.txOrder = [];
  h.state.reactivateRows = [{ id: "u1" }];
  h.state.deleteError = null;
  h.state.avatarImageId = null;
  h.requireRecentAuth.mockResolvedValue(undefined);
});

describe("deactivateAccount", () => {
  it("pide el factor de identidad y, en una sola transacción, marca la cuenta y cierra TODAS las sesiones", async () => {
    await deactivateAccount(current, "secreta");

    expect(h.requireRecentAuth).toHaveBeenCalledWith(current, "secreta");
    expect(h.state.updates).toEqual([{ deactivatedAt: expect.any(Date) }]);
    expect(h.state.txOrder).toEqual(["update", "delete:session"]);
  });

  it("no borra ningún contenido de la persona", async () => {
    await deactivateAccount(current);
    expect(h.state.deletes).toEqual(["session"]);
  });

  it("sin el factor de identidad no cambia nada", async () => {
    h.requireRecentAuth.mockRejectedValue(Object.assign(new Error("x"), { code: "INVALID_CREDENTIALS" }));
    expect(await code(deactivateAccount(current, "mala"))).toBe("INVALID_CREDENTIALS");
    expect(h.state.updates).toHaveLength(0);
    expect(h.state.deletes).toHaveLength(0);
  });

  it("una cuenta de Google con sesión antigua recibe REAUTH_REQUIRED sin desactivarse", async () => {
    h.requireRecentAuth.mockRejectedValue(Object.assign(new Error("x"), { code: "REAUTH_REQUIRED" }));
    expect(await code(deactivateAccount(current))).toBe("REAUTH_REQUIRED");
    expect(h.state.updates).toHaveLength(0);
  });
});

describe("reactivateAccount", () => {
  it("borra la marca de desactivación y avisa que reactivó", async () => {
    expect(await reactivateAccount("u1")).toBe(true);
    expect(h.state.updates).toEqual([{ deactivatedAt: null }]);
  });

  it("en una cuenta activa no hace nada y devuelve false", async () => {
    h.state.reactivateRows = [];
    expect(await reactivateAccount("u1")).toBe(false);
  });
});

describe("deleteAccount", () => {
  it("con el usuario correcto y el factor, borra la cuenta (la base borra el resto en cascada)", async () => {
    await deleteAccount(current, { username: "ana", password: "secreta" });
    expect(h.requireRecentAuth).toHaveBeenCalledWith(current, "secreta");
    expect(h.state.deletes).toEqual(["app_user"]);
  });

  it("ignora los espacios de los bordes del usuario de confirmación", async () => {
    await deleteAccount(current, { username: "  ana  " });
    expect(h.state.deletes).toEqual(["app_user"]);
  });

  it.each(["ANA", "otra", ""])("un usuario de confirmación incorrecto (%j) no borra nada ni gasta un intento de contraseña", async (username) => {
    expect(await code(deleteAccount(current, { username, password: "secreta" }))).toBe("VALIDATION_ERROR");
    expect(h.requireRecentAuth).not.toHaveBeenCalled();
    expect(h.state.deletes).toHaveLength(0);
  });

  it("sin el factor de identidad no borra nada", async () => {
    h.requireRecentAuth.mockRejectedValue(Object.assign(new Error("x"), { code: "INVALID_CREDENTIALS" }));
    expect(await code(deleteAccount(current, { username: "ana", password: "mala" }))).toBe("INVALID_CREDENTIALS");
    expect(h.state.deletes).toHaveLength(0);
  });

  it.each(["23001", "23503"])(
    "una cuenta con historial de moderación o editorial (FK %s) responde ACCOUNT_DELETION_BLOCKED",
    async (sqlState) => {
      // RESTRICT (lo que declaran las tablas de auditoría) responde 23001; NO ACTION, 23503.
      h.state.deleteError = { code: sqlState };
      const error = await deleteAccount(current, { username: "ana" }).catch((e: unknown) => e);
      expect(error).toMatchObject({ code: "ACCOUNT_DELETION_BLOCKED", status: 409 });
    },
  );

  it("cualquier otro error de la base se propaga sin traducirse", async () => {
    const boom = { code: "ECONNRESET" };
    h.state.deleteError = boom;
    await expect(deleteAccount(current, { username: "ana" })).rejects.toBe(boom);
  });
});
