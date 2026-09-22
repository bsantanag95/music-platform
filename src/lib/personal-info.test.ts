import { describe, expect, it } from "vitest";
import {
  COUNTRIES,
  PRONOUN_SETS,
  countryName,
  countryOptions,
  isPronounSet,
  isValidCountry,
} from "./personal-info";

describe("COUNTRIES", () => {
  it("son los 249 códigos ISO 3166-1 alfa-2 oficiales más XK, sin repetidos", () => {
    expect(COUNTRIES).toHaveLength(250);
    expect(new Set(COUNTRIES).size).toBe(COUNTRIES.length);
    expect(COUNTRIES).toContain("XK");
  });

  it("todos son dos letras mayúsculas (lo mismo que exige el CHECK de la base)", () => {
    for (const code of COUNTRIES) expect(code).toMatch(/^[A-Z]{2}$/);
  });

  it.each(["es", "en"])("cada código tiene un nombre propio en %s (no devuelve el código)", (locale) => {
    for (const code of COUNTRIES) {
      const name = countryName(code, locale);
      expect(name, `${code} en ${locale}`).not.toBe(code);
      expect(name.length).toBeGreaterThan(2);
    }
  });
});

describe("isValidCountry", () => {
  it("acepta los códigos de la lista", () => {
    expect(isValidCountry("CL")).toBe(true);
    expect(isValidCountry("ES")).toBe(true);
    expect(isValidCountry("XK")).toBe(true);
  });

  it("rechaza minúsculas, nombres, tres letras, códigos inexistentes y valores que no son texto", () => {
    for (const value of ["cl", "Chile", "CHL", "ZZ", "", " CL", null, undefined, 42]) {
      expect(isValidCountry(value), String(value)).toBe(false);
    }
  });
});

describe("countryName", () => {
  it("localiza el nombre según el idioma", () => {
    expect(countryName("CL", "es")).toBe("Chile");
    expect(countryName("ES", "es")).toBe("España");
    expect(countryName("ES", "en")).toBe("Spain");
    expect(countryName("DE", "es")).toBe("Alemania");
    expect(countryName("DE", "en")).toBe("Germany");
  });
});

describe("countryOptions", () => {
  it("devuelve todos los países ordenados alfabéticamente en el idioma pedido", () => {
    const es = countryOptions("es");
    expect(es).toHaveLength(COUNTRIES.length);
    const collator = new Intl.Collator("es");
    for (let i = 1; i < es.length; i++) {
      expect(collator.compare(es[i - 1]!.name, es[i]!.name)).toBeLessThanOrEqual(0);
    }
    // El orden depende del idioma: "Alemania" precede a "España" en español, y
    // "Germany" a "Spain" en inglés, pero "Spain" precede a "Sweden" y no a la inversa.
    const codes = (options: typeof es) => options.map((option) => option.code);
    expect(codes(es).indexOf("DE")).toBeLessThan(codes(es).indexOf("ES"));
    const en = countryOptions("en");
    expect(codes(en).indexOf("ES")).toBeLessThan(codes(en).indexOf("SE"));
  });

  it("cada opción trae su código y su nombre", () => {
    expect(countryOptions("es").find((option) => option.code === "MX")).toEqual({ code: "MX", name: "México" });
  });
});

describe("pronombres de la lista", () => {
  it("son he, she y they", () => {
    expect([...PRONOUN_SETS]).toEqual(["he", "she", "they"]);
  });

  it("isPronounSet acepta solo las claves de la lista", () => {
    for (const value of PRONOUN_SETS) expect(isPronounSet(value)).toBe(true);
    for (const value of ["other", "xe", "She", "", null, undefined, 3]) {
      expect(isPronounSet(value), String(value)).toBe(false);
    }
  });
});
