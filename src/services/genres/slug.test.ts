import { describe, expect, it } from "vitest";
import { GENRE_SLUG_PATTERN, assignGenreSlugs, genreSlugBase } from "./slug";

describe("genreSlugBase", () => {
  it.each([
    ["hip hop", "hip-hop"],
    ["r&b", "r-and-b"],
    ["post-punk", "post-punk"],
    ["bossa nova", "bossa-nova"],
    ["forró", "forro"],
    ["musique concrète", "musique-concrete"],
    ["children's music", "childrens-music"],
    ["min'yō", "minyo"],
    ["nhạc vàng", "nhac-vang"],
    ["dansktop ø", "dansktop-o"],
    ["  drum and bass  ", "drum-and-bass"],
  ])("%s → %s", (name, slug) => {
    expect(genreSlugBase(name)).toBe(slug);
    expect(slug).toMatch(GENRE_SLUG_PATTERN);
  });

  it("devuelve vacío si no queda ninguna letra latina ni dígito", () => {
    expect(genreSlugBase("音楽")).toBe("");
  });
});

describe("assignGenreSlugs", () => {
  it("conserva el slug anterior aunque cambie el nombre", () => {
    const slugs = assignGenreSlugs([{ mbid: "a", name: "progressive rock music" }], new Map([["a", "progressive-rock"]]));
    expect(slugs.get("a")).toBe("progressive-rock");
  });

  it("resuelve colisiones con un sufijo determinista por orden de MBID", () => {
    const genres = [
      { mbid: "b", name: "R&B" },
      { mbid: "a", name: "r and b" },
    ];
    const slugs = assignGenreSlugs(genres, new Map());
    expect(slugs.get("a")).toBe("r-and-b");
    expect(slugs.get("b")).toBe("r-and-b-2");
  });

  it("un slug anterior tiene prioridad sobre un género nuevo con el mismo nombre", () => {
    const genres = [
      { mbid: "a", name: "techno" },
      { mbid: "z", name: "techno" },
    ];
    const slugs = assignGenreSlugs(genres, new Map([["z", "techno"]]));
    expect(slugs.get("z")).toBe("techno");
    expect(slugs.get("a")).toBe("techno-2");
  });

  it("usa el MBID cuando el nombre no produce slug", () => {
    const slugs = assignGenreSlugs([{ mbid: "1234abcd-0000", name: "音楽" }], new Map());
    expect(slugs.get("1234abcd-0000")).toBe("genre-1234abcd");
  });
});
