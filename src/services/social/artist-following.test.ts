import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
import {
  countFollowedArtists,
  followArtist,
  followedArtistIdsWithin,
  isFollowingArtist,
  listFollowedArtists,
  unfollowArtist,
} from "./artist-following";

const rowsByTable: Record<string, unknown[]> = {};

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
  deleteFn: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: { select: mocks.select, insert: mocks.insert, delete: mocks.deleteFn },
}));

function chainFor() {
  let table = "";
  const resolved = () => Promise.resolve(rowsByTable[table] ?? []);
  const step: unknown = new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === "from") {
          return (t: unknown) => {
            table = getTableName(t as Parameters<typeof getTableName>[0]);
            return step;
          };
        }
        if (prop === "then") return resolved().then.bind(resolved());
        if (prop === "catch") return resolved().catch.bind(resolved());
        if (prop === "finally") return resolved().finally.bind(resolved());
        return () => step;
      },
    },
  );
  return step;
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const k of Object.keys(rowsByTable)) delete rowsByTable[k];
  mocks.select.mockImplementation(() => chainFor());
  const onConflictDoNothing = vi.fn().mockResolvedValue(undefined);
  mocks.insert.mockReturnValue({ values: () => ({ onConflictDoNothing }) });
  mocks.deleteFn.mockReturnValue({ where: async () => undefined });
});

describe("followArtist", () => {
  it("inserta con onConflictDoNothing (idempotente) cuando el artista existe", async () => {
    rowsByTable.artist = [{ id: "a1" }];
    await expect(followArtist("u1", "a1")).resolves.toEqual({ following: true });
    expect(mocks.insert).toHaveBeenCalledTimes(1);
  });

  it("404 cuando el artista no existe", async () => {
    rowsByTable.artist = [];
    await expect(followArtist("u1", "nope")).rejects.toMatchObject({ code: "ARTIST_NOT_FOUND" });
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});

describe("unfollowArtist", () => {
  it("borra y no falla aunque no siguiera", async () => {
    await expect(unfollowArtist("u1", "a1")).resolves.toEqual({ following: false });
    expect(mocks.deleteFn).toHaveBeenCalledTimes(1);
  });
});

describe("isFollowingArtist", () => {
  it("true si hay fila", async () => {
    rowsByTable.artist_follow = [{ id: "f1" }];
    await expect(isFollowingArtist("u1", "a1")).resolves.toBe(true);
  });
  it("false si no hay fila", async () => {
    rowsByTable.artist_follow = [];
    await expect(isFollowingArtist("u1", "a1")).resolves.toBe(false);
  });
});

describe("listFollowedArtists", () => {
  it("mapea el join y calcula hasNext", async () => {
    rowsByTable.artist_follow = [
      { id: "a1", name: "Radiohead", type: "group", photoUrl: null },
      { id: "a2", name: "Björk", type: "person", photoUrl: "p" },
    ];
    const result = await listFollowedArtists("u1", 1, 2);
    expect(result.artists).toHaveLength(2);
    expect(result.hasNext).toBe(false);
  });

  it("rechaza paginación inválida", async () => {
    await expect(listFollowedArtists("u1", 0)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});

describe("countFollowedArtists", () => {
  it("devuelve el conteo", async () => {
    rowsByTable.artist_follow = [{ n: 7 }];
    await expect(countFollowedArtists("u1")).resolves.toBe(7);
  });
});

describe("followedArtistIdsWithin", () => {
  it("set vacío sin ids", async () => {
    await expect(followedArtistIdsWithin("u1", [])).resolves.toEqual(new Set());
  });
  it("devuelve el subconjunto seguido", async () => {
    rowsByTable.artist_follow = [{ artistId: "a1" }, { artistId: "a3" }];
    const set = await followedArtistIdsWithin("u1", ["a1", "a2", "a3"]);
    expect([...set].sort()).toEqual(["a1", "a3"]);
  });
});
