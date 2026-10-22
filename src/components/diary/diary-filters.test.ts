import { describe, expect, it } from "vitest";
import {
  EMPTY_DIARY_FILTERS,
  activeFilterCount,
  dateValue,
  filtersFromSearchParams,
  filtersToSearchParams,
  parseDateValue,
  toApiFilters,
} from "./diary-filters";

describe("filtros del diario en la URL", () => {
  it("lee los filtros válidos de la URL", () => {
    const filters = filtersFromSearchParams(
      new URLSearchParams("q=ratt&reaction=none&context=relisten&audience=public&type=recording&year=2026&month=9"),
    );
    expect(filters).toEqual({
      q: "ratt",
      reaction: "none",
      context: "relisten",
      audience: "public",
      type: "recording",
      year: "2026",
      month: "9",
    });
  });

  it("ignora valores inválidos y un mes sin año, sin fallar", () => {
    const filters = filtersFromSearchParams({
      reaction: "furia",
      type: "playlist",
      audience: ["public", "private"],
      year: "1500",
      month: "9",
    });
    expect(filters).toEqual({ ...EMPTY_DIARY_FILTERS, audience: "public" });
  });

  it("escribe solo los filtros activos y conserva otros parámetros", () => {
    const next = filtersToSearchParams(
      { ...EMPTY_DIARY_FILTERS, reaction: "loved", month: "9" },
      new URLSearchParams("tab=x&type=artist"),
    );
    expect(next.toString()).toBe("tab=x&reaction=loved");
  });

  it("la búsqueda viaja a la API pero no cuenta como filtro del panel", () => {
    const filters = { ...EMPTY_DIARY_FILTERS, q: " kid a ", type: "artist" as const, year: "2026", month: "1" };
    expect(activeFilterCount(filters)).toBe(2);
    expect(toApiFilters(filters)).toMatchObject({ q: "kid a", type: "artist", year: 2026, month: 1 });
  });

  it("el control de fecha codifica año o año-mes", () => {
    expect(dateValue({ year: "", month: "" })).toBe("");
    expect(dateValue({ year: "2026", month: "" })).toBe("2026");
    expect(dateValue({ year: "2026", month: "9" })).toBe("2026-9");
    expect(parseDateValue("2026-9")).toEqual({ year: "2026", month: "9" });
    expect(parseDateValue("2026")).toEqual({ year: "2026", month: "" });
    expect(parseDateValue("")).toEqual({ year: "", month: "" });
  });
});
