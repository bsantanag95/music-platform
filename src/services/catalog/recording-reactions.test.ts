import { beforeEach, describe, expect, it, vi } from "vitest";
import { getRecordingReactionSummary } from "./recording-reactions";

const mocks = vi.hoisted(() => ({ select: vi.fn() }));
vi.mock("@/db", () => ({ db: { select: mocks.select } }));

// select().from().where().groupBy()  → terminal groupBy
function groupByTerminal(rows: unknown[]) {
  const groupBy = vi.fn().mockResolvedValue(rows);
  const where = vi.fn(() => ({ groupBy }));
  const from = vi.fn(() => ({ where }));
  return () => ({ from });
}

beforeEach(() => vi.clearAllMocks());

describe("getRecordingReactionSummary", () => {
  it("agrega los conteos públicos y elige la reacción predominante", async () => {
    mocks.select.mockImplementation(
      groupByTerminal([
        { reaction: "loved", n: 2 },
        { reaction: "obsessed", n: 5 },
        { reaction: "liked", n: 1 },
      ]),
    );

    const summary = await getRecordingReactionSummary("rec-1");
    expect(summary.total).toBe(8);
    expect(summary.top).toBe("obsessed");
    expect(summary.byReaction).toMatchObject({ loved: 2, obsessed: 5, liked: 1, neutral: 0, disliked: 0 });
  });

  it("devuelve total 0 y top null cuando no hay reacciones públicas", async () => {
    mocks.select.mockImplementation(groupByTerminal([]));
    const summary = await getRecordingReactionSummary("rec-2");
    expect(summary).toMatchObject({ total: 0, top: null });
    expect(Object.values(summary.byReaction).every((n) => n === 0)).toBe(true);
  });

  it("ignora filas con reacción desconocida", async () => {
    mocks.select.mockImplementation(
      groupByTerminal([
        { reaction: "loved", n: 3 },
        { reaction: "weird_value", n: 9 },
      ]),
    );
    const summary = await getRecordingReactionSummary("rec-3");
    expect(summary.total).toBe(3);
    expect(summary.top).toBe("loved");
  });
});
