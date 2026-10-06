import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  getMostRecentEditedList,
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

// Fallback de las queries que un test no configura: vacía tanto si termina en
// `where()` (avatares de la página) como en `where().orderBy().limit()`
// (fuentes del feed).
function emptyQuery() {
  const where = vi.fn(() => Object.assign(Promise.resolve([]), { orderBy: () => ({ limit: async () => [] }) }));
  const chain = { innerJoin: vi.fn(() => chain), leftJoin: vi.fn(() => chain), where };
  return { from: vi.fn(() => chain) };
}

// Query encadenable de forma libre (from/innerJoin/where/groupBy/orderBy/as…)
// que al esperarla resuelve `rows` — para las consultas auxiliares de
// `listPublicLists` (recuento y carátulas por lista).
function chainQuery(rows: unknown[]) {
  const chain: Record<string, unknown> = {};
  for (const method of ["from", "innerJoin", "leftJoin", "where", "groupBy", "orderBy", "limit", "as"]) {
    chain[method] = vi.fn(() => chain);
  }
  chain.then = (resolve: (value: unknown[]) => unknown) => Promise.resolve(rows).then(resolve);
  return chain;
}

const author = { id: "00000000-0000-4000-8000-000000000002", username: "alguien", displayName: "Alguien" };

describe("servicio de datos de Inicio", () => {
  beforeEach(() => vi.clearAllMocks());

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
      }]))
        // subconsulta de carátulas numeradas, recuento por lista, carátulas (≤ 4)
        .mockReturnValueOnce(chainQuery([]))
        .mockReturnValueOnce(chainQuery([{ listId: "00000000-0000-4000-8000-000000000007", n: 12 }]))
        .mockReturnValueOnce(chainQuery([
          { listId: "00000000-0000-4000-8000-000000000007", cover: "https://example.com/a.jpg" },
          { listId: "00000000-0000-4000-8000-000000000007", cover: "https://example.com/b.jpg" },
        ]));

      const result = await listPublicLists(null, 10);

      expect(result).toEqual([
        expect.objectContaining({
          kind: "list",
          event: "updated",
          list: { id: "00000000-0000-4000-8000-000000000007", title: "Discos esenciales", entityType: "release-group" },
          itemCount: 12,
          coverThumbUrls: ["https://example.com/a.jpg", "https://example.com/b.jpg"],
        }),
      ]);
    });
  });

  describe("listMyRecentActivity", () => {
    // Las fuentes que un test no configura (colección, wishlist y Caminos,
    // openspec: expand-feed-coverage) devuelven vacío.
    beforeEach(() => mocks.db.select.mockReset().mockReturnValue(emptyQuery()));

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
        }]))
        .mockReturnValueOnce(sourceQuery([]))  // reseñas
        .mockReturnValueOnce(sourceQuery([]))  // follows
        .mockReturnValueOnce(sourceQuery([]));  // follow-artist

      const result = await listMyRecentActivity(author.id, 1, 5);

      expect(result.entries.map((entry) => entry.kind)).toEqual(["rating", "comment", "listen"]);
      expect(result).toMatchObject({ page: 1, pageSize: 5, hasNext: false });
    });

    it("incluye las reseñas propias, fechadas por su última edición", async () => {
      mocks.db.select
        .mockReturnValueOnce(sourceQuery([listenRow("00000000-0000-4000-8000-000000000020", "2026-02-01T00:00:00Z")]))
        .mockReturnValueOnce(sourceQuery([]))
        .mockReturnValueOnce(sourceQuery([]))
        .mockReturnValueOnce(sourceQuery([{
          id: "00000000-0000-4000-8000-000000000021",
          title: "Mi reseña",
          body: "Cuerpo de la reseña.",
          updatedAt: new Date("2026-02-10T00:00:00Z"),
          artistId: null,
          releaseGroupId: "00000000-0000-4000-8000-000000000022",
          recordingId: null,
          artistName: null,
          creditedArtist: "Pink Floyd",
          releaseTitle: "The Wall",
          releaseCover: null,
          recordingTitle: null,
          authorId: author.id,
          authorUsername: author.username,
          authorDisplayName: author.displayName,
        }]))
        .mockReturnValueOnce(sourceQuery([])) // follows
        .mockReturnValueOnce(sourceQuery([])); // follow-artist

      const result = await listMyRecentActivity(author.id, 1, 5);

      expect(result.entries.map((entry) => entry.kind)).toEqual(["review", "listen"]);
      expect(result.entries[0]).toMatchObject({
        kind: "review",
        title: "Mi reseña",
        body: "Cuerpo de la reseña.",
        createdAt: "2026-02-10T00:00:00.000Z",
      });
    });

    it("incluye escuchas con audiencia privada (contenido propio, sin filtro)", async () => {
      mocks.db.select
        .mockReturnValueOnce(sourceQuery([listenRow("00000000-0000-4000-8000-00000000000d", "2026-02-05T00:00:00Z")]))
        .mockReturnValueOnce(sourceQuery([]))
        .mockReturnValueOnce(sourceQuery([]))
        .mockReturnValueOnce(sourceQuery([]))
        .mockReturnValueOnce(sourceQuery([]))
        .mockReturnValueOnce(sourceQuery([]));

      const result = await listMyRecentActivity(author.id, 1, 5);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0]).toMatchObject({ kind: "listen", audience: "private" });
    });

    it("expone el álbum de una escucha propia, para la detección de barrido (add-feed-album-sweep)", async () => {
      mocks.db.select
        .mockReturnValueOnce(sourceQuery([{
          ...listenRow("00000000-0000-4000-8000-00000000000e", "2026-02-05T00:00:00Z"),
          artistId: null,
          recordingAlbumId: "00000000-0000-4000-8000-00000000000f",
          recordingAlbumTitle: "Man's Best Friend",
        }]))
        .mockReturnValueOnce(sourceQuery([]))
        .mockReturnValueOnce(sourceQuery([]))
        .mockReturnValueOnce(sourceQuery([]))
        .mockReturnValueOnce(sourceQuery([]))
        .mockReturnValueOnce(sourceQuery([]));

      const result = await listMyRecentActivity(author.id, 1, 5);

      expect(result.entries).toHaveLength(1);
      const entry = result.entries[0]!;
      expect("target" in entry ? entry.target : null).toMatchObject({
        albumId: "00000000-0000-4000-8000-00000000000f",
        albumTitle: "Man's Best Friend",
      });
    });

    it("incluye los seguimientos propios, sin regla de visibilidad (es la propia actividad)", async () => {
      mocks.db.select
        .mockReturnValueOnce(sourceQuery([]))
        .mockReturnValueOnce(sourceQuery([]))
        .mockReturnValueOnce(sourceQuery([]))
        .mockReturnValueOnce(sourceQuery([]))
        .mockReturnValueOnce(sourceQuery([{
          id: "00000000-0000-4000-8000-000000000030",
          createdAt: new Date("2026-02-09T00:00:00Z"),
          authorUsername: author.username,
          authorDisplayName: author.displayName,
          followedId: "00000000-0000-4000-8000-000000000031",
          followedUsername: "ana",
          followedDisplayName: "Ana",
        }]))
        .mockReturnValueOnce(sourceQuery([])); // follow-artist

      const result = await listMyRecentActivity(author.id, 1, 5);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0]).toMatchObject({
        kind: "follow",
        followedUser: { id: "00000000-0000-4000-8000-000000000031", username: "ana", displayName: "Ana" },
      });
    });

    it("incluye los seguimientos de artista propios, sin regla de visibilidad", async () => {
      mocks.db.select
        .mockReturnValueOnce(sourceQuery([]))
        .mockReturnValueOnce(sourceQuery([]))
        .mockReturnValueOnce(sourceQuery([]))
        .mockReturnValueOnce(sourceQuery([]))
        .mockReturnValueOnce(sourceQuery([])) // follows
        .mockReturnValueOnce(sourceQuery([{
          id: "00000000-0000-4000-8000-000000000032",
          createdAt: new Date("2026-02-09T00:00:00Z"),
          authorUsername: author.username,
          authorDisplayName: author.displayName,
          artistId: "00000000-0000-4000-8000-000000000033",
          artistName: "Radiohead",
        }])); // follow-artist

      const result = await listMyRecentActivity(author.id, 1, 5);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0]).toMatchObject({
        kind: "follow-artist",
        artist: { id: "00000000-0000-4000-8000-000000000033", name: "Radiohead" },
      });
    });

    it("incluye altas de colección y wishlist privadas y Caminos propios (expand-feed-coverage)", async () => {
      const album = {
        releaseGroupId: "00000000-0000-4000-8000-0000000000b1",
        releaseTitle: "Wish You Were Here",
        releaseCover: null,
        creditedArtist: "Pink Floyd",
        creditedArtistId: null,
        authorId: author.id,
        authorUsername: author.username,
        authorDisplayName: author.displayName,
      };
      // Orden: escuchas, ratings, comentarios, reseñas, seguir usuario, seguir
      // artista, colección, wishlist, Camino creado, Camino completado.
      for (let index = 0; index < 6; index++) mocks.db.select.mockReturnValueOnce(sourceQuery([]));
      mocks.db.select
        .mockReturnValueOnce(sourceQuery([{
          ...album,
          id: "00000000-0000-4000-8000-0000000000c1",
          format: "cd",
          audience: "private",
          createdAt: new Date("2026-03-03T00:00:00Z"),
        }]))
        .mockReturnValueOnce(sourceQuery([{
          ...album,
          id: "00000000-0000-4000-8000-0000000000c2",
          format: null,
          audience: "private",
          createdAt: new Date("2026-03-02T00:00:00Z"),
        }]))
        .mockReturnValueOnce(sourceQuery([{
          id: "00000000-0000-4000-8000-0000000000d1",
          title: "Krautrock esencial",
          audience: "private",
          at: new Date("2026-03-01T00:00:00Z"),
          albumCount: 0,
          authorId: author.id,
          authorUsername: author.username,
          authorDisplayName: author.displayName,
        }]));

      const result = await listMyRecentActivity(author.id, 1, 10);

      expect(result.entries.map((entry) => entry.kind)).toEqual(["collection", "wanted", "camino"]);
    });

    it("devuelve lista vacía cuando no hay actividad propia", async () => {
      mocks.db.select
        .mockReturnValueOnce(sourceQuery([]))
        .mockReturnValueOnce(sourceQuery([]))
        .mockReturnValueOnce(sourceQuery([]))
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
        .mockReturnValueOnce(sourceQuery([]))
        .mockReturnValueOnce(sourceQuery([]))
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
