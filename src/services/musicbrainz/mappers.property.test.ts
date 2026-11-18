// @vitest-environment node
// Propiedades de los mapeos de MusicBrainz que alimentan los backfills y la ingesta: fechas parciales y categoría del álbum.

import { describe, it } from "vitest";
import { assertProperty, fc } from "@/test/property";
import { mapReleaseGroupCategory, normalizeReleaseDate, yearFromMbDate } from "./mappers";

const CATEGORIES = ["studio", "single_ep", "compilation", "live_other"];
const pad = (n: number, width: number) => String(n).padStart(width, "0");
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

// Fecha de calendario REAL (respeta meses y bisiestos), con año de 4 dígitos.
const realDate = fc
  .tuple(fc.integer({ min: 1000, max: 9999 }), fc.integer({ min: 1, max: 12 }))
  .chain(([y, m]) => fc.tuple(fc.constant(y), fc.constant(m), fc.integer({ min: 1, max: daysInMonth(y, m) })));
const iso = ([y, m, d]: [number, number, number]) => `${pad(y, 4)}-${pad(m, 2)}-${pad(d, 2)}`;

describe("normalizeReleaseDate", () => {
  it("acepta cualquier fecha de calendario real tal cual (sin inventar ni mover nada)", () => {
    assertProperty(fc.property(realDate, (parts) => normalizeReleaseDate(iso(parts)) === iso(parts)));
  });

  it("las fechas parciales ('YYYY', 'YYYY-MM') dan null: no se inventa un día", () => {
    assertProperty(
      fc.property(fc.integer({ min: 1000, max: 9999 }), fc.integer({ min: 1, max: 12 }), (y, m) => {
        return normalizeReleaseDate(pad(y, 4)) === null && normalizeReleaseDate(`${pad(y, 4)}-${pad(m, 2)}`) === null;
      }),
    );
  });

  it("rechaza los días que el calendario no tiene (31 de abril, 29 de febrero sin bisiesto, mes 13)", () => {
    assertProperty(
      fc.property(fc.integer({ min: 1000, max: 9999 }), fc.integer({ min: 1, max: 12 }), (y, m) => {
        const over = daysInMonth(y, m) + 1;
        return over > 31 || normalizeReleaseDate(`${pad(y, 4)}-${pad(m, 2)}-${pad(over, 2)}`) === null;
      }),
    );
    assertProperty(fc.property(fc.integer({ min: 13, max: 99 }), (m) => normalizeReleaseDate(`2000-${m}-01`) === null));
  });

  it("es idempotente y su resultado es siempre null o la misma cadena de entrada", () => {
    assertProperty(
      fc.property(fc.string({ maxLength: 14 }), (s) => {
        const out = normalizeReleaseDate(s);
        return out === null ? true : out === s && normalizeReleaseDate(out) === out;
      }),
    );
  });
});

describe("yearFromMbDate", () => {
  it("devuelve el año de cualquier fecha válida a cualquier precisión", () => {
    assertProperty(
      fc.property(realDate, (parts) => {
        const [y, m] = parts;
        const year = Number(pad(y, 4));
        return (
          yearFromMbDate(pad(y, 4)) === year && yearFromMbDate(`${pad(y, 4)}-${pad(m, 2)}`) === year && yearFromMbDate(iso(parts)) === year
        );
      }),
    );
  });

  it("concuerda con normalizeReleaseDate: si la fecha completa es válida, tiene año", () => {
    assertProperty(
      fc.property(fc.string({ maxLength: 12 }), (s) => normalizeReleaseDate(s) === null || yearFromMbDate(s) !== null),
    );
  });

  it("nunca lanza ante basura y solo devuelve null o un entero de 4 dígitos", () => {
    assertProperty(
      fc.property(fc.string({ maxLength: 20 }), (s) => {
        const y = yearFromMbDate(s);
        return y === null || (Number.isInteger(y) && y >= 0 && y <= 9999);
      }),
    );
  });
});

describe("mapReleaseGroupCategory", () => {
  const primary = fc.option(fc.constantFrom("Album", "Single", "EP", "Broadcast", "Other", "Compilation"), { nil: undefined });
  const secondary = fc.option(
    fc.array(fc.constantFrom("Compilation", "Live", "Soundtrack", "Demo", "Remix", "DJ-mix", "Mixtape/Street", "Interview"), { maxLength: 4 }),
    { nil: undefined },
  );

  it("siempre devuelve una de las cuatro categorías y no depende del orden de los tipos secundarios", () => {
    assertProperty(
      fc.property(primary, secondary, (p, s) => {
        const category = mapReleaseGroupCategory(p, s);
        const reversed = s ? mapReleaseGroupCategory(p, [...s].reverse()) : category;
        return CATEGORIES.includes(category) && reversed === category;
      }),
    );
  });

  it("Compilation y Live mandan sobre el tipo primario", () => {
    assertProperty(
      fc.property(primary, secondary, (p, s) => {
        const has = (t: string) => (s ?? ([] as string[])).includes(t);
        const category = mapReleaseGroupCategory(p, s);
        if (has("Compilation")) return category === "compilation";
        if (has("Live")) return category === "live_other";
        return true;
      }),
    );
  });
});
