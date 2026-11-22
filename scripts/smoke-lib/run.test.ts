// @vitest-environment node
import { describe, expect, it } from "vitest";
import { executeSmoke } from "./run";

const silent = () => {};

describe("executeSmoke", () => {
  it("termina en 0 cuando todo pasa y limpia antes y después", async () => {
    const calls: string[] = [];
    const out = await executeSmoke(
      {
        name: "ok",
        cleanup: async () => void calls.push("cleanup"),
        run: async (ctx) => {
          calls.push("run");
          ctx.check(true, "algo");
        },
      },
      silent,
    );
    expect(out).toMatchObject({ exitCode: 0, failures: 0 });
    expect(calls).toEqual(["cleanup", "run", "cleanup"]);
  });

  it("un check fallido da código 1 aunque el script no lance", async () => {
    const out = await executeSmoke({ name: "x", run: async (ctx) => ctx.check(false, "no se cumplió") }, silent);
    expect(out.exitCode).toBe(1);
    expect(out.failures).toBe(1);
    expect(out.log.some((l) => l.startsWith("❌ no se cumplió"))).toBe(true);
  });

  it("si el script lanza, limpia igual y sale con 1", async () => {
    let cleaned = 0;
    const out = await executeSmoke(
      {
        name: "boom",
        cleanup: async () => void cleaned++,
        run: async () => {
          throw new Error("explotó");
        },
      },
      silent,
    );
    expect(out.exitCode).toBe(1);
    expect(cleaned).toBe(2);
    expect(out.log.join("\n")).toContain("explotó");
  });

  it("un fallo de limpieza se informa pero no tapa el error original", async () => {
    let n = 0;
    const out = await executeSmoke(
      {
        name: "x",
        cleanup: async () => {
          if (++n === 2) throw new Error("no pude borrar");
        },
        run: async () => {
          throw new Error("error original");
        },
      },
      silent,
    );
    const text = out.log.join("\n");
    expect(out.exitCode).toBe(1);
    expect(text).toContain("error original");
    expect(text).toContain("no pude borrar");
  });

  it("un fallo de limpieza con un script correcto también falla (quedaron fixtures)", async () => {
    let n = 0;
    const out = await executeSmoke(
      {
        name: "x",
        cleanup: async () => {
          if (++n === 2) throw new Error("quedó basura");
        },
        run: async (ctx) => ctx.check(true, "bien"),
      },
      silent,
    );
    expect(out.exitCode).toBe(1);
  });

  it("si exige BD virgen y no lo está, aborta sin limpiar ni correr nada", async () => {
    const calls: string[] = [];
    const out = await executeSmoke(
      {
        name: "ingestion",
        pristineCheck: async () => "Pink Floyd ya tiene la discografía sincronizada",
        cleanup: async () => void calls.push("cleanup"),
        run: async () => void calls.push("run"),
      },
      silent,
    );
    expect(out.exitCode).toBe(1);
    expect(calls).toEqual([]);
    expect(out.log.join("\n")).toContain("virgen");
  });

  it("con BD virgen corre normalmente", async () => {
    const out = await executeSmoke(
      { name: "x", pristineCheck: async () => null, run: async (ctx) => ctx.check(true, "ok") },
      silent,
    );
    expect(out.exitCode).toBe(0);
  });
});
