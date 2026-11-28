// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
// El módulo REAL de Next, sin mock: el contador depende de una API interna (`workAsyncStorage`) y este test es lo que
// avisa si una versión nueva de Next cambia su forma o su comportamiento (`query-counter.test.ts` la mockea). Primero
// (el orden de las importaciones importa) el arranque de Next que instala `AsyncLocalStorage` en `globalThis`, como hace
// su servidor: sin él, Next usa un almacén falso (fuera de Next el contador no ve ninguna petición, lo esperado en scripts).
import "next/dist/server/node-environment-baseline";
import { workAsyncStorage, type WorkStore } from "next/dist/server/app-render/work-async-storage.external";

// Solo `after` se reemplaza: fuera de una petición real de Next lanza. El test corre los resúmenes a mano.
const pending = vi.hoisted(() => ({ tasks: [] as (() => void)[] }));
vi.mock("next/server", () => ({ after: (task: () => void) => pending.tasks.push(task) }));

const { REPEAT_WARN_THRESHOLD, queryCounterLogger } = await import("./query-counter");

const STATEMENT = 'select "id" from "concert_entry" where "concert_entry"."concert_id" = $1';

/** Un store de trabajo mínimo: el contador solo lee `route` y lo usa como clave de la petición. */
function request(route: string): WorkStore {
  return { route, page: `${route}/page`, isStaticGeneration: false } as unknown as WorkStore;
}

function finishRequests() {
  const tasks = pending.tasks;
  pending.tasks = [];
  for (const task of tasks) task();
}

afterEach(() => {
  pending.tasks = [];
  vi.restoreAllMocks();
});

describe("contrato con Next: workAsyncStorage", () => {
  it("expone run/getStore y fuera de una petición no hay store", () => {
    expect(typeof workAsyncStorage.run).toBe("function");
    expect(typeof workAsyncStorage.getStore).toBe("function");
    expect(workAsyncStorage.getStore()).toBeUndefined();
  });

  it("el contador ve la petición de Next a través de await y la resume con su ruta", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const logger = queryCounterLogger("warn")!;
    await workAsyncStorage.run(request("/[locale]/artist/[id]"), async () => {
      for (let i = 0; i < REPEAT_WARN_THRESHOLD; i += 1) {
        await Promise.resolve();
        logger.logQuery(STATEMENT, [i]);
      }
    });
    expect(pending.tasks).toHaveLength(1);
    finishRequests();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining(`[db] /[locale]/artist/[id] — ${REPEAT_WARN_THRESHOLD} consultas; posible N+1`));
  });

  it("dos peticiones simultáneas no se mezclan", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const logger = queryCounterLogger("all")!;
    const half = REPEAT_WARN_THRESHOLD - 1;
    const run = (route: string) =>
      workAsyncStorage.run(request(route), async () => {
        for (let i = 0; i < half; i += 1) {
          await new Promise((resolve) => setTimeout(resolve, 0));
          logger.logQuery(STATEMENT, [i]);
        }
      });
    await Promise.all([run("/uno"), run("/dos")]);
    finishRequests();
    // Juntas sumarían 8 repeticiones y avisarían; separadas, cada una tiene 4 y no.
    expect(warn).not.toHaveBeenCalled();
    expect(info.mock.calls.map(([line]) => line).sort()).toEqual([`[db] /dos — ${half} consultas`, `[db] /uno — ${half} consultas`]);
  });
});
