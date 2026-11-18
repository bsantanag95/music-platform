// @vitest-environment node
// Propiedades de la normalización de búsqueda (la contraparte en TypeScript de `search_key`/`search_normalize` de SQL).
// Sin una BD no se puede comparar con la función SQL; aquí se fijan las leyes que cualquier normalización debe cumplir.

import { describe, it, expect } from "vitest";
import { assertProperty, fc } from "@/test/property";
import { baseSongTitle, isExactMatch, matchTier, normalizeSearchText, tokenize } from "./normalize";

// Texto de nombres reales de catálogo: mezcla de acentos, apóstrofos, puntuación y dígitos, más Unicode arbitrario.
const LATIN = "aeiouAEIOUáéíóúÁÉÍÓÚñÑüÜöÖøØßçÇ0123456789 '’`´-–—()[].,&!?/:+";
const catalogText = fc.oneof(
  fc.string({ unit: fc.constantFrom(...LATIN.split("")), maxLength: 40 }),
  fc.string({ unit: "grapheme", maxLength: 30 }),
);

describe("normalizeSearchText", () => {
  it("es idempotente: normalizar dos veces da lo mismo que una", () => {
    assertProperty(fc.property(catalogText, (s) => normalizeSearchText(normalizeSearchText(s)) === normalizeSearchText(s)));
  });

  it("solo deja palabras de letras y dígitos separadas por un espacio, sin bordes", () => {
    assertProperty(
      fc.property(catalogText, (s) => {
        const n = normalizeSearchText(s);
        return n === "" || /^[\p{L}\p{N}]+(?: [\p{L}\p{N}]+)*$/u.test(n);
      }),
    );
  });

  it("no distingue mayúsculas ni acentos en el alfabeto latino de los nombres", () => {
    const latin = fc.string({ unit: fc.constantFrom(..."aeiouáéíóúñüöbcdXYZ '-".split("")), maxLength: 30 });
    assertProperty(fc.property(latin, (s) => normalizeSearchText(s.toUpperCase()) === normalizeSearchText(s)));
    assertProperty(
      fc.property(latin, (s) => normalizeSearchText(s) === normalizeSearchText(s.normalize("NFD"))),
    );
  });

  it("no tiene letras latinas con mayúscula ni diacríticos combinados", () => {
    assertProperty(fc.property(catalogText, (s) => !/[A-Z]|\p{M}/u.test(normalizeSearchText(s))));
  });
});

describe("tokenize", () => {
  it("las palabras unidas por un espacio son el texto normalizado, y ninguna está vacía", () => {
    assertProperty(
      fc.property(catalogText, (s) => {
        const tokens = tokenize(s);
        return tokens.join(" ") === normalizeSearchText(s) && tokens.every((t) => t.length > 0);
      }),
    );
  });
});

describe("matchTier / isExactMatch", () => {
  it("un nombre siempre es coincidencia exacta de sí mismo (si queda algo tras normalizar)", () => {
    assertProperty(
      fc.property(catalogText, (s) => {
        const hasContent = normalizeSearchText(s).length > 0;
        return isExactMatch(s, s) === hasContent && (!hasContent || matchTier(s, s) === 0);
      }),
    );
  });

  it("el nivel 0 es exactamente la coincidencia exacta", () => {
    assertProperty(
      fc.property(catalogText, catalogText, (name, query) => {
        const exact = isExactMatch(name, query);
        return exact ? matchTier(name, query) === 0 : matchTier(name, query) !== 0 || normalizeSearchText(query) === "";
      }),
    );
  });

  it("una palabra del nombre es una coincidencia de nivel 1 como máximo (palabras completas contiguas)", () => {
    assertProperty(
      fc.property(fc.array(fc.stringMatching(/^[a-z0-9]{1,8}$/), { minLength: 1, maxLength: 5 }), fc.nat(), (words, pick) => {
        const name = words.join(" ");
        const word = words[pick % words.length]!;
        return matchTier(name, word) <= 1;
      }),
    );
  });
});

describe("baseSongTitle", () => {
  it("es idempotente", () => {
    assertProperty(fc.property(catalogText, (s) => baseSongTitle(baseSongTitle(s)) === baseSongTitle(s)));
  });

  it("nunca devuelve vacío para un título con contenido y nunca alarga el título recortado", () => {
    assertProperty(
      fc.property(catalogText, (s) => {
        const base = baseSongTitle(s);
        return s.trim() === "" || (base.length > 0 && base.length <= s.trim().length);
      }),
    );
  });

  it("quita los sufijos de versión entre paréntesis, corchetes o tras un guion", () => {
    const title = fc.stringMatching(/^[A-Za-z]{3,10}( [A-Za-z]{3,10}){0,2}$/);
    const suffix = fc.constantFrom("(Live)", "[Demo]", "(2011 Remaster)", "- Live at Wembley", "(Live) [Demo]");
    assertProperty(fc.property(title, suffix, (t, sfx) => baseSongTitle(`${t} ${sfx}`) === t));
  });

  it("(ejemplo) 'Kiss of Death (live)' se agrupa con 'Kiss of Death'", () => {
    expect(baseSongTitle("Kiss of Death (live)")).toBe("Kiss of Death");
  });
});
