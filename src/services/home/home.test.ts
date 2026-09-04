import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  getMostRecentEditedList,
  listCommunityActivity,
  listMyRecentActivity,
  listPublicLists,
} from "./home";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn() },
}));

vi.mock("@/db", () => ({ db: mocks.db }));

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

  describe("listMyRecentActivity", () => {
    const listenRow = (id: string, date: string) => ({
      id,
      listenContext: "first_listen",
      body: null,
      reaction: null,
      audience: "private",
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

    it("fusiona escuchas, ratings y comentarios propios ordenados por fecha desc", async () => {
      mocks.db.select
        .mockReturnValueOnce(sourceQuery([listenRow("00000000-0000-4000-8000-00000000000a", "2026-02-01T00:00:00Z")]))
        .mockReturnValueOnce(sourceQuery([{
          id: "00000000-0000-4000-8000-00000000000b",
          stars: "5.0",
          detailedScore: null,
          updatedAt: new Date("2026-02-03T00:00:00Z"),
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
        .mockReturnValueOnce(sourceQuery([{
          id: "00000000-0000-4000-8000-00000000000c",
          body: "Nota mental",
          createdAt: new Date("2026-02-02T00:00:00Z"),
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

      const result = await listMyRecentActivity(author.id, 1, 5);

      expect(result.entries.map((entry) => entry.kind)).toEqual(["rating", "comment", "listen"]);
      expect(result).toMatchObject({ page: 1, pageSize: 5, hasNext: false });
    });

    it("incluye escuchas con audiencia privada (contenido propio, sin filtro)", async () => {
      mocks.db.select
        .mockReturnValueOnce(sourceQuery([listenRow("00000000-0000-4000-8000-00000000000d", "2026-02-05T00:00:00Z")]))
        .mockReturnValueOnce(sourceQuery([]))
        .mockReturnValueOnce(sourceQuery([]));

      const result = await listMyRecentActivity(author.id, 1, 5);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0]).toMatchObject({ kind: "listen", audience: "private" });
    });

    it("devuelve lista vacía cuando no hay actividad propia", async () => {
      mocks.db.select
        .mockReturnValueOnce(sourceQuery([]))
        .mockReturnValueOnce(sourceQuery([]))
        .mockReturnValueOnce(sourceQuery([]));

      const result = await listMyRecentActivity(author.id, 1, 5);

      expect(result.entries).toEqual([]);
      expect(result.hasNext).toBe(false);
    });

    it("indica hasNext cuando hay más entradas que pageSize", async () => {
      mocks.db.select
        .mockReturnValueOnce(sourceQuery([
          listenRow("00000000-0000-4000-8000-00000000000f", "2026-02-06T00:00:00Z"),
          listenRow("00000000-0000-4000-8000-000000000010", "2026-02-05T00:00:00Z"),
        ]))
        .mockReturnValueOnce(sourceQuery([]))
        .mockReturnValueOnce(sourceQuery([]));

      const result = await listMyRecentActivity(author.id, 1, 1);

      expect(result.entries).toHaveLength(1);
      expect(result.hasNext).toBe(true);
    });

    it("rechaza paginación inválida", async () => {
      await expect(listMyRecentActivity(author.id, 0)).rejects.toMatchObject({
        code: "VALIDATION_ERROR",
      });
    });
  });

  describe("getMostRecentEditedList", () => {
    // from().leftJoin().where().groupBy().orderBy().limit()
    function listQuery(rows: unknown[]) {
      const limit = vi.fn().mockResolvedValue(rows);
      const orderBy = vi.fn(() => ({ limit }));
      const groupBy = vi.fn(() => ({ orderBy }));
      const where = vi.fn(() => ({ groupBy }));
      const leftJoin = vi.fn(() => ({ where }));
      return { from: vi.fn(() => ({ leftJoin })) };
    }

    it("devuelve null cuando el usuario no tiene listas", async () => {
      mocks.db.select.mockReturnValueOnce(listQuery([]));

      const result = await getMostRecentEditedList(author.id);

      expect(result).toBeNull();
    });

    it("devuelve la lista y sus carátulas, casteando itemCount a número", async () => {
      mocks.db.select
        .mockReturnValueOnce(listQuery([{
          id: "00000000-0000-4000-8000-00000000000e",
          title: "Para el auto",
          entityType: "release-group",
          itemCount: "3",
        }]))
        .mockReturnValueOnce(sourceQuery([{ cover: "https://cover/1.jpg" }, { cover: "https://cover/2.jpg" }]));

      const result = await getMostRecentEditedList(author.id);

      expect(result).toEqual({
        id: "00000000-0000-4000-8000-00000000000e",
        title: "Para el auto",
        entityType: "release-group",
        itemCount: 3,
        coverThumbUrls: ["https://cover/1.jpg", "https://cover/2.jpg"],
      });
    });
  });
});
