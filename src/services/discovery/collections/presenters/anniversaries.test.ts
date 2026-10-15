import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ albumReleaseDates: vi.fn() }));
vi.mock("../../discovery", () => ({ albumReleaseDates: mocks.albumReleaseDates }));

const { buildAnniversariesContext, anniversariesPresenter } = await import("./anniversaries");

const input = (periodKey: string | null) => ({
  templateKey: "anniversaries",
  periodKey,
  family: "ephemeris" as const,
  albumIds: ["a"],
  today: new Date("2026-10-14T12:00:00Z"),
});

describe("buildAnniversariesContext", () => {
  it("la edad se calcula contra el año del PERÍODO, no el de hoy", () => {
    const context = buildAnniversariesContext(["a"], { a: { date: "1975-09-05", year: 1975 } }, { year: 2025, month: 9 });

    expect(context.notes.get("a")).toEqual({
      key: "anniversary",
      params: { years: 50, date: { date: "1975-09-05", style: "short" } },
    });
  });

  it("el resumen nombra el mes del período y el rango de años que cumplen", () => {
    const dates = { a: { date: "1956-10-15", year: 1956 }, b: { date: "2006-10-02", year: 2006 }, c: { date: "1986-10-20", year: 1986 } };
    const { summary } = buildAnniversariesContext(["a", "b", "c"], dates, { year: 2026, month: 10 });

    expect(summary).toEqual({
      key: "anniversariesSummary",
      params: { month: { date: "2026-10-01", style: "month-year-inline" }, from: 20, to: 70 },
    });
  });

  it("si todos cumplen la misma edad el resumen la dice una sola vez", () => {
    const dates = { a: { date: "1976-10-15", year: 1976 }, b: { date: "1976-10-02", year: 1976 } };
    expect(buildAnniversariesContext(["a", "b"], dates, { year: 2026, month: 10 }).summary).toMatchObject({
      key: "anniversariesSummarySingle",
      params: { years: 50 },
    });
  });

  it("sin fecha completa, o sin años cumplidos, cae al año; sin datos no hay cartela", () => {
    const dates = { a: { date: "1956", year: 1956 }, b: { date: "2026-10-01", year: 2026 } };
    const context = buildAnniversariesContext(["a", "b", "c"], dates, { year: 2026, month: 10 });

    expect(context.notes.get("a")).toEqual({ key: "year", params: { year: "1956" } });
    expect(context.notes.get("b")).toEqual({ key: "year", params: { year: "2026" } });
    expect(context.notes.has("c")).toBe(false);
    expect(context.summary).toBeUndefined();
  });

  it("no agrupa ni numera", () => {
    const context = buildAnniversariesContext(["a"], { a: { date: "1956-10-15", year: 1956 } }, { year: 2026, month: 10 });
    expect(context.groups).toBeUndefined();
    expect(context.numbered).toBe(false);
  });
});

describe("anniversariesPresenter", () => {
  it("se abstiene con un período ilegible, sin consultar la base", async () => {
    mocks.albumReleaseDates.mockClear();
    expect(await anniversariesPresenter(input("evergreen"))).toBeNull();
    expect(await anniversariesPresenter(input(null))).toBeNull();
    expect(mocks.albumReleaseDates).not.toHaveBeenCalled();
  });

  it("con período válido consulta las fechas una sola vez por lote", async () => {
    mocks.albumReleaseDates.mockResolvedValue({ a: { date: "1956-10-15", year: 1956 } });
    const context = await anniversariesPresenter(input("2026-10"));

    expect(mocks.albumReleaseDates).toHaveBeenCalledTimes(1);
    expect(context!.notes.get("a")).toMatchObject({ key: "anniversary", params: { years: 70 } });
  });
});
