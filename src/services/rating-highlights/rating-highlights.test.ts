import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getProfileRatingHighlights,
  highlightRating,
  listRatingHighlights,
  RATING_HIGHLIGHT_MAX,
  unhighlightRating,
} from "./rating-highlights";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn(), insert: vi.fn(), delete: vi.fn() },
  getProfileByUsername: vi.fn(),
}));

vi.mock("@/db", () => ({ db: mocks.db }));
vi.mock("@/services/feed/feed", () => ({
  PRIMARY_ARTIST_SQL: () => ({}),
  RECORDING_COVER_SQL: () => ({}),
}));
vi.mock("@/services/social/profiles", () => ({
  getProfileByUsername: mocks.getProfileByUsername,
}));

// select().from().where().limit()
function whereLimit(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where }));
  return { from };
}

// select().from().where()  (sin limit — el conteo)
function whereTerminal(rows: unknown[]) {
  const where = vi.fn().mockResolvedValue(rows);
  const from = vi.fn(() => ({ where }));
  return { from };
}

// select().from().innerJoin().leftJoin()x3.where().orderBy()  (listRatingHighlights)
function joinOrderBy(rows: unknown[]) {
  const orderBy = vi.fn().mockResolvedValue(rows);
  const where = vi.fn(() => ({ orderBy }));
  const chain = { innerJoin: vi.fn(() => chain), leftJoin: vi.fn(() => chain), where };
  const from = vi.fn(() => chain);
  return { from };
}

const user = "00000000-0000-4000-8000-000000000001";
const ratingId = "00000000-0000-4000-8000-000000000002";

const highlightRow = {
  id: ratingId,
  stars: "4.5",
  detailedScore: null,
  artistId: null,
  releaseGroupId: "00000000-0000-4000-8000-000000000003",
  recordingId: null,
  artistName: null,
  releaseTitle: "Blonde",
  releaseCover: "https://example.com/blonde.jpg",
  recordingTitle: null,
  recordingCover: null,
  creditedArtist: "Frank Ocean",
};

beforeEach(() => vi.clearAllMocks());

describe("listRatingHighlights", () => {
  it("resuelve la entidad de cada destacado y omite filas cuya entidad ya no existe", async () => {
    mocks.db.select.mockReturnValue(
      joinOrderBy([highlightRow, { ...highlightRow, id: "x", releaseTitle: null }]),
    );
    const result = await listRatingHighlights(user);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: ratingId, stars: "4.5", entity: { title: "Blonde" } });
  });
});

describe("highlightRating", () => {
  it("destaca una valoración propia", async () => {
    mocks.db.select
      .mockReturnValueOnce(whereLimit([{ id: ratingId }])) // es del dueño
      .mockReturnValueOnce(whereLimit([])) // no estaba destacada
      .mockReturnValueOnce(whereTerminal([{ n: 0 }])) // conteo bajo el tope
      .mockReturnValueOnce(joinOrderBy([highlightRow])); // listRatingHighlights final
    mocks.db.insert.mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });

    const result = await highlightRating(user, ratingId);

    expect(mocks.db.insert).toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });

  it("es idempotente: ya destacada, no inserta de nuevo", async () => {
    mocks.db.select
      .mockReturnValueOnce(whereLimit([{ id: ratingId }]))
      .mockReturnValueOnce(whereLimit([{ ratingId }])) // ya destacada
      .mockReturnValueOnce(joinOrderBy([highlightRow]));

    await highlightRating(user, ratingId);

    expect(mocks.db.insert).not.toHaveBeenCalled();
  });

  it(`rechaza una ${RATING_HIGHLIGHT_MAX + 1}ª valoración destacada con VALIDATION_ERROR`, async () => {
    mocks.db.select
      .mockReturnValueOnce(whereLimit([{ id: ratingId }]))
      .mockReturnValueOnce(whereLimit([]))
      .mockReturnValueOnce(whereTerminal([{ n: RATING_HIGHLIGHT_MAX }]));

    await expect(highlightRating(user, ratingId)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      status: 400,
    });
    expect(mocks.db.insert).not.toHaveBeenCalled();
  });

  it("rechaza una valoración ajena o inexistente con RATING_NOT_FOUND", async () => {
    mocks.db.select.mockReturnValueOnce(whereLimit([]));
    await expect(highlightRating(user, ratingId)).rejects.toMatchObject({
      code: "RATING_NOT_FOUND",
      status: 404,
    });
  });
});

describe("unhighlightRating", () => {
  it("quita el destacado de forma idempotente", async () => {
    mocks.db.delete.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
    mocks.db.select.mockReturnValueOnce(joinOrderBy([]));

    const result = await unhighlightRating(user, ratingId);

    expect(mocks.db.delete).toHaveBeenCalled();
    expect(result).toEqual([]);
  });
});

describe("getProfileRatingHighlights", () => {
  it("devuelve lista vacía cuando el perfil no es accesible para el lector", async () => {
    mocks.getProfileByUsername.mockResolvedValue({ id: user, accessible: false });
    const result = await getProfileRatingHighlights("ana", "viewer");
    expect(result).toEqual([]);
    expect(mocks.db.select).not.toHaveBeenCalled();
  });

  it("no filtra por audiencia cuando el perfil es accesible (spec rating-highlights)", async () => {
    mocks.getProfileByUsername.mockResolvedValue({ id: user, accessible: true });
    mocks.db.select.mockReturnValue(joinOrderBy([highlightRow]));

    const result = await getProfileRatingHighlights("ana", null); // visitante anónimo

    expect(result).toHaveLength(1);
  });
});
