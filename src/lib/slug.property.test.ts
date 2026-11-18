// @vitest-environment node
// Propiedades de los slugs de catálogo (URLs canónicas `<slug>-<id>`): estables y reversibles.

import { describe, it } from "vitest";
import { assertProperty, fc } from "@/test/property";
import { buildSegment, decodeId, encodeId, parseCatalogSegment, slugify, truncateSlug } from "./slug";

const LATIN = "abcXYZáéíóúñüöøßçÆŒ0123456789 '’-_.,&!/()[]:";
const name = fc.oneof(
  fc.string({ unit: fc.constantFrom(...LATIN.split("")), maxLength: 40 }),
  fc.string({ unit: "grapheme", maxLength: 30 }),
);

describe("slugify", () => {
  it("es idempotente", () => {
    assertProperty(fc.property(name, (s) => slugify(slugify(s)) === slugify(s)));
  });

  it("no empieza ni termina con guion y no tiene guiones dobles", () => {
    assertProperty(fc.property(name, (s) => !/^-|-$|--/.test(slugify(s))));
  });
});

describe("truncateSlug", () => {
  it("respeta el tope y devuelve siempre un prefijo del slug", () => {
    assertProperty(
      fc.property(name, fc.integer({ min: 1, max: 60 }), (s, max) => {
        const slug = slugify(s);
        const cut = truncateSlug(slug, max);
        return [...cut].length <= max && slug.startsWith(cut);
      }),
    );
  });
});

describe("id de catálogo", () => {
  it("encodeId y decodeId son inversos para cualquier UUID", () => {
    assertProperty(fc.property(fc.uuid(), (uuid) => decodeId(encodeId(uuid)) === uuid.toLowerCase()));
  });

  it("un segmento canónico se lee de vuelta con el mismo id, sea cual sea el nombre", () => {
    assertProperty(
      fc.property(name, fc.uuid(), (s, uuid) => {
        const parsed = parseCatalogSegment(buildSegment(slugify(s), uuid));
        return parsed !== null && parsed.id.toLowerCase() === uuid.toLowerCase();
      }),
    );
  });
});
