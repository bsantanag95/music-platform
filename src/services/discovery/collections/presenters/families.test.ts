import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ albumReleaseDates: vi.fn() }));
vi.mock("../../discovery", () => ({ albumReleaseDates: mocks.albumReleaseDates }));

const { FAMILY_PRESENTERS, familyNote } = await import("./families");

const today = new Date("2026-10-14T12:00:00Z");

describe("familyNote", () => {
  it("efemérides con fecha completa: el aniversario que cumple este año", () => {
    expect(familyNote("ephemeris", { date: "1956-10-15", year: 1956 }, today)).toEqual({
      key: "anniversary",
      params: { years: 70, date: { date: "1956-10-15", style: "short" } },
    });
  });

  it("efemérides sin fecha completa o del mismo año: cae al año", () => {
    expect(familyNote("ephemeris", { date: "1956", year: 1956 }, today)).toEqual({ key: "year", params: { year: "1956" } });
    expect(familyNote("ephemeris", { date: "2026-10-01", year: 2026 }, today)).toEqual({ key: "year", params: { year: "2026" } });
  });

  it("lanzamientos con fecha completa: la fecha; el resto, el año", () => {
    expect(familyNote("releases", { date: "2026-10-09", year: 2026 }, today)).toEqual({
      key: "date",
      params: { date: { date: "2026-10-09", style: "short" } },
    });
    expect(familyNote("awards", { date: "2024-04-19", year: 2024 }, today)).toEqual({ key: "year", params: { year: "2024" } });
    expect(familyNote("discovery", { date: null, year: 1999 }, today)).toEqual({ key: "year", params: { year: "1999" } });
  });

  it("sin datos: null", () => {
    expect(familyNote("releases", undefined, today)).toBeNull();
    expect(familyNote("discovery", { date: null, year: null }, today)).toBeNull();
  });
});

describe("presentadores de familia", () => {
  beforeEach(() => mocks.albumReleaseDates.mockReset());

  const input = (family: "ephemeris" | "rankings" | "awards") => ({
    templateKey: "t",
    periodKey: "evergreen",
    family,
    albumIds: ["a", "b"],
    today,
  });

  it("consultan las fechas una sola vez por lote y dan una cartela por disco con fecha", async () => {
    mocks.albumReleaseDates.mockResolvedValue({ a: { date: "1956-10-15", year: 1956 } });
    const context = await FAMILY_PRESENTERS.ephemeris(input("ephemeris"));

    expect(mocks.albumReleaseDates).toHaveBeenCalledTimes(1);
    expect(mocks.albumReleaseDates).toHaveBeenCalledWith(["a", "b"]);
    expect([...context!.notes.keys()]).toEqual(["a"]);
    expect(context!.notes.get("a")!.key).toBe("anniversary");
  });

  it("solo rankings numera los discos", async () => {
    mocks.albumReleaseDates.mockResolvedValue({});
    expect((await FAMILY_PRESENTERS.rankings(input("rankings")))!.numbered).toBe(true);
    expect((await FAMILY_PRESENTERS.awards(input("awards")))!.numbered).toBe(false);
    expect((await FAMILY_PRESENTERS.ephemeris(input("ephemeris")))!.numbered).toBe(false);
  });

  it("no agrupan ni resumen: eso es de los presentadores de plantilla", async () => {
    mocks.albumReleaseDates.mockResolvedValue({});
    const context = (await FAMILY_PRESENTERS.awards(input("awards")))!;
    expect(context.summary).toBeUndefined();
    expect(context.groups).toBeUndefined();
  });
});
