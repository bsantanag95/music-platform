import { describe, expect, it, vi } from "vitest";
import { listFeed } from "./feed";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn() },
}));

vi.mock("@/db", () => ({ db: mocks.db }));

function followedQuery(followedIds: string[]) {
  const where = vi.fn().mockResolvedValue(followedIds.map((followedId) => ({ followedId })));
  const from = vi.fn(() => ({ where }));
  return { from };
}

// leftJoin()×n.where().orderBy().limit() → terminal de cada fuente del feed
function sourceQuery(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const orderBy = vi.fn(() => ({ limit }));
  const where = vi.fn(() => ({ orderBy }));
  const chain = { leftJoin: vi.fn(() => chain), where };
  const from = vi.fn(() => chain);
  return { from };
}

const author = { id: "00000000-0000-4000-8000-000000000002", username: "seguido", displayName: "Seguido" };

const listenRow = {
  id: "00000000-0000-4000-8000-000000000003",
  listenContext: "first_listen",
  body: null,
  reaction: "loved",
  audience: "followers",
  createdAt: new Date("2026-01-01T00:00:00Z"),
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
};

describe("servicio de feed ampliado", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rechaza paginación inválida", async () => {
    await expect(listFeed(author.id, 0)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("devuelve lista vacía sin seguidos", async () => {
    mocks.db.select.mockReturnValue(followedQuery([]));
    const result = await listFeed(author.id, 1, 20);
    expect(result.entries).toEqual([]);
    expect(result.hasNext).toBe(false);
  });

  it("fusiona escuchas, favoritos y listas ordenados por fecha", async () => {
    const followed = ["u2"];
    mocks.db.select
      .mockReturnValueOnce(followedQuery(followed))  // seguidos
      .mockReturnValueOnce(sourceQuery([listenRow]))  // escuchas
      .mockReturnValueOnce(sourceQuery([{  // favoritos
        id: "00000000-0000-4000-8000-000000000004",
        audience: "public",
        createdAt: new Date("2026-01-02T00:00:00Z"),
        artistId: null,
        releaseGroupId: null,
        recordingId: "00000000-0000-4000-8000-000000000005",
        artistName: null,
        releaseTitle: null,
        releaseCover: null,
        recordingTitle: "Comfortably Numb",
        authorId: author.id,
        authorUsername: author.username,
        authorDisplayName: author.displayName,
      }]))
      .mockReturnValueOnce(sourceQuery([{  // listas
        id: "00000000-0000-4000-8000-000000000006",
        entityType: "release-group",
        title: "Discos esenciales",
        audience: "public",
        createdAt: new Date("2026-01-03T00:00:00Z"),
        updatedAt: new Date("2026-01-03T00:00:00Z"),
        authorId: author.id,
        authorUsername: author.username,
        authorDisplayName: author.displayName,
      }]))
      .mockReturnValueOnce(sourceQuery([]))  // ratings
      .mockReturnValueOnce(sourceQuery([]));  // comentarios

    const result = await listFeed(author.id, 1, 20);

    expect(result.entries.length).toBe(3);
    expect(result.entries[0]!.kind).toBe("list");
    expect(result.entries[1]!.kind).toBe("favorite");
    expect(result.entries[2]!.kind).toBe("listen");
  });

  it("expone el artista principal en el objetivo de un álbum y null en el de un artista", async () => {
    mocks.db.select
      .mockReturnValueOnce(followedQuery(["u2"]))
      .mockReturnValueOnce(sourceQuery([]))  // escuchas
      .mockReturnValueOnce(sourceQuery([
        {  // favorito de álbum → artista acreditado
          id: "00000000-0000-4000-8000-0000000000a1",
          audience: "public",
          createdAt: new Date("2026-02-02T00:00:00Z"),
          artistId: null,
          releaseGroupId: "00000000-0000-4000-8000-0000000000a2",
          recordingId: null,
          artistName: null,
          creditedArtist: "Tame Impala",
          releaseTitle: "Currents",
          releaseCover: null,
          recordingTitle: null,
          authorId: author.id,
          authorUsername: author.username,
          authorDisplayName: author.displayName,
        },
        {  // favorito de artista → sin artista separado
          id: "00000000-0000-4000-8000-0000000000a3",
          audience: "public",
          createdAt: new Date("2026-02-01T00:00:00Z"),
          artistId: "00000000-0000-4000-8000-0000000000a4",
          releaseGroupId: null,
          recordingId: null,
          artistName: "Radiohead",
          creditedArtist: null,
          releaseTitle: null,
          releaseCover: null,
          recordingTitle: null,
          authorId: author.id,
          authorUsername: author.username,
          authorDisplayName: author.displayName,
        },
      ]))
      .mockReturnValueOnce(sourceQuery([]))  // listas
      .mockReturnValueOnce(sourceQuery([]))  // ratings
      .mockReturnValueOnce(sourceQuery([]));  // comentarios

    const result = await listFeed(author.id, 1, 20);

    const album = result.entries.find((e) => e.id === "00000000-0000-4000-8000-0000000000a1");
    const artistFav = result.entries.find((e) => e.id === "00000000-0000-4000-8000-0000000000a3");
    expect(album && "target" in album ? album.target : null).toMatchObject({
      title: "Currents",
      artistName: "Tame Impala",
    });
    expect(artistFav && "target" in artistFav ? artistFav.target : null).toMatchObject({
      title: "Radiohead",
      artistName: null,
    });
  });

  it("distingue evento de lista actualizada por updatedAt > createdAt", async () => {
    const followed = ["u2"];
    mocks.db.select
      .mockReturnValueOnce(followedQuery(followed))
      .mockReturnValueOnce(sourceQuery([]))
      .mockReturnValueOnce(sourceQuery([]))
      .mockReturnValueOnce(sourceQuery([{
        id: "00000000-0000-4000-8000-000000000006",
        entityType: "artist",
        title: "Mis bandas",
        audience: "followers",
        createdAt: new Date("2026-01-01T00:00:00Z"),
        updatedAt: new Date("2026-01-04T00:00:00Z"),
        authorId: author.id,
        authorUsername: author.username,
        authorDisplayName: author.displayName,
      }]))
      .mockReturnValueOnce(sourceQuery([]))
      .mockReturnValueOnce(sourceQuery([]));

    const result = await listFeed(author.id, 1, 20);
    expect(result.entries[0]!.kind).toBe("list");
    expect((result.entries[0] as { event: string }).event).toBe("updated");
  });

  it("muestra el rating vigente una sola vez tras un cambio de valoración", async () => {
    const followed = ["u2"];
    mocks.db.select
      .mockReturnValueOnce(followedQuery(followed))
      .mockReturnValueOnce(sourceQuery([]))  // escuchas
      .mockReturnValueOnce(sourceQuery([]))  // favoritos
      .mockReturnValueOnce(sourceQuery([]))  // listas
      .mockReturnValueOnce(sourceQuery([{  // ratings: solo la fila vigente, ya reemplazada por upsert
        id: "00000000-0000-4000-8000-000000000007",
        stars: "4.5",
        detailedScore: 90,
        updatedAt: new Date("2026-01-05T00:00:00Z"),
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
      .mockReturnValueOnce(sourceQuery([]));  // comentarios

    const result = await listFeed(author.id, 1, 20);

    expect(result.entries.length).toBe(1);
    expect(result.entries[0]).toMatchObject({ kind: "rating", stars: "4.5", detailedScore: 90 });
  });

  it("muestra una entrada por cada comentario del mismo objetivo", async () => {
    const followed = ["u2"];
    const commentRow = (id: string, createdAt: string) => ({
      id,
      body: `Comentario ${id}`,
      createdAt: new Date(createdAt),
      artistId: null,
      releaseGroupId: "00000000-0000-4000-8000-000000000008",
      recordingId: null,
      artistName: null,
      releaseTitle: "The Wall",
      releaseCover: null,
      recordingTitle: null,
      authorId: author.id,
      authorUsername: author.username,
      authorDisplayName: author.displayName,
    });

    mocks.db.select
      .mockReturnValueOnce(followedQuery(followed))
      .mockReturnValueOnce(sourceQuery([]))  // escuchas
      .mockReturnValueOnce(sourceQuery([]))  // favoritos
      .mockReturnValueOnce(sourceQuery([]))  // listas
      .mockReturnValueOnce(sourceQuery([]))  // ratings
      .mockReturnValueOnce(sourceQuery([
        commentRow("00000000-0000-4000-8000-000000000009", "2026-01-06T00:00:00Z"),
        commentRow("00000000-0000-4000-8000-00000000000a", "2026-01-05T00:00:00Z"),
      ]));

    const result = await listFeed(author.id, 1, 20);

    expect(result.entries.length).toBe(2);
    expect(result.entries.every((entry) => entry.kind === "comment")).toBe(true);
    expect(result.entries[0]!.id).toBe("00000000-0000-4000-8000-000000000009");
  });

  it("ordena cronológicamente entre las cinco fuentes", async () => {
    const followed = ["u2"];
    mocks.db.select
      .mockReturnValueOnce(followedQuery(followed))
      .mockReturnValueOnce(sourceQuery([listenRow]))  // 2026-01-01
      .mockReturnValueOnce(sourceQuery([]))  // favoritos
      .mockReturnValueOnce(sourceQuery([]))  // listas
      .mockReturnValueOnce(sourceQuery([{  // rating: 2026-01-07 (más reciente)
        id: "00000000-0000-4000-8000-00000000000b",
        stars: "5.0",
        detailedScore: null,
        updatedAt: new Date("2026-01-07T00:00:00Z"),
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
      .mockReturnValueOnce(sourceQuery([{  // comentario: 2026-01-02
        id: "00000000-0000-4000-8000-00000000000c",
        body: "Genial",
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

    const result = await listFeed(author.id, 1, 20);

    expect(result.entries.map((entry) => entry.kind)).toEqual(["rating", "comment", "listen"]);
  });
});