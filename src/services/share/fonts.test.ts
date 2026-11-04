import { existsSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { SHARE_FONTS_DIR, SHARE_FONT_FAMILIES, loadShareFonts, resetShareFontsForTests } from "./fonts";

beforeEach(() => resetShareFontsForTests());

describe("fuentes de las imágenes de compartir", () => {
  it("carga las tres familias de la marca desde el disco, como TTF", async () => {
    const fonts = await loadShareFonts();
    expect(new Set(fonts.map((f) => f.name))).toEqual(new Set(Object.values(SHARE_FONT_FAMILIES)));
    for (const font of fonts) {
      // Firma de un TrueType: 0x00010000.
      expect(Array.from(new Uint8Array(font.data.slice(0, 4)))).toEqual([0, 1, 0, 0]);
    }
    expect(fonts.some((f) => f.name === SHARE_FONT_FAMILIES.body && f.style === "italic")).toBe(true);
  });

  it("memoriza la carga: dos pedidos devuelven la misma promesa", () => {
    expect(loadShareFonts()).toBe(loadShareFonts());
  });

  it("versiona la licencia OFL de cada familia junto a las fuentes", () => {
    for (const family of ["space-grotesk", "ibm-plex-mono", "source-serif-4"]) {
      expect(existsSync(join(SHARE_FONTS_DIR, `OFL-${family}.txt`))).toBe(true);
    }
  });
});
