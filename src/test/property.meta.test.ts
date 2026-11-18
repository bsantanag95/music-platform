// @vitest-environment node
// `fast-check` es solo de desarrollo (change strengthen-verification-loop, fase 4): ningún archivo de la aplicación puede importarlo, así
// no puede llegar al build de producción. Solo lo importan los tests (`*.test.ts[x]`) y la ayuda `src/test/property.ts`.

import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(import.meta.dirname, "..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

describe("fast-check solo en desarrollo", () => {
  it("solo los tests y src/test/property.ts lo importan", () => {
    const offenders = sourceFiles(SRC)
      .filter((file) => /from\s+["']fast-check["']|require\(["']fast-check["']\)/.test(readFileSync(file, "utf8")))
      .map((file) => relative(SRC, file).replace(/\\/g, "/"))
      .filter((file) => !/\.test\.tsx?$/.test(file) && file !== "test/property.ts");
    expect(offenders).toEqual([]);
  });

  it("está declarado únicamente en devDependencies", () => {
    const pkg = JSON.parse(readFileSync(join(SRC, "..", "package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    expect(pkg.dependencies?.["fast-check"]).toBeUndefined();
    expect(pkg.devDependencies?.["fast-check"]).toBeDefined();
  });
});
