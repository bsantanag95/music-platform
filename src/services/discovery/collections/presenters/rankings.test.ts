import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ ratingStats: vi.fn(), popularPeopleOf: vi.fn() }));
vi.mock("./ranking-stats", () => ({ ratingStats: mocks.ratingStats }));
vi.mock("../../popularity", () => ({ popularPeopleOf: mocks.popularPeopleOf }));

const { buildPopularMonthContext, buildTopRatedContext, popularMonthPresenter, topRatedPresenter } = await import("./rankings");

const input = (templateKey: string, periodKey: string | null) => ({
  templateKey,
  periodKey,
  family: "rankings" as const,
  albumIds: ["a", "b"],
  today: new Date("2026-10-14T12:00:00Z"),
});

describe("buildTopRatedContext", () => {
  it("el resumen nombra el trimestre y el mínimo real de valoraciones, y numera", () => {
    const context = buildTopRatedContext(["a"], new Map(), { year: 2026, quarter: 4 });

    expect(context.summary).toEqual({ key: "topRatedSummary", params: { quarter: "4", year: "2026", min: 3 } });
    expect(context.numbered).toBe(true);
  });

  it("cada disco dice su promedio y su número de valoraciones del período; sin cifra, sin cartela", () => {
    const context = buildTopRatedContext(["a", "b"], new Map([["a", { average: 4.5, count: 12 }]]), { year: 2026, quarter: 4 });

    expect(context.notes.get("a")).toEqual({ key: "topRatedNote", params: { average: 4.5, count: 12 } });
    expect(context.notes.has("b")).toBe(false);
  });
});

describe("buildPopularMonthContext", () => {
  it("el resumen nombra el mes, numera y la cartela dice las personas solo desde 5", () => {
    const context = buildPopularMonthContext(["a", "b", "c"], new Map([["a", 12], ["b", 3]]), { year: 2026, month: 10 });

    expect(context.summary).toEqual({
      key: "popularMonthSummary",
      params: { month: { date: "2026-10-01", style: "month-year-inline" } },
    });
    expect(context.numbered).toBe(true);
    expect(context.notes.get("a")).toEqual({ key: "popularMonthNote", params: { count: 12 } });
    expect(context.notes.has("b")).toBe(false);
    expect(context.notes.has("c")).toBe(false);
  });
});

describe("presentadores de ranking", () => {
  beforeEach(() => {
    mocks.ratingStats.mockReset();
    mocks.popularPeopleOf.mockReset();
  });

  it("top-rated consulta las valoraciones UNA vez, con los límites del trimestre de su período", async () => {
    mocks.ratingStats.mockResolvedValue(new Map([["a", { average: 4, count: 5 }]]));
    const context = await topRatedPresenter(input("top-rated-quarter", "2026-Q4"));

    expect(mocks.ratingStats).toHaveBeenCalledTimes(1);
    expect(mocks.ratingStats).toHaveBeenCalledWith(["a", "b"], {
      start: "2026-10-01T00:00:00.000Z",
      end: "2027-01-01T00:00:00.000Z",
    });
    expect(context!.notes.get("a")).toMatchObject({ key: "topRatedNote" });
  });

  it("popular-month consulta las personas UNA vez, con los límites del mes de su período", async () => {
    mocks.popularPeopleOf.mockResolvedValue(new Map([["a", 6]]));
    const context = await popularMonthPresenter(input("popular-month", "2026-09"));

    expect(mocks.popularPeopleOf).toHaveBeenCalledTimes(1);
    expect(mocks.popularPeopleOf).toHaveBeenCalledWith(["a", "b"], {
      start: "2026-09-01T00:00:00.000Z",
      end: "2026-10-01T00:00:00.000Z",
    });
    expect(context!.notes.get("a")).toEqual({ key: "popularMonthNote", params: { count: 6 } });
  });


  it("se abstienen con un período ilegible, sin consultar la base", async () => {
    expect(await topRatedPresenter(input("top-rated-quarter", "2026-10"))).toBeNull();
    expect(await popularMonthPresenter(input("popular-month", "2026-Q4"))).toBeNull();
    expect(mocks.ratingStats).not.toHaveBeenCalled();
    expect(mocks.popularPeopleOf).not.toHaveBeenCalled();
  });
});
