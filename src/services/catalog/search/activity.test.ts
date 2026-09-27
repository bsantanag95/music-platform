import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ db: { execute: vi.fn() } }));

const { db } = await import("@/db");
const { activityScores } = await import("./activity");

describe("activityScores", () => {
  beforeEach(() => vi.mocked(db.execute).mockReset());

  it("sin ids no consulta la base", async () => {
    expect(await activityScores("release-group", [])).toEqual(new Map());
    expect(db.execute).not.toHaveBeenCalled();
  });

  it("devuelve el puntaje por id en una sola consulta", async () => {
    vi.mocked(db.execute).mockResolvedValueOnce([
      { id: "rg-1", score: 3 },
      { id: "rg-2", score: "1" },
    ] as never);
    const scores = await activityScores("release-group", ["rg-1", "rg-2", "rg-1"]);
    expect(db.execute).toHaveBeenCalledTimes(1);
    expect(scores).toEqual(
      new Map([
        ["rg-1", 3],
        ["rg-2", 1],
      ]),
    );
  });
});
