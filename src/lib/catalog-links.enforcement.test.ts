import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Cumplimiento de "Enlaces construidos solo con los helpers" (openspec:
// add-catalog-slugs). El id es la verdad y el slug decorativo: cualquier enlace
// público de artista/álbum/canción/reseña/lista debe armarse con los helpers de
// `src/lib/catalog-links.ts`, no con plantillas a mano. Un test que lo comprueba
// evita que el riesgo ("olvidar un sitio al migrar") quede solo documentado.

const SRC = path.resolve(process.cwd(), "src");

/** Módulos exentos: el propio helper, los contratos de la API y los clientes externos. */
const ALLOWED = [
  path.join("lib", "catalog-links.ts"),
  path.join("lib", "catalog-route.ts"),
  path.join("lib", "slug.ts"),
];

/** Prefijos exentos (rutas de API y clientes de servicios externos). */
const ALLOWED_PREFIXES = [
  path.join("lib", "api") + path.sep,
  path.join("services", "musicbrainz") + path.sep,
  path.join("services", "wikimedia") + path.sep,
];

/**
 * Plantillas de enlace público armadas a mano. La comilla o el backtick debe
 * preceder al segmento de ruta y debe haber interpolación (`${…}`) o concatenación
 * real, así no se confunde `/api/catalog/artist/${…}` ni los comentarios
 * (`` `/review/{id}` ``).
 */
const VIOLATIONS: { label: string; regex: RegExp }[] = [
  { label: "artista", regex: /["'`]\/artist\/\$\{/ },
  { label: "álbum", regex: /["'`]\/album\/\$\{/ },
  { label: "canción", regex: /["'`]\/song\/\$\{/ },
  { label: "reseña", regex: /["'`]\/review\/\$\{/ },
  { label: "artista con locale", regex: /["'`]\/\$\{locale\}\/artist\// },
  { label: "álbum con locale", regex: /["'`]\/\$\{locale\}\/album\// },
  { label: "canción con locale", regex: /["'`]\/\$\{locale\}\/song\// },
  { label: "reseña con locale", regex: /["'`]\/\$\{locale\}\/review\// },
  { label: "concatenación", regex: /["'`]\/(?:artist|album|song|review)\/["'`]\s*\+/ },
  { label: "lista pública", regex: /\/users\/\$\{[^}]*\}\/lists\// },
];

/**
 * Lista de excepciones mientras se migra. Debe quedar vacía al cerrar el
 * cambio (openspec: add-catalog-slugs, tarea 6.1).
 */
const EXCEPTIONS = new Set<string>([]);

function isExempt(relative: string): boolean {
  if (relative.endsWith(".test.ts") || relative.endsWith(".test.tsx")) return true;
  if (ALLOWED.includes(relative)) return true;
  return ALLOWED_PREFIXES.some((prefix) => relative.startsWith(prefix));
}

function sourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const absolute = path.join(dir, entry);
    if (statSync(absolute).isDirectory()) files.push(...sourceFiles(absolute));
    else if (/\.(ts|tsx)$/.test(entry)) files.push(absolute);
  }
  return files;
}

function findViolations(): string[] {
  const found: string[] = [];
  for (const absolute of sourceFiles(SRC)) {
    const relative = path.relative(SRC, absolute);
    if (isExempt(relative)) continue;
    const lines = readFileSync(absolute, "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      const match = VIOLATIONS.find((violation) => violation.regex.test(line));
      if (match) found.push(`${relative}:${index + 1} (${match.label}) ${line.trim()}`);
    });
  }
  return found;
}

describe("enlaces del catálogo construidos con los helpers", () => {
  it("no queda ningún enlace armado a mano fuera de los helpers", () => {
    const violations = findViolations().filter(
      (violation) => !EXCEPTIONS.has(violation.split(":")[0]!),
    );
    expect(violations).toEqual([]);
  });
});
