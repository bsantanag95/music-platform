import { beforeEach, describe, expect, it, vi } from "vitest";
import { COLLECTION_REFRESH_DAYS } from "../constants";

const mocks = vi.hoisted(() => ({ db: { select: vi.fn(), transaction: vi.fn(), update: vi.fn() } }));
vi.mock("@/db", () => ({ db: mocks.db }));
vi.mock("next/server", () => ({ after: vi.fn() }));

// Proxy que devuelve `this` para cualquier método encadenado y resuelve a `result` al hacer await.
function chain<T>(result: T): T {
  const promise = Promise.resolve(result);
  const proxy: unknown = new Proxy(function () {}, {
    get(_t, prop) {
      if (prop === "then") return promise.then.bind(promise);
      if (prop === "catch") return promise.catch.bind(promise);
      if (prop === "finally") return promise.finally.bind(promise);
      return () => proxy;
    },
    apply() {
      return proxy;
    },
  });
  return proxy as T;
}

import { staleTemplates, syncCollections } from "./sync";
import { COLLECTION_TEMPLATES } from "./templates";

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-10-11T12:00:00Z");

beforeEach(() => vi.clearAllMocks());

describe("staleTemplates", () => {
  it("sin ninguna corrida exitosa todas las plantillas están vencidas", async () => {
    mocks.db.select.mockReturnValue(chain([]));
    expect((await staleTemplates(NOW)).map((t) => t.key)).toEqual(COLLECTION_TEMPLATES.map((t) => t.key));
  });

  it("una corrida de hace menos de 7 días no vence", async () => {
    mocks.db.select.mockReturnValue(chain([{ finishedAt: new Date(NOW.getTime() - (COLLECTION_REFRESH_DAYS - 1) * DAY) }]));
    expect(await staleTemplates(NOW)).toEqual([]);
  });

  it("una corrida de hace más de 7 días vence", async () => {
    mocks.db.select.mockReturnValue(chain([{ finishedAt: new Date(NOW.getTime() - (COLLECTION_REFRESH_DAYS + 1) * DAY) }]));
    expect(await staleTemplates(NOW)).toHaveLength(COLLECTION_TEMPLATES.length);
  });
});

describe("syncCollections", () => {
  it("rechaza una plantilla desconocida", async () => {
    await expect(syncCollections({ keys: ["no-existe"], force: true })).rejects.toThrow(/desconocida/);
  });

  it("sin plantillas vencidas y sin force no corre nada", async () => {
    mocks.db.select.mockReturnValue(chain([{ finishedAt: NOW }]));
    await expect(syncCollections({ now: NOW })).resolves.toEqual([]);
    expect(mocks.db.transaction).not.toHaveBeenCalled();
  });

  it("una corrida en curso de la misma plantilla se omite", async () => {
    mocks.db.transaction.mockResolvedValue(null);
    const results = await syncCollections({ keys: ["new-releases"], force: true, now: NOW });
    expect(results).toEqual([{ key: "new-releases", status: "skipped" }]);
  });

  it("un fallo al tomar el lock se reporta sin lanzar y no detiene a las demás", async () => {
    mocks.db.transaction.mockRejectedValueOnce(new Error("sin conexión")).mockResolvedValue(null);
    const results = await syncCollections({ force: true, now: NOW });
    expect(results[0]).toMatchObject({ key: COLLECTION_TEMPLATES[0]!.key, status: "failed", error: "sin conexión" });
    expect(results).toHaveLength(COLLECTION_TEMPLATES.length);
  });
});
