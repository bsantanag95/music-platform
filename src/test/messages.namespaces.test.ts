import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

// Este test existe porque un MISSING_MESSAGE en runtime no lo atrapa ni
// `tsc --noEmit` ni los smoke tests mockeados (incidente del change
// add-diary-social-surfaces: `messages/*/feed.json` existía pero no estaba
// registrado en src/i18n/request.ts y la página del feed reventaba con
// MISSING_MESSAGE al abrirla). Acá se valida estáticamente la coherencia
// entre tres fuentes:
//   1. los namespaces registrados en src/i18n/request.ts,
//   2. los archivos *.json presentes en messages/{es,en}/,
//   3. los namespaces referenciados por getTranslations/useTranslations en src/.
// Es un chequeo best-effort sobre literales string: llamadas dinámicas
// (`useTranslations(variable)`) no se pueden detectar sin tocar código.

const root = process.cwd();
const locales = ["es", "en"] as const;

function getRegisteredNamespaces(): string[] {
  const content = fs.readFileSync(path.join(root, "src", "i18n", "request.ts"), "utf-8");
  // Cada namespace se registra como `clave: (await import(`...`)).default`.
  const matches = [
    ...content.matchAll(/^\s*([A-Za-z_$][\w$]*):\s*\(\s*await import\(/gm),
  ];
  return matches.map((m) => m[1]!);
}

function getMessageNamespaces(locale: string): string[] {
  const dir = path.join(root, "messages", locale);
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""));
}

interface Reference {
  ns: string;
  file: string;
}

function getReferencedNamespaces(): Reference[] {
  const refs: Reference[] = [];
  function walk(dir: string): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.name.endsWith(".ts") && !entry.name.endsWith(".tsx")) continue;
      // Los tests pueden usar namespaces falsos a propósito; no cuentan.
      if (/\.test\.tsx?$/.test(entry.name)) continue;
      const content = fs.readFileSync(full, "utf-8");
      for (const m of content.matchAll(/\b(?:get|use)Translations\(\s*["']([\w.-]+)["']/g)) {
        refs.push({
          ns: m[1]!.split(".")[0]!,
          file: path.relative(root, full).replaceAll("\\", "/"),
        });
      }
    }
  }
  walk(path.join(root, "src"));
  return refs;
}

describe("Coherencia de namespaces i18n (request.ts ↔ messages/ ↔ código)", () => {
  it("cada archivo de messages/<locale>/ está registrado en request.ts, para cada locale", () => {
    const registered = getRegisteredNamespaces();
    for (const locale of locales) {
      const files = getMessageNamespaces(locale);
      const missing = files.filter((ns) => !registered.includes(ns));
      expect(
        missing,
        `${missing.join(", ")} existen en messages/${locale}/ pero NO están cargados en src/i18n/request.ts → MISSING_MESSAGE en runtime`,
      ).toHaveLength(0);
    }
  });

  it("no hay namespaces registrados en request.ts sin archivo JSON correspondiente", () => {
    const registered = getRegisteredNamespaces();
    for (const locale of locales) {
      const files = getMessageNamespaces(locale);
      const orphan = registered.filter((ns) => !files.includes(ns));
      expect(
        orphan,
        `request.ts carga ${orphan.join(", ")} pero falta el archivo en messages/${locale}/`,
      ).toHaveLength(0);
    }
  });

  it("es y en exponen el mismo conjunto de namespaces", () => {
    expect(getMessageNamespaces("en").sort()).toEqual(getMessageNamespaces("es").sort());
  });

  it("todo namespace referenciado por el código está registrado en request.ts", () => {
    const registered = getRegisteredNamespaces();
    const refs = getReferencedNamespaces();
    // Sanidad: el escaneo tiene que haber encontrado algo (si la regex deja
    // de matchear, este test se vuelve sordo y hay que arreglarlo).
    expect(refs.length).toBeGreaterThan(0);

    const unregistered = refs.filter((r) => !registered.includes(r.ns));
    expect(
      unregistered,
      `namespaces usados en el código pero ausentes de request.ts: ${[
        ...new Set(unregistered.map((r) => `${r.ns} (${r.file})`)),
      ].join(", ")}`,
    ).toHaveLength(0);
  });
});
