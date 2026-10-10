import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listTopRated: vi.fn(),
  listRecentByYear: vi.fn(),
  tree: { tree: "g-1" },
}));

vi.mock("@/services/discovery/discovery", () => ({
  listTopRated: mocks.listTopRated,
  listRecentByYear: mocks.listRecentByYear,
}));
vi.mock("./read", () => ({ albumInGenreTree: () => mocks.tree }));

const { getGenreEssentials, getGenreNewReleases } = await import("./rails");

describe("rieles del género", () => {
  it("Esenciales delega en el riel de mejor valorados acotado al subárbol, con su umbral", async () => {
    mocks.listTopRated.mockResolvedValue([]);
    await expect(getGenreEssentials("g-1")).resolves.toEqual([]);
    expect(mocks.listTopRated).toHaveBeenCalledWith(12, mocks.tree);
  });

  it("Novedades delega en los recientes por año acotados al subárbol", async () => {
    mocks.listRecentByYear.mockResolvedValue([{ id: "a" }]);
    await expect(getGenreNewReleases("g-1")).resolves.toEqual([{ id: "a" }]);
    expect(mocks.listRecentByYear).toHaveBeenCalledWith(12, mocks.tree);
  });
});
