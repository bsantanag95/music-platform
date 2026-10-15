import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ albumReleaseDates: vi.fn() }));
vi.mock("../../discovery", () => ({ albumReleaseDates: mocks.albumReleaseDates }));

const { buildNewReleasesContext, newReleasesPresenter } = await import("./new-releases");
const { relativeNote } = await import("./relative");
const { normalizeGroups } = await import("./groups");

const today = new Date("2026-10-14T18:30:00Z");
const day = (date: string) => ({ date, year: Number(date.slice(0, 4)) });

describe("relativeNote", () => {
  it("hoy y ayer", () => {
    expect(relativeNote("2026-10-14", today)).toEqual({ key: "newReleasesToday" });
    expect(relativeNote("2026-10-13", today)).toEqual({ key: "newReleasesYesterday" });
  });

  it("hasta la semana, días con la fecha corta", () => {
    expect(relativeNote("2026-10-09", today)).toEqual({
      key: "newReleasesDaysAgo",
      params: { days: 5, date: { date: "2026-10-09", style: "day-month" } },
    });
    expect(relativeNote("2026-10-08", today)).toMatchObject({ key: "newReleasesDaysAgo", params: { days: 6 } });
  });

  it("desde la semana, semanas (21 días son 3)", () => {
    expect(relativeNote("2026-09-23", today)).toEqual({
      key: "newReleasesWeeksAgo",
      params: { weeks: 3, date: { date: "2026-09-23", style: "day-month" } },
    });
    expect(relativeNote("2026-10-07", today)).toMatchObject({ params: { weeks: 1 } });
  });

  it("el reloj del servidor no corre el día: a las 23:59 UTC sigue siendo hoy", () => {
    expect(relativeNote("2026-10-14", new Date("2026-10-14T23:59:59Z"))).toEqual({ key: "newReleasesToday" });
  });

  it("una fecha futura cae a la fecha sola", () => {
    expect(relativeNote("2026-10-20", today)).toEqual({ key: "date", params: { date: { date: "2026-10-20", style: "short" } } });
  });
});

describe("buildNewReleasesContext", () => {
  const ids = ["a", "b", "c", "d"];

  it("el resumen dice la ventana y el rango REAL de los discos mostrados", () => {
    const dates = { a: day("2026-10-12"), b: day("2026-09-02"), c: day("2026-07-17"), d: day("2026-10-01") };
    const { summary } = buildNewReleasesContext(ids, dates, today);

    expect(summary).toEqual({
      key: "newReleasesSummary",
      params: { days: 90, from: { date: "2026-07-17", style: "day-month" }, to: { date: "2026-10-12", style: "day-month" } },
    });
  });

  it("con una sola fecha (o ninguna) el resumen no inventa un rango", () => {
    expect(buildNewReleasesContext(["a"], { a: day("2026-10-12") }, today).summary).toEqual({
      key: "newReleasesSummaryNoRange",
      params: { days: 90 },
    });
    expect(buildNewReleasesContext(["a"], { a: { date: "2026", year: 2026 } }, today).summary?.key).toBe("newReleasesSummaryNoRange");
  });

  it("agrupa por mes, del más reciente al más antiguo, y conserva el orden de la lista dentro de cada mes", () => {
    const dates = { a: day("2026-09-02"), b: day("2026-10-12"), c: day("2026-07-17"), d: day("2026-10-01") };
    const { groups } = buildNewReleasesContext(ids, dates, today);

    expect(groups!.map((group) => group.albumIds)).toEqual([["b", "d"], ["a"], ["c"]]);
    expect(groups![0]!.label).toEqual({ key: "monthHeading", params: { month: { date: "2026-10-01", style: "month-year" } } });
    expect(groups![2]!.label).toEqual({ key: "monthHeading", params: { month: { date: "2026-07-01", style: "month-year" } } });
  });

  it("un disco sin fecha completa da su año y, tras normalizar, cae al grupo final sin encabezado", () => {
    const dates = { a: day("2026-10-12"), b: { date: "2026", year: 2026 }, c: day("2026-09-02") };
    const context = buildNewReleasesContext(["a", "b", "c"], dates, today);

    expect(context.notes.get("b")).toEqual({ key: "year", params: { year: "2026" } });
    const groups = normalizeGroups(["a", "b", "c"], context.groups!);
    expect(groups.at(-1)).toEqual({ albumIds: ["b"] });
    expect(groups.at(-1)!.label).toBeUndefined();
  });

  it("cada disco con fecha completa lleva su cartela relativa y ninguno se numera", () => {
    const context = buildNewReleasesContext(["a", "b"], { a: day("2026-10-14"), b: day("2026-10-09") }, today);

    expect(context.notes.get("a")).toEqual({ key: "newReleasesToday" });
    expect(context.notes.get("b")!.key).toBe("newReleasesDaysAgo");
    expect(context.numbered).toBe(false);
  });

  it("sin ningún disco con fecha no hay grupos", () => {
    expect(buildNewReleasesContext(["a"], { a: { date: null, year: 2026 } }, today).groups).toBeUndefined();
  });
});

describe("newReleasesPresenter", () => {
  beforeEach(() => mocks.albumReleaseDates.mockReset());

  it("consulta las fechas una sola vez por lote", async () => {
    mocks.albumReleaseDates.mockResolvedValue({ a: day("2026-10-12"), b: day("2026-09-02") });
    const context = await newReleasesPresenter({
      templateKey: "new-releases",
      periodKey: "evergreen",
      family: "releases",
      albumIds: ["a", "b"],
      today,
    });

    expect(mocks.albumReleaseDates).toHaveBeenCalledTimes(1);
    expect(mocks.albumReleaseDates).toHaveBeenCalledWith(["a", "b"]);
    expect(context!.groups).toHaveLength(2);
  });
});
