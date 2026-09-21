import { describe, expect, it, vi, beforeEach } from "vitest";
import { createOrReplaceReview, deleteReview, listReviews, updateReview } from "./reviews";

const mocks = vi.hoisted(() => ({
  db: { insert: vi.fn(), select: vi.fn(), delete: vi.fn(), update: vi.fn(), transaction: vi.fn() },
}));
vi.mock("@/db", () => ({ db: mocks.db }));

const ALBUM = {
  type: "release-group" as const,
  id: "00000000-0000-4000-8000-0000000000a1",
  column: "releaseGroupId" as const,
};
const ARTIST = {
  type: "artist" as const,
  id: "00000000-0000-4000-8000-0000000000a2",
  column: "artistId" as const,
};
const USER = "00000000-0000-4000-8000-0000000000b1";
const OTHER = "00000000-0000-4000-8000-0000000000b2";
const REVIEW_ID = "00000000-0000-4000-8000-0000000000c1";

function selectReturning(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  mocks.db.select.mockReturnValue({
    from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit }) }),
  });
  return limit;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createOrReplaceReview", () => {
  it("rechaza reseñas de artista o canción en esta versión", async () => {
    await expect(
      createOrReplaceReview(ARTIST, USER, { title: null, body: "texto" }),
    ).rejects.toMatchObject({ code: "REVIEW_TARGET_NOT_SUPPORTED", status: 400 });
    expect(mocks.db.transaction).not.toHaveBeenCalled();
  });

  it("exige un rating cuando no se envían estrellas y el usuario no valoró el álbum", async () => {
    const txSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }) }),
    });
    mocks.db.transaction.mockImplementation(async (cb: (tx: unknown) => unknown) =>
      cb({ select: txSelect, insert: vi.fn(), update: vi.fn() }),
    );

    await expect(
      createOrReplaceReview(ALBUM, USER, { title: null, body: "texto" }),
    ).rejects.toMatchObject({ code: "REVIEW_REQUIRES_RATING", status: 400 });
  });

  it("valida las estrellas incoherentes antes de escribir nada", async () => {
    mocks.db.transaction.mockImplementation(async (cb: (tx: unknown) => unknown) =>
      cb({ select: vi.fn(), insert: vi.fn(), update: vi.fn() }),
    );
    await expect(
      createOrReplaceReview(ALBUM, USER, { title: null, body: "t", stars: 4, detailedScore: 31 }),
    ).rejects.toMatchObject({ code: "INVALID_RATING", status: 400 });
  });
});

describe("updateReview", () => {
  it("distingue reseña inexistente de reseña ajena", async () => {
    const limit = selectReturning([]);
    await expect(updateReview(REVIEW_ID, USER, { body: "x" })).rejects.toMatchObject({
      code: "REVIEW_NOT_FOUND",
      status: 404,
    });

    limit.mockResolvedValue([
      { id: REVIEW_ID, userId: OTHER, artistId: null, releaseGroupId: ALBUM.id, recordingId: null },
    ]);
    await expect(updateReview(REVIEW_ID, USER, { body: "x" })).rejects.toMatchObject({
      code: "PERMISSION_DENIED",
      status: 403,
    });
  });
});

describe("deleteReview", () => {
  it("distingue reseña inexistente de reseña ajena", async () => {
    const limit = selectReturning([]);
    await expect(deleteReview(REVIEW_ID, USER)).rejects.toMatchObject({
      code: "REVIEW_NOT_FOUND",
      status: 404,
    });

    limit.mockResolvedValue([{ id: REVIEW_ID, userId: OTHER }]);
    await expect(deleteReview(REVIEW_ID, USER)).rejects.toMatchObject({
      code: "PERMISSION_DENIED",
      status: 403,
    });
    expect(mocks.db.delete).not.toHaveBeenCalled();
  });

  it("borra físicamente la reseña propia sin tocar el rating", async () => {
    selectReturning([{ id: REVIEW_ID, userId: USER }]);
    const where = vi.fn().mockResolvedValue(undefined);
    mocks.db.delete.mockReturnValue({ where });

    await deleteReview(REVIEW_ID, USER);

    expect(mocks.db.delete).toHaveBeenCalledTimes(1);
  });
});

describe("listReviews: autoría de cuentas desactivadas", () => {
  function listing(rows: unknown[]) {
    const target: unknown = new Proxy(function () {}, {
      get(_t, prop) {
        if (prop === "then") {
          const result = Promise.resolve(rows);
          return result.then.bind(result);
        }
        return () => target;
      },
    });
    mocks.db.select.mockReturnValue(target);
  }
  const base = {
    title: null,
    body: "x",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    stars: "4",
    detailedScore: null,
  };

  it("una reseña de una cuenta desactivada no entrega su usuario ni su nombre", async () => {
    listing([
      { ...base, id: "r1", user: { id: "u1", username: "ana", displayName: "Ana", deactivatedAt: new Date("2026-09-01") } },
      { ...base, id: "r2", user: { id: "u2", username: "fran", displayName: "Fran", deactivatedAt: null } },
    ]);

    const { reviews } = await listReviews(ALBUM, 1, 20);

    expect(reviews[0]!.user).toEqual({ id: "u1", username: "", displayName: null, deactivated: true });
    expect(JSON.stringify(reviews[0])).not.toMatch(/ana|Ana/);
    expect(reviews[1]!.user).toEqual({ id: "u2", username: "fran", displayName: "Fran", deactivated: false });
    // La reseña y su valoración se conservan.
    expect(reviews[0]).toMatchObject({ body: "x", rating: { stars: 4 } });
  });
});

