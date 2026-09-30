import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Toda página pública del catálogo canonicaliza con `resolveCatalogRoute` y todo
// layout compartido o modal interceptado —que no reciben la subruta ni el query—
// al menos parsea con `parseCatalogSegment` (openspec: add-catalog-slugs, design
// D5). El test recorre las páginas y falla si alguna se olvida, porque el olvido
// no lo detecta ningún otro test.

const APP = path.resolve(
  process.cwd(),
  "src",
  "app",
  "[locale]",
);

const ROOTS = [
  path.join("(catalog)", "artist"),
  path.join("(catalog)", "album"),
  path.join("(catalog)", "song"),
  "review",
  path.join("users", "[username]", "lists", "[listId]"),
];

function walk(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const absolute = path.join(dir, entry);
    if (statSync(absolute).isDirectory()) files.push(...walk(absolute));
    else if (/\.tsx$/.test(entry)) files.push(absolute);
  }
  return files;
}

interface CatalogFile {
  relative: string;
  content: string;
  mustResolve: boolean;
}

function catalogFiles(): CatalogFile[] {
  const files: CatalogFile[] = [];
  for (const root of ROOTS) {
    const absoluteRoot = path.join(APP, root);
    for (const absolute of walk(absoluteRoot)) {
      const relative = path.relative(APP, absolute);
      const isLayout = absolute.endsWith("layout.tsx");
      const isPage = absolute.endsWith("page.tsx");
      if (!isLayout && !isPage) continue;
      // El layout no conoce la subruta ni el query; el modal interceptado es
      // navegación blanda: ambos solo parsean.
      const mustResolve = isPage && !relative.includes("@modal");
      files.push({ relative, content: readFileSync(absolute, "utf8"), mustResolve });
    }
  }
  return files;
}

/** `loading.tsx` bajo las raíces de catálogo (deben ser ninguno). */
function loadingFiles(): string[] {
  const found: string[] = [];
  for (const root of ROOTS) {
    const absoluteRoot = path.join(APP, root);
    for (const absolute of walk(absoluteRoot)) {
      if (absolute.endsWith("loading.tsx")) found.push(path.relative(APP, absolute));
    }
  }
  return found;
}

describe("canonicalización en las páginas del catálogo", () => {
  const files = catalogFiles();

  it("descubre las páginas y layouts del catálogo", () => {
    expect(files.length).toBeGreaterThan(10);
    expect(files.some((file) => file.relative.includes("@modal"))).toBe(true);
    expect(files.some((file) => file.relative.includes("album") && file.relative.endsWith("layout.tsx"))).toBe(true);
  });

  it.each(files.map((file) => [file.relative, file] as const))(
    "%s canonicaliza",
    (_relative, file) => {
      if (file.mustResolve) expect(file.content).toContain("resolveCatalogRoute");
      else expect(file.content).toContain("parseCatalogSegment");
    },
  );

  // Un `loading.tsx` abre una frontera de Suspense por encima de la página: el
  // redirect/404 se entregaría en el stream (HTTP 200) en vez de un 308/404
  // real. Un test lo impide porque ninguna otra prueba detecta la regresión.
  it("no hay `loading.tsx` arriba de una página que canonicaliza (rompería el 308 real)", () => {
    expect(loadingFiles()).toEqual([]);
  });
});
