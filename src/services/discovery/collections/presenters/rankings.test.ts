import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ ratingStats: vi.fn(), reviewCounts: vi.fn() }));
vi.mock("./ranking-stats", () => ({ ratingStats: mocks.ratingStats, reviewCounts: mocks.reviewCounts }));

const { buildMostReviewedContext, buildTopRatedContext, mostReviewedPresenter, topRatedPresenter } = await import("./rankings");

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

describe("buildMostReviewedContext", () => {
  it("el resumen nombra el mes, numera y cada disco dice sus reseñas", () => {
    const context = buildMostReviewedContext(["a", "b"], new Map([["a", 12]]), { year: 2026, month: 10 });

    expect(context.summary).toEqual({
      key: "mostReviewedSummary",
      params: { month: { date: "2026-10-01", style: "month-year-inline" } },
    });
    expect(context.numbered).toBe(true);
    expect(context.notes.get("a")).toEqual({ key: "mostReviewedNote", params: { count: 12 } });
    expect(context.notes.has("b")).toBe(false);
  });
});

describe("presentadores de ranking", () => {
  beforeEach(() => {
    mocks.ratingStats.mockReset();
    mocks.reviewCounts.mockReset();
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

  it("most-reviewed consulta las reseñas UNA vez, con los límites del mes de su período", async () => {
    mocks.reviewCounts.mockResolvedValue(new Map([["a", 3]]));
    const context = await mostReviewedPresenter(input("most-reviewed-month", "2026-09"));

    expect(mocks.reviewCounts).toHaveBeenCalledTimes(1);
    expect(mocks.reviewCounts).toHaveBeenCalledWith(["a", "b"], {
      start: "2026-09-01T00:00:00.000Z",
      end: "2026-10-01T00:00:00.000Z",
    });
    expect(context!.notes.get("a")).toEqual({ key: "mostReviewedNote", params: { count: 3 } });
  });

  it("se abstienen con un período ilegible, sin consultar la base", async () => {
    expect(await topRatedPresenter(input("top-rated-quarter", "2026-10"))).toBeNull();
    expect(await mostReviewedPresenter(input("most-reviewed-month", "2026-Q4"))).toBeNull();
    expect(mocks.ratingStats).not.toHaveBeenCalled();
    expect(mocks.reviewCounts).not.toHaveBeenCalled();
  });
});
