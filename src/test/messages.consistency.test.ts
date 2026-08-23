import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

function getKeys(obj: unknown, prefix = ""): string[] {
  const keys: string[] = [];
  if (typeof obj === "object" && obj !== null) {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof value === "object" && value !== null) {
        keys.push(...getKeys(value, fullKey));
      } else {
        keys.push(fullKey);
      }
    }
  }
  return keys;
}

function loadJson(filePath: string): unknown {
  const content = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(content);
}

describe("Consistencia de mensajes i18n", () => {
  const namespaces = ["common", "catalog", "errors", "auth", "users", "diary", "feed"] as const;
  const locales = ["es", "en"] as const;

  for (const namespace of namespaces) {
    it(`namespace "${namespace}" tiene las mismas claves en todos los locales`, () => {
      const keysByLocale: Record<string, string[]> = {};

      for (const locale of locales) {
        const filePath = path.join(
          process.cwd(),
          "messages",
          locale,
          `${namespace}.json`,
        );
        const data = loadJson(filePath);
        keysByLocale[locale] = getKeys(data).sort();
      }

      const referenceKeys = keysByLocale["es"]!;

      for (const locale of locales) {
        if (locale === "es") continue;
        const localeKeys = keysByLocale[locale]!;

        const missing = referenceKeys.filter((k) => !localeKeys.includes(k));
        const extra = localeKeys.filter((k) => !referenceKeys.includes(k));

        expect(missing, `Claves faltantes en ${locale}/${namespace}.json: ${missing.join(", ")}`).toHaveLength(0);
        expect(extra, `Claves extra en ${locale}/${namespace}.json: ${extra.join(", ")}`).toHaveLength(0);
      }
    });
  }
});
