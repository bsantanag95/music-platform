import { describe, expect, it } from "vitest";
import {
  isExactMatch,
  matchTier,
  normalizeSearchText,
  splitExplicit,
  tokenize,
  withoutSeparator,
} from "./normalize";

describe("normalizeSearchText", () => {
  it.each([
    ["Motörhead", "motorhead"],
    ["AC/DC", "ac dc"],
    ["Guns N' Roses", "guns n roses"],
    ["Guns N’ Roses", "guns n roses"],
    ["  Sabrina   Carpenter ", "sabrina carpenter"],
    ["Björk", "bjork"],
    ["Short n' Sweet", "short n sweet"],
    ["Don't Stop", "dont stop"],
    ["…Of Death", "of death"],
  ])("%s → %s", (input, expected) => {
    expect(normalizeSearchText(input)).toBe(expected);
  });

  it("tokeniza sin tokens vacíos", () => {
    expect(tokenize("  KISS - Destroyer ")).toEqual(["kiss", "destroyer"]);
    expect(tokenize("   ")).toEqual([]);
  });
});

describe("matchTier", () => {
  it("ordena exacta → palabra completa → prefijo → resto", () => {
    expect(matchTier("Icon", "icon")).toBe(0);
    expect(matchTier("ICON", "Icon")).toBe(0);
    expect(matchTier("Despised Icon", "icon")).toBe(1);
    expect(matchTier("Iconoclast", "icon")).toBe(2);
    expect(matchTier("Ennio Morricone", "icon")).toBe(3);
  });

  it("tolera acentos", () => {
    expect(matchTier("Motörhead", "motorhead")).toBe(0);
  });
});

describe("isExactMatch", () => {
  it("compara normalizado", () => {
    expect(isExactMatch("Sabrina Carpenter", "sabrina  carpenter")).toBe(true);
    expect(isExactMatch("Sabrina", "sabrina carpenter")).toBe(false);
    expect(isExactMatch("X", "   ")).toBe(false);
  });
});

describe("splitExplicit", () => {
  it("separa por guion con espacios", () => {
    expect(splitExplicit("KISS - Destroyer")).toEqual({ left: "KISS", right: "Destroyer" });
    expect(splitExplicit("Kiss of Death – Dokken")).toEqual({ left: "Kiss of Death", right: "Dokken" });
  });

  it("no separa guiones pegados ni lados vacíos", () => {
    expect(splitExplicit("Jay-Z")).toBeNull();
    expect(splitExplicit(" - Destroyer")).toBeNull();
    expect(splitExplicit("kiss destroyer")).toBeNull();
  });

  it("withoutSeparator une ambos lados", () => {
    expect(withoutSeparator("KISS - Destroyer")).toBe("KISS Destroyer");
    expect(withoutSeparator("destroyer")).toBe("destroyer");
  });
});
