import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { isListTheme, LIST_THEMES } from "./types";

// El vocabulario de temas vive dos veces: en la app (LIST_THEMES) y en el CHECK de la migración 0098.
// Este test evita que diverjan (openspec: add-list-themes-phase1).
describe("LIST_THEMES", () => {
  it("coincide con chk_user_list_theme de la migración 0098", () => {
    const migration = readFileSync(path.join(process.cwd(), "drizzle", "0098_list_theme.sql"), "utf8");
    const check = migration.match(/chk_user_list_theme[\s\S]*?IN \(([\s\S]*?)\)\)/);
    expect(check).not.toBeNull();
    const values = [...check![1]!.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
    expect(values).toEqual([...LIST_THEMES]);
  });

  it("tiene diez temas y termina en «other»", () => {
    expect(LIST_THEMES).toHaveLength(10);
    expect(LIST_THEMES[LIST_THEMES.length - 1]).toBe("other");
  });

  it("isListTheme acepta solo el vocabulario", () => {
    expect(isListTheme("recommendations")).toBe(true);
    expect(isListTheme("recs")).toBe(false);
    expect(isListTheme(null)).toBe(false);
  });
});
