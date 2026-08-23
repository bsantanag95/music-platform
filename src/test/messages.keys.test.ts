import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

// Extensión a nivel clave de messages.namespaces.test.ts: ahí se valida que
// los *namespaces* estén registrados y con archivo; acá se valida que cada
// clave estática referenciada por el código exista como hoja en los JSON de
// AMBOS locales (un MISSING_MESSAGE de clave suelta tampoco lo atrapa ni
// tsc ni vitest normal).
//
// Estrategia best-effort sobre literales:
//   1. En cada .ts/.tsx de src/ (sin tests), se bindean variables del tipo
//      `const tX = await getTranslations("ns.sub")` / `useTranslations(...)`,
//      guardando nombre de variable → ruta de namespace.
//   2. Cada llamada estática `tX("clave")` resuelve a `ns.sub.clave`.
//   3. Se verifica la existencia de esa ruta en el árbol de mensajes es/en.
//
// No cubre (y falla silenciosamente en el buen sentido, sin falsos positivos):
//   - claves dinámicas (template literals / variables, ej. AuthForm),
//   - llamadas sin asignación a constante (`return getTranslations(...)("x")`),
//   - claves dentro de comentarios que parezcan llamadas (falso positivo
//     posible pero inocuo: exigiría que además no exista en los JSON).

const root = process.cwd();
const locales = ["es", "en"] as const;

type MessageTree = { [key: string]: string | MessageTree };

function loadMessageTree(locale: string): MessageTree {
  const dir = path.join(root, "messages", locale);
  const tree: MessageTree = {};
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    tree[file.replace(/\.json$/, "")] = JSON.parse(
      fs.readFileSync(path.join(dir, file), "utf-8"),
    ) as MessageTree;
  }
  return tree;
}

function hasLeaf(tree: MessageTree, dotPath: string): boolean {
  let node: string | MessageTree | undefined = tree;
  for (const segment of dotPath.split(".")) {
    if (typeof node !== "object" || node === null || !(segment in node)) return false;
    node = node[segment];
  }
  return typeof node === "string";
}

function escapeRegExp(value: string): string {
  return value.replaceAll(/[$()*+.?[\\\]^{|}]/g, "\\$&");
}

interface Usage {
  fullKey: string;
  file: string;
}

function scanSourceFiles(): Usage[] {
  const usages: Usage[] = [];
  function walk(dir: string): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.name.endsWith(".ts") && !entry.name.endsWith(".tsx")) continue;
      // Los tests pueden usar namespaces/claves falsas a propósito; no cuentan.
      if (/\.test\.tsx?$/.test(entry.name)) continue;
      const relative = path.relative(root, full).replaceAll("\\", "/");
      const content = fs.readFileSync(full, "utf-8");

      // Un mismo nombre de variable puede bindearse dos veces en un archivo
      // con namespaces distintos (dos componentes, ej. users/[username]/page.tsx
      // usa `t` para "diary" y luego para "users"). Cada uso se atribuye al
      // binding MÁS CERCANO que lo antecede en el archivo, no a todos.
      interface Binding {
        variable: string;
        namespace: string;
        index: number;
      }
      const bindings: Binding[] = [
        ...content.matchAll(
          /const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:await\s+)?(?:get|use)Translations\(\s*["']([A-Za-z_$][\w.$-]*)["']\s*\)/g,
        ),
      ].map((m) => ({ variable: m[1]!, namespace: m[2]!, index: m.index ?? 0 }));

      const scanned = new Set<string>();
      for (const binding of bindings) {
        if (scanned.has(binding.variable)) continue;
        scanned.add(binding.variable);
        const callPattern = new RegExp(
          `\\b${escapeRegExp(binding.variable)}\\(\\s*["']([^"'\\n]+)["']\\s*[,)]`,
          "g",
        );
        for (const match of content.matchAll(callPattern)) {
          const nearest = bindings
            .filter((b) => b.variable === binding.variable && b.index < (match.index ?? 0))
            .sort((a, b) => b.index - a.index)[0];
          if (!nearest) continue;
          usages.push({ fullKey: `${nearest.namespace}.${match[1]!}`, file: relative });
        }
      }
    }
  }
  walk(path.join(root, "src"));
  return usages;
}

describe("Claves i18n referenciadas por el código existen en ambos locales", () => {
  const trees = Object.fromEntries(locales.map((l) => [l, loadMessageTree(l)]));
  const usages = scanSourceFiles();

  // Sanidad anti-sordera: si la regex deja de matchear (refactor de next-intl,
  // cambio de convención de nombres), este test quedaría en verde vacío.
  it("el escaneo encuentra un volumen razonable de claves estáticas", () => {
    const distinct = new Set(usages.map((u) => u.fullKey));
    expect(distinct.size).toBeGreaterThan(30);
    // Claves conocidas de superficies recientes: prueban que el escaneo llega
    // tanto a páginas server como a componentes client.
    expect(distinct.has("feed.title")).toBe(true);
    expect(distinct.has("diary.profileEmptyTitle")).toBe(true);
  });

  for (const locale of locales) {
    it(`todas las claves estáticas existen en messages/${locale}/`, () => {
      const missing = usages.filter((u) => !hasLeaf(trees[locale]!, u.fullKey));
      const summary = [
        ...new Set(missing.map((u) => `${u.fullKey} (${u.file})`)),
      ];
      expect(
        missing,
        `claves MISSING_MESSAGE en ${locale}: ${summary.slice(0, 20).join(", ")}`,
      ).toHaveLength(0);
    });
  }
});
