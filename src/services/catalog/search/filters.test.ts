import { describe, expect, it } from "vitest";
import {
  activeFilterCount,
  filtersForType,
  filtersToParams,
  formatDuration,
  parseAdvancedFilters,
  parseDurationInput,
  withoutFilter,
} from "./filters";
import { effectiveDecade, parseCatalogSearchParams } from "./params";

function read(query: string) {
  const params = new URLSearchParams(query);
  return (key: string) => params.get(key);
}

describe("parseAdvancedFilters", () => {
  it("lee los filtros de Artistas y pasa el país a mayúsculas", () => {
    expect(parseAdvancedFilters("artist", read("country=ar&beginFrom=1980&beginTo=1989&ended=1"))).toEqual({
      country: "AR",
      beginFrom: 1980,
      beginTo: 1989,
      ended: true,
    });
    expect(parseAdvancedFilters("artist", read("ended=0")).ended).toBe(false);
  });

  it("ignora valores inválidos sin error", () => {
    expect(
      parseAdvancedFilters("artist", read("country=Argentina&beginFrom=80&beginTo=2200&ended=si")),
    ).toEqual({});
    expect(parseAdvancedFilters("album", read("yearFrom=1850&yearTo=abcd"))).toEqual({});
    expect(parseAdvancedFilters("song", read("durMin=-3&durMax=9000"))).toEqual({});
    expect(parseAdvancedFilters("album", read(`artist=${"x".repeat(201)}`))).toEqual({});
  });

  it("trata los vacíos como ausentes", () => {
    expect(parseAdvancedFilters("artist", read("country=&beginFrom=&ended="))).toEqual({});
    expect(parseAdvancedFilters("album", read("artist=%20%20"))).toEqual({});
  });

  it("intercambia un rango invertido", () => {
    expect(parseAdvancedFilters("album", read("yearFrom=1986&yearTo=1983"))).toEqual({ yearFrom: 1983, yearTo: 1986 });
    expect(parseAdvancedFilters("song", read("durMin=420&durMax=60"))).toEqual({ durMin: 60, durMax: 420 });
  });

  it("ignora los filtros de otro tipo", () => {
    expect(parseAdvancedFilters("album", read("country=GB&ended=1&durMax=60"))).toEqual({});
    expect(parseAdvancedFilters("artist", read("artist=queen&yearFrom=1980"))).toEqual({});
    expect(parseAdvancedFilters("user", read("country=AR&artist=queen"))).toEqual({});
  });

  it("acepta un rango con un solo extremo", () => {
    expect(parseAdvancedFilters("album", read("yearFrom=1983"))).toEqual({ yearFrom: 1983 });
  });
});

describe("rango y década", () => {
  it("el rango de años gana a la década", () => {
    expect(effectiveDecade(1970, { yearFrom: 1980 })).toBeUndefined();
    expect(effectiveDecade(1970, {})).toBe(1970);
  });

  it("el endpoint descarta la década con un rango y no falla con filtros inválidos", () => {
    const parsed = parseCatalogSearchParams(new URLSearchParams("type=album&q=kiss&decade=1970&yearFrom=1980"));
    expect(parsed.decade).toBeUndefined();
    expect(parsed.filters).toEqual({ yearFrom: 1980 });
    expect(parseCatalogSearchParams(new URLSearchParams("type=artist&q=sumo&country=XYZ")).filters).toEqual({});
  });
});

describe("utilidades", () => {
  it("cuenta, serializa y quita filtros", () => {
    const filters = { country: "AR", beginFrom: 1980, beginTo: 1989, ended: false };
    // El rango cuenta una vez, como su chip.
    expect(activeFilterCount(filters)).toBe(3);
    expect(filtersToParams(filters)).toEqual({ country: "AR", beginFrom: "1980", beginTo: "1989", ended: "0" });
    expect(withoutFilter(filters, "beginFrom")).toEqual({ country: "AR", ended: false });
    expect(withoutFilter(filters, "ended")).toEqual({ country: "AR", beginFrom: 1980, beginTo: 1989 });
  });

  it("conserva solo los filtros compatibles al cambiar de tipo", () => {
    const album = { artist: "jeff buckley", yearFrom: 1994 };
    expect(filtersForType("song", album)).toEqual({ artist: "jeff buckley" });
    expect(filtersForType("artist", album)).toEqual({});
  });

  it("formatea y lee duraciones", () => {
    expect(formatDuration(420)).toBe("7:00");
    expect(formatDuration(65)).toBe("1:05");
    expect(parseDurationInput("7:00")).toBe(420);
    expect(parseDurationInput("3")).toBe(180);
    expect(parseDurationInput("3:75")).toBeUndefined();
    expect(parseDurationInput("abc")).toBeUndefined();
  });
});
