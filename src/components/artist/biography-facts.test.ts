import { describe, expect, it } from "vitest";
import type { ArtistDiscographyItem } from "@/services/catalog/artist-discography-view";
import type { ArtistLineup } from "@/services/catalog/artist-lineup";
import { biographyFacts } from "./biography-facts";

const album = (id: string, year: number | null) => ({ id, title: `Disco ${id}`, year }) as ArtistDiscographyItem;

describe("biographyFacts", () => {
  it("primer y último álbum con año, cuántos y la alineación de un grupo", () => {
    const lineup = { kind: "group", current: [{}, {}], past: [{}] } as unknown as ArtistLineup;
    expect(biographyFacts("Banda", [album("a", 1980), album("b", 1990), album("x", null)], lineup)).toEqual({
      artistName: "Banda",
      firstAlbum: { id: "a", title: "Disco a", year: 1980 },
      latestAlbum: { id: "b", title: "Disco b", year: 1990 },
      albumCount: 3,
      lineup: { kind: "group", current: 2, past: 1 },
    });
  });

  it("una persona cuenta sus bandas; sin álbumes no hay primero ni último", () => {
    const lineup = { kind: "person", groups: [{}, {}, {}] } as unknown as ArtistLineup;
    expect(biographyFacts("Solista", [], lineup)).toMatchObject({
      firstAlbum: null,
      latestAlbum: null,
      albumCount: 0,
      lineup: { kind: "person", bands: 3 },
    });
  });
});
