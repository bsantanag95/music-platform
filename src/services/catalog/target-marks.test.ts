import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({
  isFavorited: vi.fn(),
  isWantToListen: vi.fn(),
  getOwnRatingRow: vi.fn(),
  resolveSocialTarget: vi.fn(),
}));
vi.mock("@/services/favorites/favorites", () => ({ isFavorited: mocks.isFavorited }));
vi.mock("@/services/want-to-listen/want-to-listen", () => ({ isWantToListen: mocks.isWantToListen }));
vi.mock("@/services/social", () => ({
  getOwnRatingRow: mocks.getOwnRatingRow,
  resolveSocialTarget: mocks.resolveSocialTarget,
}));

const { getTargetMarks } = await import("./target-marks");

beforeEach(() => {
  vi.clearAllMocks();
  mocks.resolveSocialTarget.mockImplementation(async (type: string, id: string) => ({ type, id, column: "x" }));
  mocks.isFavorited.mockResolvedValue(false);
  mocks.isWantToListen.mockResolvedValue(false);
  mocks.getOwnRatingRow.mockResolvedValue(null);
});

describe("getTargetMarks", () => {
  it("combina favorito, Pendiente y valoración de un álbum", async () => {
    mocks.isFavorited.mockResolvedValue(true);
    mocks.getOwnRatingRow.mockResolvedValue({ stars: "4.0", detailedScore: 81 });
    expect(await getTargetMarks("u1", "release-group", "rg")).toEqual({
      favorite: true,
      pending: false,
      stars: 4,
      detailedScore: 81,
    });
    expect(mocks.isWantToListen).toHaveBeenCalledWith({ type: "release-group", id: "rg" }, "u1");
  });

  it("sin valoración devuelve stars y detailedScore en null", async () => {
    expect(await getTargetMarks("u1", "artist", "a1")).toEqual({
      favorite: false,
      pending: false,
      stars: null,
      detailedScore: null,
    });
  });

  it("para una canción pending es null y no consulta Pendiente", async () => {
    const marks = await getTargetMarks("u1", "recording", "r1");
    expect(marks.pending).toBeNull();
    expect(mocks.isWantToListen).not.toHaveBeenCalled();
  });

  it("un objetivo inexistente propaga el 404 sin consultar marcas", async () => {
    mocks.resolveSocialTarget.mockRejectedValue(new ApiError("INVALID_TARGET", 404, "El objetivo no existe"));
    await expect(getTargetMarks("u1", "artist", "a1")).rejects.toMatchObject({ code: "INVALID_TARGET", status: 404 });
    expect(mocks.isFavorited).not.toHaveBeenCalled();
  });
});
