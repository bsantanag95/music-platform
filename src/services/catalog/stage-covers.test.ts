// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rows: [] as { id: string }[],
  findOrResolveCover: vi.fn(),
  after: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: { select: () => ({ from: () => ({ where: async () => mocks.rows }) }) },
}));
vi.mock("./cover", () => ({ findOrResolveCover: mocks.findOrResolveCover }));
vi.mock("next/server", () => ({ after: mocks.after }));

import { STAGE_RESOLVE_MAX, resolveStageCovers, stageCoversToResolve } from "./stage-covers";

const item = (id: string, year: number | null, coverResolved = false, coverThumbUrl: string | null = null) => ({
  id,
  year,
  coverResolved,
  coverThumbUrl,
});

describe("stageCoversToResolve (refine-artist-stage)", () => {
  it("con la portada ya llena no pide nada", () => {
    const full = Array.from({ length: 10 }, (_, i) => item(`r${i}`, 2000 + i, true, `/c/${i}`));
    expect(stageCoversToResolve([...full, item("x", 2020)], 8)).toEqual([]);
    // Pocos discos y todos con carátula: tampoco.
    expect(stageCoversToResolve([item("a", 2001, true, "/a"), item("b", 2002, true, "/b")], 8)).toEqual([]);
  });

  it("pide las que faltan, del disco más reciente al más antiguo, sin año al final, hasta el máximo", () => {
    const items = [item("old", 1977), item("nada", null), item("ok", 1980, true, "/ok"), item("new", 2023), item("mid", 1992)];
    expect(stageCoversToResolve(items, 8)).toEqual(["new", "mid", "old", "nada"]);
    const many = Array.from({ length: 30 }, (_, i) => item(`d${i}`, 1970 + i));
    expect(stageCoversToResolve(many, 8)).toHaveLength(STAGE_RESOLVE_MAX);
  });

  it("no reintenta una ausencia ya confirmada", () => {
    expect(stageCoversToResolve([item("sin", 1990, true, null), item("a", 1991)], 8)).toEqual(["a"]);
  });
});

describe("resolveStageCovers", () => {
  afterEach(() => {
    vi.useRealTimers();
    mocks.findOrResolveCover.mockReset();
    mocks.after.mockReset();
  });

  it("sin ids no consulta nada", async () => {
    expect(await resolveStageCovers([])).toEqual(new Map());
    expect(mocks.findOrResolveCover).not.toHaveBeenCalled();
  });

  it("devuelve las que llegan a tiempo y deja terminar el resto después de responder", async () => {
    vi.useFakeTimers();
    mocks.rows = [{ id: "fast" }, { id: "slow" }, { id: "none" }];
    mocks.findOrResolveCover.mockImplementation(async (row: { id: string }) => {
      if (row.id === "fast") return "/c/fast";
      if (row.id === "none") return null;
      return new Promise((resolve) => setTimeout(() => resolve("/c/slow"), 5000));
    });
    const pending = resolveStageCovers(["fast", "slow", "none"], 1500);
    await vi.advanceTimersByTimeAsync(1500);
    const result = await pending;
    expect([...result]).toEqual([["fast", "/c/fast"]]);
    expect(mocks.after).toHaveBeenCalledOnce();
  });
});
