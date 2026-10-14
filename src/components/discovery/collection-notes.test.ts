import { describe, expect, it } from "vitest";
import { collectionNote } from "./collection-notes";

const today = new Date("2026-10-14T12:00:00Z");

describe("collectionNote", () => {
  it("efemérides con fecha completa: el aniversario que cumple este año", () => {
    expect(collectionNote("ephemeris", { date: "1956-10-15", year: 1956 }, today)).toEqual({
      kind: "anniversary",
      years: 70,
      date: "1956-10-15",
    });
  });

  it("efemérides sin fecha completa o del mismo año: cae al año", () => {
    expect(collectionNote("ephemeris", { date: "1956", year: 1956 }, today)).toEqual({ kind: "year", year: 1956 });
    expect(collectionNote("ephemeris", { date: "2026-10-01", year: 2026 }, today)).toEqual({ kind: "year", year: 2026 });
  });

  it("lanzamientos con fecha completa: la fecha; el resto, el año", () => {
    expect(collectionNote("releases", { date: "2026-10-09", year: 2026 }, today)).toEqual({ kind: "date", date: "2026-10-09" });
    expect(collectionNote("awards", { date: "2024-04-19", year: 2024 }, today)).toEqual({ kind: "year", year: 2024 });
  });

  it("sin datos: null", () => {
    expect(collectionNote("rankings", undefined, today)).toBeNull();
    expect(collectionNote("rankings", { date: null, year: null }, today)).toBeNull();
  });
});
