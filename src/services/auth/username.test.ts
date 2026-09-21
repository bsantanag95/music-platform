import { beforeEach, describe, expect, it, vi } from "vitest";

// db.select/delete/insert/update devuelven cadenas que se resuelven con el
// siguiente resultado encolado (por operación), en el orden en que el servicio
// las ejecuta. Las cadenas ignoran los detalles de Drizzle: lo que se prueba es
// la lógica de decisión y lo que se escribe, no el SQL (eso lo cubre el smoke
// contra Postgres real: scripts/smoke-test-account-settings.ts).
const { state, chain, tx, db } = vi.hoisted(() => {
  const state = {
    selects: [] as unknown[][],
    deletes: 0,
    inserts: [] as unknown[],
    updates: [] as unknown[],
    txSelects: [] as unknown[][],
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

  const tx = {
    select: () => chain(() => state.txSelects.shift() ?? []),
    delete: () =>
      chain(() => {
        state.deletes += 1;
        return undefined;
      }),
    insert: () => ({
      values: (value: unknown) => {
        state.inserts.push(value);
        return chain(() => undefined);
      },
    }),
    update: () => ({
      set: (value: unknown) => {
        state.updates.push(value);
        return chain(() => undefined);
      },
    }),
  };

  const db = {
    select: () => chain(() => state.selects.shift() ?? []),
    transaction: async (callback: (t: typeof tx) => Promise<unknown>) => callback(tx),
  };

  return { state, chain, tx, db };
});
vi.mock("@/db", () => ({ db }));

import {
  changeUsername,
  checkUsernameAvailability,
  isUsernameReserved,
  nextUsernameChangeAt,
  resolveUsernameAlias,
} from "./username";

const day = 24 * 60 * 60 * 1000;

beforeEach(() => {
  state.selects = [];
  state.txSelects = [];
  state.deletes = 0;
  state.inserts = [];
  state.updates = [];
});

describe("nextUsernameChangeAt", () => {
  it("es null si nunca cambió o el enfriamiento ya pasó", () => {
    expect(nextUsernameChangeAt(null)).toBeNull();
    expect(nextUsernameChangeAt(new Date(Date.now() - 31 * day))).toBeNull();
  });

  it("devuelve la fecha en que vuelve a estar permitido", () => {
    const changedAt = new Date(Date.now() - 10 * day);
    expect(nextUsernameChangeAt(changedAt)?.getTime()).toBe(changedAt.getTime() + 30 * day);
  });
});

describe("checkUsernameAvailability", () => {
  it("marca inválidos los usuarios con puntos o demasiado cortos, sin consultar la base", async () => {
    expect(await checkUsernameAvailability("u1", "hola.mundo")).toEqual({
      valid: false,
      available: false,
      reason: "invalid_chars",
    });
    expect((await checkUsernameAvailability("u1", "ab")).reason).toBe("too_short");
    expect((await checkUsernameAvailability("u1", "a".repeat(33))).reason).toBe("too_long");
  });

  it("detecta el usuario actual", async () => {
    state.selects = [[{ username: "besantanag95" }]];
    expect(await checkUsernameAvailability("u1", "besantanag95")).toEqual({
      valid: true,
      available: false,
      reason: "current",
    });
  });

  it("detecta un usuario en uso por otra cuenta", async () => {
    state.selects = [[{ username: "besan" }], [{ id: "otra" }]];
    expect(await checkUsernameAvailability("u1", "Fran")).toMatchObject({ available: false, reason: "taken" });
  });

  it("detecta un usuario reservado por otra persona", async () => {
    state.selects = [[{ username: "besan" }], [], [{ userId: "otra" }]];
    expect(await checkUsernameAvailability("u1", "viejo_usuario")).toMatchObject({
      available: false,
      reason: "taken",
    });
  });

  it("permite recuperar el propio usuario reservado", async () => {
    state.selects = [[{ username: "nuevo" }], [], [{ userId: "u1" }]];
    expect(await checkUsernameAvailability("u1", "viejo_usuario")).toEqual({
      valid: true,
      available: true,
      reason: null,
    });
  });

  it("devuelve disponible sin exponer datos de otras cuentas", async () => {
    state.selects = [[{ username: "besan" }], [], []];
    expect(await checkUsernameAvailability("u1", "nuevo_user")).toEqual({
      valid: true,
      available: true,
      reason: null,
    });
  });
});

describe("changeUsername", () => {
  it("aplica un primer cambio, reserva el usuario anterior y registra la fecha", async () => {
    state.txSelects = [[{ username: "besantanag95", usernameChangedAt: null }], [], []];

    const result = await changeUsername("u1", "  besan_music ");

    expect(result.username).toBe("besan_music");
    expect(state.inserts).toHaveLength(1);
    expect(state.inserts[0]).toMatchObject({ userId: "u1", username: "besantanag95" });
    const alias = state.inserts[0] as { expiresAt: Date };
    expect(alias.expiresAt.getTime() - Date.now()).toBeGreaterThan(29.9 * day);
    expect(state.updates).toEqual([{ username: "besan_music", usernameChangedAt: expect.any(Date) }]);
  });

  it("rechaza un usuario inválido sin abrir la transacción", async () => {
    await expect(changeUsername("u1", "hola.mundo")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(state.updates).toHaveLength(0);
  });

  it("rechaza el mismo usuario", async () => {
    state.txSelects = [[{ username: "besantanag95", usernameChangedAt: null }]];
    await expect(changeUsername("u1", "besantanag95")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(state.inserts).toHaveLength(0);
  });

  it("rechaza un cambio dentro del enfriamiento e indica la fecha", async () => {
    const changedAt = new Date(Date.now() - 10 * day);
    state.txSelects = [[{ username: "besantanag95", usernameChangedAt: changedAt }]];

    const error = await changeUsername("u1", "otro_usuario").catch((e: unknown) => e);

    expect(error).toMatchObject({ code: "USERNAME_CHANGE_COOLDOWN" });
    expect((error as Error).message).toContain(new Date(changedAt.getTime() + 30 * day).toISOString());
    expect(state.updates).toHaveLength(0);
    expect(state.inserts).toHaveLength(0);
  });

  it("permite el cambio pasado el enfriamiento", async () => {
    state.txSelects = [[{ username: "viejo", usernameChangedAt: new Date(Date.now() - 31 * day) }], [], []];
    await expect(changeUsername("u1", "otro_usuario")).resolves.toMatchObject({ username: "otro_usuario" });
  });

  it("rechaza un usuario en uso por otra cuenta (sin distinguir mayúsculas)", async () => {
    state.txSelects = [[{ username: "besan", usernameChangedAt: null }], [{ id: "otra" }]];
    await expect(changeUsername("u1", "fran")).rejects.toMatchObject({ code: "USERNAME_TAKEN" });
    expect(state.updates).toHaveLength(0);
  });

  it("rechaza un usuario reservado por otra persona", async () => {
    state.txSelects = [[{ username: "besan", usernameChangedAt: null }], [], [{ id: "a1", userId: "otra" }]];
    await expect(changeUsername("u1", "usuario_viejo")).rejects.toMatchObject({ code: "USERNAME_TAKEN" });
    expect(state.updates).toHaveLength(0);
  });

  it("recuperar el propio usuario anterior libera su reserva y reserva el actual", async () => {
    state.txSelects = [[{ username: "nuevo", usernameChangedAt: new Date(Date.now() - 40 * day) }], [], [{ id: "a1", userId: "u1" }]];

    const result = await changeUsername("u1", "viejo_usuario");

    expect(result.username).toBe("viejo_usuario");
    // Borra vencidos + la reserva propia recuperada + cualquier reserva propia del actual.
    expect(state.deletes).toBe(3);
    expect(state.inserts[0]).toMatchObject({ userId: "u1", username: "nuevo" });
  });

  it("traduce una unique violation por carrera a USERNAME_TAKEN", async () => {
    state.txSelects = [[{ username: "besan", usernameChangedAt: null }], [], []];
    const failing = { ...tx, update: () => ({ set: () => chain(() => { throw { code: "23505" }; }) }) };
    const original = db.transaction;
    db.transaction = async (callback) => callback(failing as unknown as typeof tx);
    try {
      await expect(changeUsername("u1", "nuevo_user")).rejects.toMatchObject({ code: "USERNAME_TAKEN" });
    } finally {
      db.transaction = original;
    }
  });
});

describe("reservas", () => {
  it("isUsernameReserved refleja si hay un alias vigente", async () => {
    state.selects = [[{ id: "a1" }]];
    expect(await isUsernameReserved("viejo")).toBe(true);
    state.selects = [[]];
    expect(await isUsernameReserved("libre")).toBe(false);
  });

  it("resolveUsernameAlias devuelve el usuario actual del alias vigente o null", async () => {
    state.selects = [[{ username: "besan_music" }]];
    expect(await resolveUsernameAlias("besantanag95")).toBe("besan_music");
    state.selects = [[]];
    expect(await resolveUsernameAlias("nadie")).toBeNull();
  });
});
