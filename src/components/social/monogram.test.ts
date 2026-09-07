import { describe, expect, it } from "vitest";
import { MONOGRAM_STYLES, monogramLetter, monogramStyle } from "./monogram";

describe("monogramLetter", () => {
  it("toma la primera letra en mayúscula", () => {
    expect(monogramLetter("ana")).toBe("A");
    expect(monogramLetter("  bruno")).toBe("B");
  });

  it("no parte un grapheme multibyte", () => {
    expect(monogramLetter("Ángela")).toBe("Á");
    expect(monogramLetter("😀 feliz")).toBe("😀");
  });

  it("devuelve '?' para un nombre vacío", () => {
    expect(monogramLetter("   ")).toBe("?");
  });
});

describe("monogramStyle", () => {
  it("es determinista por username", () => {
    expect(monogramStyle("ana")).toBe(monogramStyle("ana"));
  });

  it("siempre devuelve una clase del conjunto", () => {
    for (const username of ["ana", "bruno", "z", "0", "_x"]) {
      expect(MONOGRAM_STYLES).toContain(monogramStyle(username));
    }
  });
});
