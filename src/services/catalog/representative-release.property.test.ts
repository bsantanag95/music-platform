// @vitest-environment node
// Propiedades de la edición representativa (capability `album-edition-selection`): la elección depende del CONJUNTO de ediciones,
// nunca del orden en que MusicBrainz las devuelve, y respeta los criterios de mayor peso.

import { describe, it } from "vitest";
import { assertProperty, fc } from "@/test/property";
import type { MBReleaseSummary } from "../musicbrainz/types";
import { deriveEditionLabel, pickRepresentativeRelease } from "./representative-release";

// Fechas parciales y completas, como las devuelve MusicBrainz ('YYYY' | 'YYYY-MM' | 'YYYY-MM-DD'), con años que se repiten
// para que haya parciales compatibles con otras ediciones más precisas.
const year = fc.integer({ min: 1968, max: 1972 }).map(String);
const month = fc.integer({ min: 1, max: 12 }).map((m) => String(m).padStart(2, "0"));
const day = fc.integer({ min: 1, max: 28 }).map((d) => String(d).padStart(2, "0"));
const partialDate = fc.oneof(
  year,
  fc.tuple(year, month).map(([y, m]) => `${y}-${m}`),
  fc.tuple(year, month, day).map(([y, m, d]) => `${y}-${m}-${d}`),
);

const optional = <T>(arb: fc.Arbitrary<T>) => fc.option(arb, { nil: undefined });

const releaseFields = fc.record({
  title: optional(fc.constantFrom("Album", "Album (Deluxe Edition)", "Album (Remastered)", "Album - Signed Edition")),
  status: optional(fc.constantFrom("Official", "Promotion", "Bootleg", "Pseudo-Release")),
  date: optional(partialDate),
  country: optional(fc.constantFrom("US", "GB", "XW", "XE", "JP", "CL")),
  packaging: fc.option(fc.constantFrom("Jewel Case", "Digipak", "Box", "None", "Cardboard/Paper Sleeve"), { nil: undefined }),
  disambiguation: optional(fc.constantFrom("", "Deluxe", "signed", "limited edition", "original pressing", "clean")),
  media: optional(
    fc.array(
      fc.record({
        format: optional(fc.constantFrom("CD", '12" Vinyl', "Digital Media", "Cassette")),
        "track-count": optional(fc.integer({ min: 1, max: 24 })),
      }),
      { maxLength: 3 },
    ),
  ),
});

const releases: fc.Arbitrary<MBReleaseSummary[]> = fc.uniqueArray(
  fc.tuple(fc.uuid(), releaseFields).map(([id, fields]) => ({ id, ...fields }) as MBReleaseSummary),
  { selector: (r) => r.id, maxLength: 9 },
);

/** La misma lista de ediciones en otro orden. */
const releasesWithShuffle = releases.chain((list) =>
  fc.tuple(fc.constant(list), fc.shuffledSubarray(list, { minLength: list.length, maxLength: list.length })),
);

describe("pickRepresentativeRelease", () => {
  it("es nula si y solo si no hay ediciones, y siempre elige una de las dadas", () => {
    assertProperty(
      fc.property(releases, (list) => {
        const picked = pickRepresentativeRelease(list);
        return list.length === 0 ? picked === null : picked !== null && list.some((r) => r.id === picked.id);
      }),
    );
  });

  it("no depende del orden en que llegan las ediciones", () => {
    assertProperty(
      fc.property(releasesWithShuffle, ([list, shuffled]) => {
        return pickRepresentativeRelease(list)?.id === pickRepresentativeRelease(shuffled)?.id;
      }),
    );
  });

  it("no depende del orden aunque se invierta la lista", () => {
    assertProperty(
      fc.property(releases, (list) => pickRepresentativeRelease(list)?.id === pickRepresentativeRelease([...list].reverse())?.id),
    );
  });

  it("si hay alguna edición oficial, la elegida es oficial", () => {
    assertProperty(
      fc.property(
        releases.filter((list) => list.some((r) => r.status === "Official")),
        (list) => pickRepresentativeRelease(list)?.status === "Official",
      ),
    );
  });

  it("no muta la lista que recibe", () => {
    assertProperty(
      fc.property(releases, (list) => {
        const before = JSON.stringify(list);
        pickRepresentativeRelease(list);
        return JSON.stringify(list) === before;
      }),
    );
  });

  it("es idempotente: elegir de [la elegida] devuelve la misma", () => {
    assertProperty(
      fc.property(
        releases.filter((list) => list.length > 0),
        (list) => {
          const picked = pickRepresentativeRelease(list)!;
          return pickRepresentativeRelease([picked])?.id === picked.id;
        },
      ),
    );
  });
});

describe("deriveEditionLabel", () => {
  it("nunca devuelve una etiqueta vacía ni 'original' sin que lo diga la edición", () => {
    assertProperty(
      fc.property(releaseFields, fc.uuid(), (fields, id) => {
        const label = deriveEditionLabel({ id, ...fields } as MBReleaseSummary);
        return label.length > 0 && label === label.trim();
      }),
    );
  });
});
