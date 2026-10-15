import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ albumReleaseDates: vi.fn() }));
vi.mock("../../discovery", () => ({ albumReleaseDates: mocks.albumReleaseDates }));

const { buildGenreSpotlightContext, buildOnePerDecadeContext, genreSpotlightPresenter, onePerDecadePresenter } = await import("./eras");

const input = (periodKey: string | null) => ({
  templateKey: "genre-spotlight",
  periodKey,
  family: "discovery" as const,
  albumIds: ["a", "b"],
  today: new Date("2026-10-14T12:00:00Z"),
});

describe("buildGenreSpotlightContext", () => {
  const genre = { es: "Punk y hardcore", en: "Punk & hardcore" };

  it("el resumen dice la regla con el tamaño real de la era y el género en los dos idiomas", () => {
    const { summary } = buildGenreSpotlightContext(["a"], {}, genre);
    expect(summary).toEqual({ key: "genreSpotlightSummary", params: { era: 5, genre } });
  });

  it("cada disco dice la era que representa y su año", () => {
    const context = buildGenreSpotlightContext(
      ["a", "b"],
      { a: { date: null, year: 1992 }, b: { date: "2003-05-01", year: null } },
      genre,
    );

    expect(context.notes.get("a")).toEqual({ key: "genreEra", params: { from: "1990", to: "1994", year: "1992" } });
    expect(context.notes.get("b")).toEqual({ key: "genreEra", params: { from: "2000", to: "2004", year: "2003" } });
  });

  it("un disco sin año queda sin cartela; no agrupa ni numera", () => {
    const context = buildGenreSpotlightContext(["a"], { a: { date: null, year: null } }, genre);
    expect(context.notes.size).toBe(0);
    expect(context.groups).toBeUndefined();
    expect(context.numbered).toBe(false);
  });
});

describe("genreSpotlightPresenter", () => {
  it("nombra el género de la familia del período en los dos idiomas", async () => {
    mocks.albumReleaseDates.mockResolvedValue({ a: { date: null, year: 1992 } });
    const context = await genreSpotlightPresenter(input("2026-W41-punk"));
    const genre = (context!.summary!.params as { genre: { es: string; en: string } }).genre;

    expect(genre.es).toBeTruthy();
    expect(genre.en).toBeTruthy();
    expect(genre.es).not.toBe("punk");
  });

  it("se abstiene con un período sin familia o con una familia desconocida", async () => {
    expect(await genreSpotlightPresenter(input("evergreen"))).toBeNull();
    expect(await genreSpotlightPresenter(input("2026-W41-no-existe"))).toBeNull();
  });
});

describe("one-per-decade", () => {
  it("el resumen dice la regla y cada disco su década y su año", () => {
    const context = buildOnePerDecadeContext(["a", "b"], { a: { date: "1994-03-01", year: 1994 }, b: { date: null, year: 2001 } });

    expect(context.summary).toEqual({ key: "decadeSummary" });
    expect(context.notes.get("a")).toEqual({ key: "decadeNote", params: { decade: "1990", year: "1994" } });
    expect(context.notes.get("b")).toEqual({ key: "decadeNote", params: { decade: "2000", year: "2001" } });
  });

  it("un disco sin año no lleva cartela", () => {
    expect(buildOnePerDecadeContext(["a"], { a: { date: null, year: null } }).notes.size).toBe(0);
  });

  it("el presentador consulta las fechas una sola vez por lote", async () => {
    mocks.albumReleaseDates.mockClear();
    mocks.albumReleaseDates.mockResolvedValue({});
    await onePerDecadePresenter({ ...input("evergreen"), templateKey: "one-per-decade" });
    expect(mocks.albumReleaseDates).toHaveBeenCalledTimes(1);
  });
});
