import { describe, expect, it, vi } from "vitest";

vi.mock("../../discovery", () => ({ albumReleaseDates: vi.fn() }));

const { buildUpcomingContext } = await import("./upcoming");
const { normalizeGroups } = await import("./groups");

const today = new Date("2026-10-14T12:00:00Z");
const day = (date: string) => ({ date, year: Number(date.slice(0, 4)) });

describe("buildUpcomingContext", () => {
  it("el resumen dice el rango real de fechas y no una ventana de días", () => {
    const { summary } = buildUpcomingContext(["a", "b"], { a: day("2026-10-23"), b: day("2026-12-05") }, today);

    expect(summary).toEqual({
      key: "upcomingSummary",
      params: { from: { date: "2026-10-23", style: "day-month" }, to: { date: "2026-12-05", style: "day-month" } },
    });
    expect(Object.keys(summary!.params!)).not.toContain("days");
  });

  it("con una sola fecha, o ninguna, no inventa un rango", () => {
    expect(buildUpcomingContext(["a"], { a: day("2026-10-23") }, today).summary).toEqual({ key: "upcomingSummaryNoRange" });
    expect(buildUpcomingContext(["a"], {}, today).summary).toEqual({ key: "upcomingSummaryNoRange" });
  });

  it("cuenta regresiva por disco: mañana, días y semanas", () => {
    const context = buildUpcomingContext(
      ["a", "b", "c"],
      { a: day("2026-10-15"), b: day("2026-10-23"), c: day("2026-11-12") },
      today,
    );
    expect(context.notes.get("a")).toEqual({ key: "upcomingTomorrow" });
    expect(context.notes.get("b")).toMatchObject({ key: "upcomingDaysIn", params: { days: 9 } });
    expect(context.notes.get("c")).toMatchObject({ key: "upcomingWeeksIn", params: { weeks: 4 } });
  });

  it("agrupa por mes del más cercano al más lejano, conservando el orden de la lista dentro de cada mes", () => {
    const dates = { a: day("2026-12-05"), b: day("2026-10-23"), c: day("2027-01-10"), d: day("2026-10-30") };
    const { groups } = buildUpcomingContext(["a", "b", "c", "d"], dates, today);

    expect(groups!.map((group) => group.albumIds)).toEqual([["b", "d"], ["a"], ["c"]]);
    expect(groups![0]!.label).toEqual({ key: "monthHeading", params: { month: { date: "2026-10-01", style: "month-year" } } });
  });

  it("un disco que ya salió usa la cartela de pasado, no un número negativo", () => {
    const context = buildUpcomingContext(["a"], { a: day("2026-10-11") }, today);
    expect(context.notes.get("a")).toMatchObject({ key: "newReleasesDaysAgo", params: { days: 3 } });
  });

  it("un disco sin fecha completa da su año y cae al grupo final sin encabezado", () => {
    const dates = { a: day("2026-10-23"), b: { date: "2027", year: 2027 } };
    const context = buildUpcomingContext(["a", "b"], dates, today);

    expect(context.notes.get("b")).toEqual({ key: "year", params: { year: "2027" } });
    expect(normalizeGroups(["a", "b"], context.groups!).at(-1)).toEqual({ albumIds: ["b"] });
  });

  it("no numera", () => {
    expect(buildUpcomingContext(["a"], { a: day("2026-10-23") }, today).numbered).toBe(false);
  });
});
