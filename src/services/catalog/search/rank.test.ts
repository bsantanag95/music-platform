import { describe, expect, it } from "vitest";
import { compareRankKeys, type RankKey } from "./rank";

const key = (overrides: Partial<RankKey>): RankKey => ({ level: 0, activity: 0, group: 1, index: 0, ...overrides });

describe("compareRankKeys", () => {
  it("lo explorado va después de la actividad y antes de la notoriedad (refine-search-results-phase1)", () => {
    const explored = key({ known: 2, popularity: 0, index: 24 });
    const popular = key({ known: 0, popularity: 50, index: 0 });
    const active = key({ activity: 3, known: 0 });
    expect([popular, explored, active].sort(compareRankKeys)).toEqual([active, explored, popular]);
  });

  it("el nivel de coincidencia sigue mandando sobre lo explorado", () => {
    const exact = key({ level: 0 });
    const exploredPartial = key({ level: 2, known: 2 });
    expect([exploredPartial, exact].sort(compareRankKeys)).toEqual([exact, exploredPartial]);
  });
});
