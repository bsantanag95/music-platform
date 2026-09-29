import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ exists: [] as unknown[] }));
const mocks = vi.hoisted(() => ({ getDiscographyMarks: vi.fn() }));
vi.mock("@/db", () => ({
  db: { select: () => ({ from: () => ({ where: () => ({ limit: async () => state.exists }) }) }) },
}));
vi.mock("./artist-discography-view", () => ({ getDiscographyMarks: mocks.getDiscographyMarks }));

const { getReleaseGroupMarks } = await import("./release-group-marks");

beforeEach(() => {
  vi.clearAllMocks();
  state.exists = [{ id: "rg" }];
});

describe("getReleaseGroupMarks", () => {
  it("proyecta las marcas por lote de un solo disco", async () => {
    mocks.getDiscographyMarks.mockResolvedValue({
      listened: ["rg"],
      stars: { rg: 4 },
      detailedScores: { rg: 81 },
      favorites: [],
      pending: ["rg"],
      lists: { rg: [{ listId: "l1", itemId: "i1", kind: "standard", title: "Favoritas" }] },
    });
    expect(await getReleaseGroupMarks("u1", "rg")).toEqual({
      listened: true,
      stars: 4,
      detailedScore: 81,
      favorite: false,
      pending: true,
      lists: [{ listId: "l1", itemId: "i1", kind: "standard", title: "Favoritas" }],
    });
    expect(mocks.getDiscographyMarks).toHaveBeenCalledWith("u1", ["rg"]);
  });

  it("un disco inexistente lanza ALBUM_NOT_FOUND", async () => {
    state.exists = [];
    await expect(getReleaseGroupMarks("u1", "rg")).rejects.toMatchObject({ code: "ALBUM_NOT_FOUND", status: 404 });
    expect(mocks.getDiscographyMarks).not.toHaveBeenCalled();
  });
});
