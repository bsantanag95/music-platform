import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BRAND_COLOR_VARIABLES, BRAND_COLORS } from "./brand-tokens";

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

describe("colores de marca de las imágenes", () => {
  it.each(Object.entries(BRAND_COLOR_VARIABLES))("%s coincide con su variable de globals.css", (key, variable) => {
    const match = new RegExp(`${variable}:\\s*(#[0-9a-fA-F]{6})`).exec(css);
    expect(match?.[1]?.toLowerCase()).toBe(BRAND_COLORS[key as keyof typeof BRAND_COLORS]);
  });
});
