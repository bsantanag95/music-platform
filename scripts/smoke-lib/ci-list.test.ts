// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CI_SMOKES } from "./ci-list";

const scripts = join(import.meta.dirname, "..");

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

  it("ningún smoke de la lista mide tiempos (intermitentes en un runner compartido)", () => {
    for (const name of CI_SMOKES) {
      const text = readFileSync(join(scripts, `smoke-test-${name}.ts`), "utf8");
      expect(text, name).not.toMatch(/performance\.now\(\)|Date\.now\(\) - |hrtime/);
    }
  });
});
