import { afterEach, describe, expect, it, vi } from "vitest";

// El store de trabajo de Next y `after` se reemplazan: el test decide en qué "petición" está y corre los `after` a mano.
const next = vi.hoisted(() => ({ store: undefined as { route: string } | undefined, pending: [] as (() => void)[] }));
vi.mock("next/dist/server/app-render/work-async-storage.external", () => ({
  workAsyncStorage: { getStore: () => next.store },
}));
vi.mock("next/server", () => ({ after: (task: () => void) => next.pending.push(task) }));

const {
  REPEAT_WARN_THRESHOLD,
  TOTAL_WARN_THRESHOLD,
  countQueries,
  formatQueryReport,
  isSuspicious,
  normalizeStatement,
  parseQueryCounterMode,
  queryCounterLogger,
  summarizeQueries,
} = await import("./query-counter");

const BY_ID = 'select "id" from "concert_entry" where "concert_entry"."concert_id" = $1';

function finishRequest() {
  const tasks = next.pending;
  next.pending = [];
  for (const task of tasks) task();
}

afterEach(() => {
  next.store = undefined;
  next.pending = [];
  vi.restoreAllMocks();
});

describe("parseQueryCounterMode", () => {
  it("sin valor: avisa fuera de producción y se apaga en producción", () => {
    expect(parseQueryCounterMode(undefined, "development")).toBe("warn");
    expect(parseQueryCounterMode("", undefined)).toBe("warn");
    expect(parseQueryCounterMode(undefined, "production")).toBe("off");
  });

  it("respeta el modo pedido, también en producción", () => {
    expect(parseQueryCounterMode("ALL", "production")).toBe("all");
    expect(parseQueryCounterMode(" off ", "development")).toBe("off");
  });

  it("un valor desconocido falla en vez de medir en silencio otra cosa", () => {
    expect(() => parseQueryCounterMode("verbose", "development")).toThrow(/DB_QUERY_COUNTER/);
  });
});

describe("normalizeStatement", () => {
  it("un lote de 3 y uno de 30 tienen la misma forma", () => {
    const three = 'select * from "artist" where "id" in ($1, $2, $3)';
    const thirty = `select * from "artist" where "id" in (${Array.from({ length: 30 }, (_, i) => `$${i + 1}`).join(", ")})`;
    expect(normalizeStatement(three)).toBe(normalizeStatement(thirty));
  });

  it("reduce las filas de un VALUES y colapsa los espacios", () => {
    expect(normalizeStatement("insert into t\n  values ($1::uuid, $2::int), ($3::uuid, $4::int)")).toBe(
      "insert into t values ($…)",
    );
  });

  it("un parámetro suelto no cambia", () => {
    expect(normalizeStatement(BY_ID)).toBe(BY_ID);
  });
});

describe("summarizeQueries / isSuspicious", () => {
  it("agrupa por forma y ordena por repeticiones", () => {
    const summary = summarizeQueries([BY_ID, "select 1", BY_ID, BY_ID, "select 2", "select 2"]);
    expect(summary.total).toBe(6);
    expect(summary.repeated).toEqual([
      { statement: BY_ID, count: 3 },
      { statement: "select 2", count: 2 },
    ]);
  });

  it("sospecha con una sentencia repetida hasta el umbral o con demasiadas en total", () => {
    expect(isSuspicious(summarizeQueries(Array(REPEAT_WARN_THRESHOLD - 1).fill(BY_ID)))).toBe(false);
    expect(isSuspicious(summarizeQueries(Array(REPEAT_WARN_THRESHOLD).fill(BY_ID)))).toBe(true);
    const distinct = Array.from({ length: TOTAL_WARN_THRESHOLD }, (_, i) => `select ${i}`);
    expect(isSuspicious(summarizeQueries(distinct))).toBe(true);
  });

  it("el informe nombra la ruta, el total y la sentencia repetida", () => {
    const report = formatQueryReport("/[locale]/artist/[id]", summarizeQueries([...Array(7).fill(BY_ID), "select 1"]));
    expect(report).toBe(`[db] /[locale]/artist/[id] — 8 consultas; posible N+1:\n  7× ${BY_ID}`);
    expect(formatQueryReport("/x", summarizeQueries(["select 1"]))).toBe("[db] /x — 1 consulta");
  });
});

describe("queryCounterLogger", () => {
  it("apagado no crea logger", () => {
    expect(queryCounterLogger("off")).toBeUndefined();
  });

  it("cuenta por petición de Next y avisa al terminarla si hubo un N+1", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const logger = queryCounterLogger("warn")!;
    next.store = { route: "/[locale]/search" };
    for (let i = 0; i < REPEAT_WARN_THRESHOLD; i += 1) logger.logQuery(BY_ID, [i]);
    expect(next.pending).toHaveLength(1); // un solo resumen por petición
    finishRequest();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining(`[db] /[locale]/search — ${REPEAT_WARN_THRESHOLD} consultas`));
  });

  it("en modo warn una petición sana no escribe nada; en modo all sí", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    next.store = { route: "/a" };
    queryCounterLogger("warn")!.logQuery("select 1", []);
    finishRequest();
    expect(warn).not.toHaveBeenCalled();
    expect(info).not.toHaveBeenCalled();

    next.store = { route: "/b" };
    queryCounterLogger("all")!.logQuery("select 1", []);
    finishRequest();
    expect(info).toHaveBeenCalledWith("[db] /b — 1 consulta");
  });

  it("dos peticiones no se mezclan", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const logger = queryCounterLogger("warn")!;
    const first = { route: "/uno" };
    const second = { route: "/dos" };
    for (let i = 0; i < REPEAT_WARN_THRESHOLD - 1; i += 1) {
      next.store = first;
      logger.logQuery(BY_ID, []);
      next.store = second;
      logger.logQuery(BY_ID, []);
    }
    finishRequest();
    expect(warn).not.toHaveBeenCalled();
  });

  it("fuera de una petición y sin countQueries no cuenta ni agenda nada", () => {
    queryCounterLogger("warn")!.logQuery("select 1", []);
    expect(next.pending).toHaveLength(0);
  });
});

describe("countQueries", () => {
  it("cuenta las consultas de su ámbito, aunque haya una petición de Next alrededor", async () => {
    const logger = queryCounterLogger("warn")!;
    next.store = { route: "/x" };
    const { result, summary } = await countQueries(async () => {
      logger.logQuery(BY_ID, []);
      await Promise.resolve();
      logger.logQuery(BY_ID, []);
      return "ok";
    });
    expect(result).toBe("ok");
    expect(summary).toEqual({ total: 2, repeated: [{ statement: BY_ID, count: 2 }] });
    expect(next.pending).toHaveLength(0);
  });
});
