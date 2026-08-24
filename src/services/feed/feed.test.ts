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
      }]));

    const result = await listFeed(author.id, 1, 20);

    expect(result.entries.length).toBe(3);
    expect(result.entries[0]!.kind).toBe("list");
    expect(result.entries[1]!.kind).toBe("favorite");
    expect(result.entries[2]!.kind).toBe("listen");
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
      }]));

    const result = await listFeed(author.id, 1, 20);
    expect(result.entries[0]!.kind).toBe("list");
    expect((result.entries[0] as { event: string }).event).toBe("updated");
  });
});