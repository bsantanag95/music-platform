import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const tx = { execute: vi.fn(async () => undefined) };
  return { tx, transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)) };
});
vi.mock("@/db", () => ({ db: { transaction: mocks.transaction } }));

const { inFlightCountForTests, inTransaction, singleFlight, withEntityLock } = await import("./entity-sync");

describe("singleFlight", () => {
  it("las llamadas concurrentes con la misma clave comparten una sola ejecución", async () => {
    let release!: (value: string) => void;
    const task = vi.fn(() => new Promise<string>((resolve) => (release = resolve)));

    const first = singleFlight("k", task);
    const second = singleFlight("k", task);
    await Promise.resolve();
    release("hecho");

    await expect(Promise.all([first, second])).resolves.toEqual(["hecho", "hecho"]);
    expect(task).toHaveBeenCalledTimes(1);
    expect(inFlightCountForTests()).toBe(0);
  });

  it("la ejecución compartida no hereda el contexto asíncrono de la request que llegó primero", async () => {
    const { AsyncLocalStorage } = await import("node:async_hooks");
    const requestStore = new AsyncLocalStorage<string>();
    const seen = await requestStore.run("request-A", () => singleFlight("ctx", async () => requestStore.getStore()));
    expect(seen).toBeUndefined();
  });

  it("lanzar una sincronización con una transacción abierta es una violación", async () => {
    const { runInTransactionScope } = await import("./transaction-guard");
    await runInTransactionScope(async () => {
      expect(() => singleFlight("en-tx", async () => "x")).toThrow(/Sincronización en-tx/);
    });
  });

  it("claves distintas corren por separado", async () => {
    const task = vi.fn(async () => "ok");
    await Promise.all([singleFlight("a", task), singleFlight("b", task)]);
    expect(task).toHaveBeenCalledTimes(2);
  });

  it("un error llega a todas las llamadas y la siguiente vuelve a ejecutar", async () => {
    const failing = vi.fn(async () => {
      throw new Error("MusicBrainz no respondió");
    });
    const results = await Promise.allSettled([singleFlight("k", failing), singleFlight("k", failing)]);
    expect(results.map((r) => r.status)).toEqual(["rejected", "rejected"]);
    expect(failing).toHaveBeenCalledTimes(1);

    await expect(singleFlight("k", async () => "reintento")).resolves.toBe("reintento");
  });
});

describe("withEntityLock", () => {
  it("toma el candado de la entidad dentro de la transacción y devuelve lo que devuelve fn", async () => {
    const result = await withEntityLock("discography:a1", async (tx) => {
      expect(tx).toBe(mocks.tx);
      return 7;
    });
    expect(result).toBe(7);
    expect(mocks.tx.execute).toHaveBeenCalledTimes(1);
  });
});

describe("inTransaction", () => {
  it("con una transacción dada corre dentro de ella sin abrir otra", async () => {
    mocks.transaction.mockClear();
    const given = { marker: true } as never;
    await inTransaction(given, async (tx) => expect(tx).toBe(given));
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("sin transacción abre una propia", async () => {
    mocks.transaction.mockClear();
    await inTransaction(undefined, async (tx) => expect(tx).toBe(mocks.tx));
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
  });
});
