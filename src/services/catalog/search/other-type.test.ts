// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ searchAlbums: vi.fn(), searchSongs: vi.fn(), searchArtists: vi.fn() }));
vi.mock("./albums", () => ({ searchAlbums: mocks.searchAlbums }));
vi.mock("./artists", () => ({ searchArtists: mocks.searchArtists }));
vi.mock("./songs", () => ({ searchSongs: mocks.searchSongs }));

const { findInAllOtherTypes, findInOtherType, otherTypeOf } = await import("./other-type");

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

describe("findInAllOtherTypes (redesign-search-phase3)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("busca en local en los otros tipos de catálogo y devuelve solo los que tienen algo", async () => {
    mocks.searchArtists.mockResolvedValue({ results: [] });
    mocks.searchSongs.mockResolvedValue({ results: [{ key: "k", title: "Kid A Mnesia" }] });
    const found = await findInAllOtherTypes("album", "kid a mnesia");
    expect(mocks.searchArtists).toHaveBeenCalledWith("kid a mnesia", { localOnly: true });
    expect(mocks.searchSongs).toHaveBeenCalledWith("kid a mnesia", { localOnly: true });
    expect(mocks.searchAlbums).not.toHaveBeenCalled();
    expect(found.map((m) => m.type)).toEqual(["song"]);
  });

  it("un tipo que falla no tumba a los demás", async () => {
    mocks.searchArtists.mockRejectedValue(new Error("db"));
    mocks.searchAlbums.mockResolvedValue({ results: [{ id: "a", title: "Creep" }] });
    const found = await findInAllOtherTypes("song", "creep");
    expect(found.map((m) => m.type)).toEqual(["album"]);
  });
});
