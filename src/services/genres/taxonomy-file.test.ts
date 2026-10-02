import { describe, expect, it } from "vitest";
import taxonomyJson from "../../../data/genres/taxonomy.json";
import { GENRES } from "@/lib/music-identity";
import { FAMILY_KEYS, GENRE_FAMILIES } from "./families";
import { GENRE_SLUG_PATTERN } from "./slug";
import type { TaxonomyFile } from "./taxonomy-build";

// Contrato del archivo versionado `data/genres/taxonomy.json` (openspec: add-genre-taxonomy):
// cada regeneración tiene que seguir cumpliendo estas decisiones de producto.
const taxonomy = taxonomyJson as TaxonomyFile;
const byName = new Map(taxonomy.genres.map((g) => [g.name, g]));
const bySlug = new Map(taxonomy.genres.map((g) => [g.slug, g]));

describe("data/genres/taxonomy.json", () => {
  it("cada clave de 'Géneros que me mueven' es un género de estilo de la taxonomía", () => {
    for (const key of GENRES) expect(bySlug.get(key)?.kind, key).toBe("style");
  });

  it("slugs y MBIDs únicos, con el formato que exige la base", () => {
    expect(new Set(taxonomy.genres.map((g) => g.slug)).size).toBe(taxonomy.genres.length);
    expect(new Set(taxonomy.genres.map((g) => g.mbid)).size).toBe(taxonomy.genres.length);
    for (const g of taxonomy.genres) expect(g.slug, g.name).toMatch(GENRE_SLUG_PATTERN);
  });

  it("las relaciones apuntan a géneros del archivo y las familias son conocidas", () => {
    const mbids = new Set(taxonomy.genres.map((g) => g.mbid));
    for (const g of taxonomy.genres) {
      for (const related of [...g.subgenreOf, ...g.fusionOf, ...g.influencedBy]) expect(mbids.has(related)).toBe(true);
      for (const family of g.families) expect(FAMILY_KEYS).toContain(family);
    }
  });

  it("todo estilo tiene familia; descriptores y ocultos no", () => {
    for (const g of taxonomy.genres) {
      if (g.kind === "style") expect(g.families.length, g.name).toBeGreaterThan(0);
      else expect(g.families, g.name).toEqual([]);
    }
  });

  it("ninguna familia principal queda vacía", () => {
    for (const family of GENRE_FAMILIES.filter((f) => f.tier === "main")) {
      expect(taxonomy.genres.some((g) => g.families.includes(family.key)), family.key).toBe(true);
    }
  });

  it.each([
    ["trap latino", ["hip-hop", "latin"]],
    ["cumbia", ["latin"]],
    ["reggaeton", ["latin"]],
    ["bossa nova", ["brazilian"]],
    ["mpb", ["brazilian"]],
    ["flamenco", ["folk"]],
    ["nueva canción española", ["folk"]],
    ["blackgaze", ["rock", "metal"]],
    ["shoegaze", ["rock"]],
  ])("%s pertenece a %j", (name, families) => {
    expect(byName.get(name)?.families).toEqual(families);
  });

  it("descriptores, ocultos y nombres corregidos", () => {
    expect(byName.get("instrumental")?.kind).toBe("descriptor");
    expect(byName.get("christmas music")?.kind).toBe("descriptor");
    expect(byName.get("progressive")?.kind).toBe("hidden");
    expect(byName.get("classical")?.nameEs).toBe("música clásica");
    expect(byName.get("progressive rock")?.nameEs).toBe("rock progresivo");
  });
});
