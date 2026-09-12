import { describe, expect, it, vi, beforeEach } from "vitest";
import { listCommunityActivity } from "./community-activity";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn() },
}));

vi.mock("@/db", () => ({ db: mocks.db }));

// innerJoin()×n.where().orderBy().limit() → terminal de cada query de fuente.
function sourceQuery(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const orderBy = vi.fn(() => ({ limit }));
  const where = vi.fn(() => ({ orderBy }));
  const chain = { innerJoin: vi.fn(() => chain), leftJoin: vi.fn(() => chain), where };
  const from = vi.fn(() => chain);
  return { from };
}

const author = { id: "00000000-0000-4000-8000-000000000002", username: "alguien", displayName: "Alguien" };

const ratingRow = (id: string, date: string) => ({
  id,
  stars: "4.5",
  detailedScore: null,
  updatedAt: new Date(date),
  artistId: "00000000-0000-4000-8000-000000000001",
  releaseGroupId: null,
  recordingId: null,
  artistName: "Pink Floyd",
  releaseTitle: null,
  releaseCover: null,
  recordingTitle: null,
  authorId: author.id,
  authorUsername: author.username,
  authorDisplayName: author.displayName,
});

const commentRow = (id: string, date: string) => ({
  id,
  body: "Un discazo",
  createdAt: new Date(date),
  artistId: "00000000-0000-4000-8000-000000000001",
  releaseGroupId: null,
  recordingId: null,
  artistName: "Pink Floyd",
  releaseTitle: null,
  releaseCover: null,
  recordingTitle: null,
  authorId: author.id,
  authorUsername: author.username,
  authorDisplayName: author.displayName,
});

const reviewRow = (id: string, date: string) => ({
  id,
  title: "Obra maestra",
  body: "Un ensayo sobre el disco",
  updatedAt: new Date(date),
  artistId: "00000000-0000-4000-8000-000000000001",
  releaseGroupId: null,
  recordingId: null,
  artistName: "Pink Floyd",
  releaseTitle: null,
  releaseCover: null,
  recordingTitle: null,
  authorId: author.id,
  authorUsername: author.username,
  authorDisplayName: author.displayName,
});

// listCommunityActivity consulta rating, comment, review en ese orden (Promise.all).
function mockSources(ratings: unknown[], comments: unknown[], reviews: unknown[]) {
  mocks.db.select
    .mockReturnValueOnce(sourceQuery(ratings))
    .mockReturnValueOnce(sourceQuery(comments))
    .mockReturnValueOnce(sourceQuery(reviews));
}

describe("listCommunityActivity", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fusiona ratings, comentarios y reseñas ordenados por fecha descendente", async () => {
    mockSources(
      [ratingRow("00000000-0000-4000-8000-000000000003", "2026-01-01T00:00:00Z")],
      [commentRow("00000000-0000-4000-8000-000000000004", "2026-01-03T00:00:00Z")],
      [reviewRow("00000000-0000-4000-8000-000000000005", "2026-01-02T00:00:00Z")],
    );

    const result = await listCommunityActivity(null, 1, 10);

    expect(result.entries.map((entry) => entry.kind)).toEqual(["comment", "review", "rating"]);
    expect(result.page).toBe(1);
    expect(result.hasNext).toBe(false);
  });

  it("incluye el título y el cuerpo de una reseña", async () => {
    mockSources([], [], [reviewRow("00000000-0000-4000-8000-000000000005", "2026-01-02T00:00:00Z")]);

    const result = await listCommunityActivity(null, 1, 10);

    expect(result.entries[0]).toMatchObject({
      kind: "review",
      title: "Obra maestra",
      body: "Un ensayo sobre el disco",
    });
  });

  it("pagina con hasNext cuando hay más de una página", async () => {
    const ratings = Array.from({ length: 11 }, (_, i) =>
      ratingRow(
        `00000000-0000-4000-8000-0000000000${10 + i}`,
        `2026-01-${String(20 - i).padStart(2, "0")}T00:00:00Z`,
      ),
    );
    mockSources(ratings, [], []);

    const result = await listCommunityActivity(null, 1, 10);

    expect(result.entries).toHaveLength(10);
    expect(result.hasNext).toBe(true);
  });

  it("valida la paginación", async () => {
    await expect(listCommunityActivity(null, 0, 10)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
    await expect(listCommunityActivity(null, 1, 999)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it("funciona sin lector (anónimo)", async () => {
    mockSources([ratingRow("00000000-0000-4000-8000-000000000003", "2026-01-01T00:00:00Z")], [], []);

    const result = await listCommunityActivity(null, 1, 10);

    expect(result.entries).toHaveLength(1);
  });
});
