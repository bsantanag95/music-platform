import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertNoOpenTransaction,
  guardDatabase,
  isTransactionOpen,
  runInTransactionScope,
  TransactionGuardError,
} from "./transaction-guard";

// Cliente falso con la forma mínima de Drizzle: `select` ejecuta y `transaction` entrega un `tx` propio.
function fakeClient() {
  const tx = { select: vi.fn(() => "tx-select") };
  const client = {
    select: vi.fn(() => "global-select"),
    transaction: vi.fn(async <T>(fn: (t: typeof tx) => Promise<T>) => fn(tx)),
    /** No es un miembro vigilado. */
    dialect: "pg",
  };
  return { client, tx, db: guardDatabase(client) };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("guardDatabase", () => {
  it("fuera de una transacción el cliente global funciona igual", () => {
    const { db, client } = fakeClient();
    expect(db.select()).toBe("global-select");
    expect(client.select).toHaveBeenCalledTimes(1);
    expect(db.dialect).toBe("pg");
  });

  it("dentro de una transacción, el tx de Drizzle funciona y el cliente global lanza", async () => {
    const { db } = fakeClient();
    await db.transaction(async (tx) => {
      expect(isTransactionOpen()).toBe(true);
      expect(tx.select()).toBe("tx-select");
      expect(() => db.select()).toThrow(TransactionGuardError);
      expect(() => db.select()).toThrow(/db\.select/);
    });
    expect(isTransactionOpen()).toBe(false);
  });

  it("una transacción anidada sobre el cliente global también es una violación", async () => {
    const { db } = fakeClient();
    await expect(db.transaction(async () => db.transaction(async () => undefined))).rejects.toThrow(TransactionGuardError);
  });

  it("una promesa que sobrevive a la transacción ya no cuenta como violación", async () => {
    const { db } = fakeClient();
    let later: Promise<unknown> = Promise.resolve();
    await db.transaction(async () => {
      later = new Promise((resolve) => setTimeout(resolve, 5)).then(() => db.select());
    });
    await expect(later).resolves.toBe("global-select");
  });

  it("en producción registra el error y deja seguir", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { db } = fakeClient();
    await db.transaction(async () => {
      expect(db.select()).toBe("global-select");
    });
    expect(error).toHaveBeenCalledWith(expect.any(TransactionGuardError));
  });
});

describe("assertNoOpenTransaction", () => {
  it("lanza dentro de una transacción y nombra el origen", async () => {
    await runInTransactionScope(async () => {
      expect(() => assertNoOpenTransaction("MusicBrainz")).toThrow(/Request a MusicBrainz/);
    });
  });

  it("no hace nada fuera de una transacción", () => {
    expect(() => assertNoOpenTransaction("MusicBrainz")).not.toThrow();
  });
});
