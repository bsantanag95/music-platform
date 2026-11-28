// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ searchAlbums: vi.fn(), searchSongs: vi.fn() }));
vi.mock("./albums", () => ({ searchAlbums: mocks.searchAlbums }));
vi.mock("./songs", () => ({ searchSongs: mocks.searchSongs }));

const { findInOtherType, otherTypeOf } = await import("./other-type");

const album = (id: string) => ({ kind: "release-group", id, title: "Pink", artistName: "Four Tet" });

describe("findInOtherType (redesign-search-phase2)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("mapea Artistas y Canciones → álbumes, Álbumes → canciones y Usuarios → nada", () => {
    expect([otherTypeOf("artist"), otherTypeOf("song"), otherTypeOf("album"), otherTypeOf("user")]).toEqual([
      "album",
      "album",
      "song",
      null,
    ]);
  });

  it("solo busca en la base propia y toma 3", async () => {
    mocks.searchAlbums.mockResolvedValue({ results: [album("a"), album("b"), album("c"), album("d")] });
    const matches = await findInOtherType("artist", "pink");
    expect(mocks.searchAlbums).toHaveBeenCalledWith("pink", { localOnly: true });
    expect(matches?.type).toBe("album");
    expect(matches?.rows.map((row) => ("id" in row ? row.id : row.key))).toEqual(["a", "b", "c"]);
  });

  it("Álbumes se asoma a canciones, también solo en local", async () => {
    mocks.searchSongs.mockResolvedValue({ results: [{ key: "k", title: "The Wall" }] });
    await findInOtherType("album", "the wall");
    expect(mocks.searchSongs).toHaveBeenCalledWith("the wall", { localOnly: true });
  });

  it("sin coincidencias, con error o en Usuarios: null", async () => {
    mocks.searchAlbums.mockResolvedValueOnce({ results: [] }).mockRejectedValueOnce(new Error("db"));
    await expect(findInOtherType("song", "qzxvbnmqk")).resolves.toBeNull();
    await expect(findInOtherType("song", "creep")).resolves.toBeNull();
    await expect(findInOtherType("user", "ana")).resolves.toBeNull();
  });
});
