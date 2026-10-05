import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock("./artists", () => ({ listGenreArtists: mocks.list }));

const { getGenreDiscoverArtists, getGenreDiscoverCompletionCandidates } = await import("./artist-discovery");

const artists = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `a${i}`, name: `Artista ${i}` }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.list.mockResolvedValue({ artists: artists(8), hasNext: true });
});

describe("getGenreDiscoverArtists", () => {
  it("pide discografía corta con debut conocido, sin conocidos, en el orden descubrir y con tope de 8", async () => {
    await getGenreDiscoverArtists("g-1", "reader-1");
    expect(mocks.list).toHaveBeenCalledWith("g-1", {
      pageSize: 8,
      sort: "discover",
      shortOnly: true,
      debutKnownOnly: true,
      hideKnown: true,
      readerId: "reader-1",
    });
  });

  it("un anónimo usa las mismas reglas con lector nulo (sin exclusión: lo decide el servicio de artistas)", async () => {
    await getGenreDiscoverArtists("g-1", null);
    expect(mocks.list).toHaveBeenCalledWith("g-1", expect.objectContaining({ readerId: null, hideKnown: true }));
  });

  it("devuelve los artistas al alcanzar 4 elegibles", async () => {
    mocks.list.mockResolvedValue({ artists: artists(4), hasNext: false });
    await expect(getGenreDiscoverArtists("g-1", null)).resolves.toHaveLength(4);
  });

  it("con 3 elegibles no es un riel: devuelve vacío", async () => {
    mocks.list.mockResolvedValue({ artists: artists(3), hasNext: false });
    await expect(getGenreDiscoverArtists("g-1", null)).resolves.toEqual([]);
    mocks.list.mockResolvedValue({ artists: [], hasNext: false });
    await expect(getGenreDiscoverArtists("g-1", null)).resolves.toEqual([]);
  });
});

describe("getGenreDiscoverCompletionCandidates", () => {
  it("pide los 3 artistas del género sin explorar con más álbumes del género", async () => {
    mocks.list.mockResolvedValue({ artists: artists(3), hasNext: true });
    await expect(getGenreDiscoverCompletionCandidates("g-1")).resolves.toHaveLength(3);
    expect(mocks.list).toHaveBeenCalledWith("g-1", { pageSize: 3, sort: "albums", unexploredOnly: true });
  });
});
