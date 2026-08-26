import { describe, expect, it, vi, beforeEach } from "vitest";
import { listCommunityActivity, listFollowingFeedPreview, listPublicLists } from "./home";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn() },
  listFeed: vi.fn(),
}));

vi.mock("@/db", () => ({ db: mocks.db }));
vi.mock("@/services/feed/feed", async () => {
  const actual = await vi.importActual<typeof import("@/services/feed/feed")>("@/services/feed/feed");
  return { ...actual, listFeed: mocks.listFeed };
});

// innerJoin()/leftJoin()×n.where().orderBy().limit() → terminal de cada query de Inicio
function sourceQuery(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const orderBy = vi.fn(() => ({ limit }));
  const where = vi.fn(() => ({ orderBy }));
  const chain = { innerJoin: vi.fn(() => chain), leftJoin: vi.fn(() => chain), where };
  const from = vi.fn(() => chain);
  return { from };
}

const author = { id: "00000000-0000-4000-8000-000000000002", username: "alguien", displayName: "Alguien" };

describe("servicio de datos de Inicio", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("listCommunityActivity", () => {
    it("fusiona ratings y comentarios ordenados por fecha descendente", async () => {
      mocks.db.select
        .mockReturnValueOnce(sourceQuery([{  // ratings
          id: "00000000-0000-4000-8000-000000000003",
          stars: "4.5",
          detailedScore: null,
          updatedAt: new Date("2026-01-01T00:00:00Z"),
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
        }]))
        .mockReturnValueOnce(sourceQuery([{  // comentarios
          id: "00000000-0000-4000-8000-000000000004",
          body: "Un discazo",
          createdAt: new Date("2026-01-02T00:00:00Z"),
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
        }]));

      const result = await listCommunityActivity(null, 10);

      expect(result.map((entry) => entry.kind)).toEqual(["comment", "rating"]);
    });

    it("acota al límite pedido tras fusionar ambas fuentes", async () => {
      const ratingRow = (id: string, date: string) => ({
        id,
        stars: "5.0",
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
      mocks.db.select
        .mockReturnValueOnce(sourceQuery([
          ratingRow("00000000-0000-4000-8000-000000000005", "2026-01-03T00:00:00Z"),
          ratingRow("00000000-0000-4000-8000-000000000006", "2026-01-02T00:00:00Z"),
        ]))
        .mockReturnValueOnce(sourceQuery([]));

      const result = await listCommunityActivity(author.id, 1);

      expect(result.length).toBe(1);
      expect(result[0]!.id).toBe("00000000-0000-4000-8000-000000000005");
    });
  });

  describe("listPublicLists", () => {
    it("distingue evento creado/actualizado por fecha y castea el tipo de entidad", async () => {
      mocks.db.select.mockReturnValueOnce(sourceQuery([{
        id: "00000000-0000-4000-8000-000000000007",
        entityType: "release-group",
        title: "Discos esenciales",
        audience: "public",
        createdAt: new Date("2026-01-01T00:00:00Z"),
        updatedAt: new Date("2026-01-05T00:00:00Z"),
        authorId: author.id,
        authorUsername: author.username,
        authorDisplayName: author.displayName,
      }]));

      const result = await listPublicLists(null, 10);

      expect(result).toEqual([
        expect.objectContaining({
          kind: "list",
          event: "updated",
          list: { id: "00000000-0000-4000-8000-000000000007", title: "Discos esenciales", entityType: "release-group" },
        }),
      ]);
    });
  });

  describe("listFollowingFeedPreview", () => {
    it("devuelve solo las entradas de listFeed, sin datos de paginación", async () => {
      mocks.listFeed.mockResolvedValue({ entries: [{ kind: "listen" }], page: 1, pageSize: 5, hasNext: true });

      const result = await listFollowingFeedPreview(author.id, 5);

      expect(mocks.listFeed).toHaveBeenCalledWith(author.id, 1, 5);
      expect(result).toEqual([{ kind: "listen" }]);
    });
  });
});
