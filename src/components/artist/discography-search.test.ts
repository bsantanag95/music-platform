import { describe, expect, it } from "vitest";
import type { ArtistDiscographyItem } from "@/services/catalog/artist-discography-view";
import { matchesDisc, normalizeForSearch, searchDiscography } from "./discography-search";

function disc(title: string, overrides: Partial<ArtistDiscographyItem> = {}): ArtistDiscographyItem {
  return {
    id: title,
    title,
    year: 1985,
    coverThumbUrl: null,
    coverResolved: true,
    section: "main",
    kinds: ["album"],
    isEp: false,
    community: { average: null, count: 0 },
    primaryArtist: null,
    ...overrides,
  };
}

const q = normalizeForSearch;

describe("normalizeForSearch", () => {
  it("quita mayúsculas, acentos, ligaduras y apóstrofos, y colapsa espacios", () => {
    expect(q("  Mötley   CRÜE ")).toBe("motley crue");
    expect(q("Ænima")).toBe("aenima");
    expect(q("Don’t Go")).toBe("dont go");
    expect(q("Don't Go")).toBe("dont go");
    expect(q("“Live”")).toBe('"live"');
  });
});

describe("matchesDisc", () => {
  it("encuentra por parte del título sin distinguir acentos ni apóstrofos", () => {
    const item = disc("Don’t Go Away Mad (Just Go Away)");
    expect(matchesDisc(item, q("dont go away"), "singles")).toBe(true);
    expect(matchesDisc(item, q("don't"), "singles")).toBe(true);
    expect(matchesDisc(disc("Ænima"), q("aenima"), "main")).toBe(true);
    expect(matchesDisc(disc("Café Tacvba"), q("CAFE"), "main")).toBe(true);
  });

  it("el artista principal solo cuenta en Apariciones", () => {
    const item = disc("Some Song", { primaryArtist: { id: "x", name: "Ozzy Osbourne" } });
    expect(matchesDisc(item, q("ozzy"), "appearances")).toBe(true);
    expect(matchesDisc(item, q("ozzy"), "singles")).toBe(false);
  });

  it("un año de cuatro cifras coincide con el año o con el título", () => {
    expect(matchesDisc(disc("Dr. Feelgood", { year: 1989 }), q("1989"), "main")).toBe(true);
    expect(matchesDisc(disc("1989", { year: 2014 }), q("1989"), "main")).toBe(true);
    expect(matchesDisc(disc("Dr. Feelgood", { year: 1990 }), q("1989"), "main")).toBe(false);
    expect(matchesDisc(disc("Dr. Feelgood", { year: 1989 }), q("198"), "main")).toBe(false);
  });

  it("una consulta vacía no coincide con nada", () => {
    expect(matchesDisc(disc("Anything"), q("   "), "main")).toBe(false);
  });
});

describe("searchDiscography", () => {
  const sections = [
    { key: "main" as const, items: [disc("Theatre of Pain")] },
    { key: "live" as const, items: [disc("Live: Home Sweet Home Tour")] },
    { key: "singles" as const, items: [disc("Home Sweet Home"), disc("Home Sweet Home '91"), disc("Wild Side")] },
  ];

  it("agrupa en el orden de las secciones, con el conteo de cada una", () => {
    const result = searchDiscography(sections, "home");
    expect(result.groups.map((group) => [group.key, group.items.map((item) => item.title)])).toEqual([
      ["live", ["Live: Home Sweet Home Tour"]],
      ["singles", ["Home Sweet Home", "Home Sweet Home '91"]],
    ]);
    expect(result.counts).toEqual({ main: 0, live: 1, singles: 2 });
    expect(result.total).toBe(3);
  });

  it("solo espacios no devuelve resultados", () => {
    expect(searchDiscography(sections, "  ").total).toBe(0);
  });
});
