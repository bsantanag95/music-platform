import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rows: [] as { listId: string; albumId: string }[],
  selects: 0,
  presenters: {
    upcoming: vi.fn<(input: unknown) => Promise<unknown>>(),
    anniversaries: vi.fn<(input: unknown) => Promise<unknown>>(),
  },
}));

vi.mock("@/db", () => ({
  db: {
    select: () => {
      mocks.selects += 1;
      const builder: Record<string, unknown> = {
        from: () => builder,
        where: () => builder,
        orderBy: () => Promise.resolve(mocks.rows),
      };
      return builder;
    },
  },
}));
vi.mock("./presenters", () => ({
  TEMPLATE_PRESENTERS: {
    upcoming: (input: unknown) => mocks.presenters.upcoming(input),
    anniversaries: (input: unknown) => mocks.presenters.anniversaries(input),
  },
}));

const { listCollectionSummaries } = await import("./summaries");

const collection = (id: string, templateKey: string | null, source: "curated" | "template" = "template") => ({
  id,
  title: id,
  description: null,
  itemCount: 3,
  coverThumbs: [],
  source,
  templateKey,
  periodKey: "2026-10",
  family: "ephemeris" as const,
});

const summary = (key: string) => ({ notes: new Map(), numbered: false, summary: { key } });

beforeEach(() => {
  mocks.rows = [];
  mocks.selects = 0;
  for (const presenter of Object.values(mocks.presenters)) presenter.mockReset();
});

describe("listCollectionSummaries", () => {
  it("lee los álbumes de todas las colecciones en un solo lote y corre un presentador por colección", async () => {
    mocks.rows = [
      { listId: "a", albumId: "a1" },
      { listId: "a", albumId: "a2" },
      { listId: "b", albumId: "b1" },
    ];
    mocks.presenters.anniversaries.mockResolvedValue(summary("anniversariesSummary"));
    mocks.presenters.upcoming.mockResolvedValue(summary("upcomingSummary"));

    const result = await listCollectionSummaries(
      [collection("a", "anniversaries"), collection("b", "upcoming")],
      new Date("2026-10-14T12:00:00Z"),
    );

    expect(mocks.selects).toBe(1);
    expect(mocks.presenters.anniversaries).toHaveBeenCalledWith(expect.objectContaining({ albumIds: ["a1", "a2"] }));
    expect(mocks.presenters.upcoming).toHaveBeenCalledWith(expect.objectContaining({ albumIds: ["b1"] }));
    expect(result.get("a")).toEqual({ key: "anniversariesSummary" });
    expect(result.get("b")).toEqual({ key: "upcomingSummary" });
  });

  it("las curadas y las plantillas sin presentador propio no llevan resumen ni consultan la base", async () => {
    const result = await listCollectionSummaries([collection("c", null, "curated"), collection("d", "otra-plantilla")]);

    expect(result.size).toBe(0);
    expect(mocks.selects).toBe(0);
  });

  it("un presentador que falla deja sin línea a esa colección y no afecta a las demás", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.rows = [
      { listId: "a", albumId: "a1" },
      { listId: "b", albumId: "b1" },
    ];
    mocks.presenters.anniversaries.mockRejectedValue(new Error("boom"));
    mocks.presenters.upcoming.mockResolvedValue(summary("upcomingSummary"));

    const result = await listCollectionSummaries([collection("a", "anniversaries"), collection("b", "upcoming")]);

    expect(result.has("a")).toBe(false);
    expect(result.get("b")).toEqual({ key: "upcomingSummary" });
  });

  it("un presentador que se abstiene o no trae resumen deja la tarjeta sin línea", async () => {
    mocks.rows = [{ listId: "a", albumId: "a1" }];
    mocks.presenters.anniversaries.mockResolvedValue({ notes: new Map(), numbered: false });

    const result = await listCollectionSummaries([collection("a", "anniversaries")]);

    expect(result.size).toBe(0);
  });
});
