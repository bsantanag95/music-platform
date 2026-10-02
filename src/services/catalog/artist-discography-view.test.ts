import { describe, expect, it, vi } from "vitest";
import type { DiscographyRow } from "./ingest-discography";

vi.mock("@/db", () => ({ db: {} }));
const { buildDiscographyView, compareByYear, pickBestRated } = await import("./artist-discography-view");

function row(id: string, overrides: Partial<DiscographyRow> = {}): DiscographyRow {
  return {
    id,
    mbid: `${id}-mbid`,
    title: id,
    category: "studio",
    coverThumbUrl: null,
    coverStorageKey: null,
    coverCheckedAt: null,
    coverBlockedAt: null,
    editionsSyncedAt: null,
    discographyUnlistedAt: null,
    primaryType: "Album",
    secondaryTypes: [],
    wikidataId: null,
    genresSyncedAt: null,
    firstReleaseDate: null,
    firstReleaseYear: 2000,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    creditRole: "primary",
    ...overrides,
  };
}

const noRatings = new Map<string, { average: number; count: number }>();
const noArtists = new Map<string, { id: string; name: string }>();

describe("buildDiscographyView", () => {
  it("agrupa en secciones en el orden fijo, con su cantidad, y omite las vacías", () => {
    const view = buildDiscographyView(
      [
        row("live", { secondaryTypes: ["Live"], category: "live_other" }),
        row("studio"),
        row("ep", { primaryType: "EP", category: "single_ep" }),
        row("single", { primaryType: "Single", category: "single_ep" }),
      ],
      noRatings,
      noArtists,
    );
    expect(view.sections.map((s) => [s.key, s.items.length])).toEqual([
      ["main", 2],
      ["live", 1],
      ["singles", 1],
    ]);
    expect(view.sections[0]!.items.find((i) => i.id === "ep")?.isEp).toBe(true);
  });

  it("ordena por año ascendente, con los discos sin año al final por título", () => {
    const view = buildDiscographyView(
      [row("b", { firstReleaseYear: null, title: "B" }), row("x", { firstReleaseYear: 1990 }), row("a", { firstReleaseYear: null, title: "A" }), row("y", { firstReleaseYear: 1970 })],
      noRatings,
      noArtists,
    );
    expect(view.sections[0]!.items.map((i) => i.id)).toEqual(["y", "x", "a", "b"]);
    expect(view.firstMainYear).toBe(1970);
  });

  it("la media de la comunidad solo aparece con al menos 5 valoraciones", () => {
    const view = buildDiscographyView(
      [row("many"), row("few")],
      new Map([
        ["many", { average: 4.2, count: 12 }],
        ["few", { average: 5, count: 3 }],
      ]),
      noArtists,
    );
    const items = view.sections[0]!.items;
    expect(items.find((i) => i.id === "many")?.community).toEqual({ average: 4.2, count: 12 });
    expect(items.find((i) => i.id === "few")?.community).toEqual({ average: null, count: 3 });
  });

  it("marca como mejor valorado el de mayor media de Principal; ninguno si nadie llega a 5", () => {
    const withRatings = buildDiscographyView(
      [row("dsotm"), row("animals"), row("live", { secondaryTypes: ["Live"] })],
      new Map([
        ["dsotm", { average: 4.6, count: 40 }],
        ["animals", { average: 4.4, count: 30 }],
        ["live", { average: 4.9, count: 50 }],
      ]),
      noArtists,
    );
    expect(withRatings.bestRatedId).toBe("dsotm");
    expect(buildDiscographyView([row("a")], new Map([["a", { average: 5, count: 4 }]]), noArtists).bestRatedId).toBeNull();
  });

  it("las apariciones indican el artista principal del disco", () => {
    const view = buildDiscographyView(
      [row("feat", { primaryType: "Single", creditRole: "featured" })],
      noRatings,
      new Map([["feat", { id: "other", name: "Otra banda" }]]),
    );
    expect(view.sections).toHaveLength(1);
    expect(view.sections[0]!.key).toBe("appearances");
    expect(view.sections[0]!.items[0]!.primaryArtist).toEqual({ id: "other", name: "Otra banda" });
  });

  it("los tipos de la etiqueta salen de los tipos crudos, o de la categoría sin ellos", () => {
    const view = buildDiscographyView(
      [row("st", { secondaryTypes: ["Soundtrack"] }), row("legacy", { primaryType: null, secondaryTypes: null, category: "live_other" })],
      noRatings,
      noArtists,
    );
    const all = view.sections.flatMap((s) => s.items);
    expect(all.find((i) => i.id === "st")?.kinds).toEqual(["album", "soundtrack"]);
    expect(all.find((i) => i.id === "legacy")?.kinds).toEqual(["live_other"]);
  });
});

describe("helpers", () => {
  it("pickBestRated desempata por cantidad de valoraciones", () => {
    const item = (id: string, average: number | null, count: number) =>
      ({ id, community: { average, count } }) as Parameters<typeof pickBestRated>[0][number];
    expect(pickBestRated([item("a", 4.5, 10), item("b", 4.5, 20), item("c", null, 100)])).toBe("b");
  });

  it("compareByYear deja sin año al final", () => {
    expect(compareByYear({ year: null, title: "a" }, { year: 1999, title: "b" })).toBeGreaterThan(0);
  });
});
