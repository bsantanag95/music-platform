// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CI_SMOKES } from "./ci-list";

const scripts = join(import.meta.dirname, "..");

/** Smoke tests de la lista que miden un tiempo, pero solo fallan muy por encima de su presupuesto (5×): detectan un índice perdido, no ruido. */
const TIMING_TOLERANT = new Set(["notifications"]);

describe("CI_SMOKES", () => {
  it("no repite scripts", () => {
    expect(new Set(CI_SMOKES).size).toBe(CI_SMOKES.length);
  });

  it("ingestion va primero: puebla los datos que leen routes y new-endpoints", () => {
    expect(CI_SMOKES[0]).toBe("ingestion");
    for (const dependent of ["routes", "new-endpoints"]) {
      expect(CI_SMOKES.indexOf(dependent)).toBeGreaterThan(0);
    }
  });

  it.each([...CI_SMOKES])("%s existe y llama a assertSmokeAllowed() (REVIEW.md R10)", (name) => {
    const file = join(scripts, `smoke-test-${name}.ts`);
    expect(existsSync(file)).toBe(true);
    expect(readFileSync(file, "utf8")).toContain("assertSmokeAllowed()");
  });

  it("ningún smoke de la lista falla por una medida de tiempo, salvo los tolerantes declarados", () => {
    for (const name of CI_SMOKES) {
      if (TIMING_TOLERANT.has(name)) continue;
      const text = readFileSync(join(scripts, `smoke-test-${name}.ts`), "utf8");
      // `Date.now() - x` se usa para fabricar fechas pasadas, no para medir: solo cuentan los relojes de alta resolución.
      expect(text, name).not.toMatch(/performance\.now\(\)|hrtime/);
    }
  });

  it("los tolerantes tienen un umbral de fallo con holgura, no el presupuesto pelado", () => {
    const text = readFileSync(join(scripts, "smoke-test-notifications.ts"), "utf8");
    expect(text).toContain("COUNTER_FAIL_MS = COUNTER_BUDGET_MS * 5");
  });
});
