import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ArtistRow, ReleaseGroupRow } from "@/db/schema";
import { artist, credit, release, releaseGroup } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import { searchCatalog } from "./search-catalog";
import type {
  MBReleaseGroupSearchResponse,
  MBArtistSearchResponse,
} from "../musicbrainz/types";

vi.mock("@/db", () => ({ db: { select: vi.fn() } }));

vi.mock("@/services/musicbrainz/client", () => ({
  musicbrainz: {
    searchArtist: vi.fn(),
    searchReleaseGroup: vi.fn(),
    browseReleaseGroupsByArtist: vi.fn(),
    getReleaseGroup: vi.fn(),
    getArtist: vi.fn(),
  },
}));

vi.mock("./ingest-artist", () => ({ upsertArtistStubsFromSearch: vi.fn() }));
vi.mock("./ingest-release-group", () => ({ upsertReleaseGroupStubs: vi.fn() }));

const { db } = await import("@/db");
const { musicbrainz } = await import("@/services/musicbrainz/client");
const { upsertArtistStubsFromSearch } = await import("./ingest-artist");
const { upsertReleaseGroupStubs } = await import("./ingest-release-group");

function makeArtistRow(overrides: Partial<ArtistRow> = {}): ArtistRow {
  return {
    id: `artist-${overrides.mbid ?? "x"}`,
    mbid: "mbid-x",
    type: "group",
    name: "X",
    bio: null,
    photoUrl: null,
    createdAt: new Date("2026-01-01"),
    discographySyncedAt: null,
    membershipsSyncedAt: null,
    ...overrides,
  };
}

function makeAlbumRow(overrides: Partial<ReleaseGroupRow> = {}): ReleaseGroupRow {
  return {
    id: `album-${overrides.mbid ?? "x"}`,
    mbid: "mbid-x",
    title: "X",
    category: "studio",
    coverThumbUrl: null,
    createdAt: new Date("2026-01-01"),
    ...overrides,
  };
}

/** Filas devueltas por cada select según la tabla en `from(...)`. */
interface DbFixture {
  artists?: ArtistRow[];
  albums?: ReleaseGroupRow[];
  releaseRows?: { releaseGroupId: string }[];
  creditRows?: { releaseGroupId: string; name: string }[];
}

function mockDb(fixture: DbFixture) {
  vi.mocked(db.select).mockImplementation(() => {
    const result = (rows: unknown[]) => ({
      limit: vi.fn(async () => rows),
      then: (resolve: (value: unknown[]) => unknown) => resolve(rows),
    });
    return {
      from: vi.fn((table: unknown) => {
        if (table === credit) {
          return { innerJoin: vi.fn(() => ({ where: vi.fn(async () => fixture.creditRows ?? []) })) };
        }
        const rows =
          table === artist ? fixture.artists ?? []
          : table === releaseGroup ? fixture.albums ?? []
          : table === release ? fixture.releaseRows ?? []
          : [];
        return { where: vi.fn(() => result(rows)) };
      }),
    } as never;
  });
}

function mockUpserts(
  artistRows: ArtistRow[],
  albumRows: ReleaseGroupRow[],
) {
  vi.mocked(upsertArtistStubsFromSearch).mockResolvedValue(artistRows);
  vi.mocked(upsertReleaseGroupStubs).mockResolvedValue(albumRows);
}

const mbArtist = (id: string, name: string, extra: Record<string, unknown> = {}) => ({
  id,
  name,
  type: "Group",
  disambiguation: undefined,
  score: 100,
  ...extra,
});

function mbArtists(artists: unknown[]): MBArtistSearchResponse {
  return { artists: artists as never };
}

function mbAlbums(groups: unknown[]): MBReleaseGroupSearchResponse {
  return { "release-groups": groups as never };
}

describe("searchCatalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(upsertArtistStubsFromSearch).mockResolvedValue([]);
    vi.mocked(upsertReleaseGroupStubs).mockResolvedValue([]);
  });

  it("fusiona locales y de MusicBrainz, deduplicados por mbid", async () => {
    mockDb({ artists: [makeArtistRow({ id: "local-a", mbid: "mbid-a", name: "Poison" })] });
    vi.mocked(musicbrainz.searchArtist).mockResolvedValue(
      mbArtists([mbArtist("mbid-a", "Poison"), mbArtist("mbid-b", "Poison", { disambiguation: "thrash metal band" })]),
    );
    vi.mocked(musicbrainz.searchReleaseGroup).mockResolvedValue(mbAlbums([]));
    mockUpserts([makeArtistRow({ id: "stub-b", mbid: "mbid-b", name: "Poison", type: "group" })], []);

    const results = await searchCatalog("Poison");

    const artistResults = results.filter((r) => r.kind === "artist");
    expect(artistResults.map((r) => r.mbid)).toEqual(["mbid-a", "mbid-b"]);
    expect(artistResults[1]).toMatchObject({ id: "stub-b", subtitle: "thrash metal band" });
    // Solo se persiste el candidato nuevo, no el que ya estaba local.
    expect(upsertArtistStubsFromSearch).toHaveBeenCalledWith([
      { mbid: "mbid-b", name: "Poison", mbType: "Group", disambiguation: "thrash metal band" },
    ]);
  });

  it("hace como máximo una request a MusicBrainz por tipo y no ingiere discografía", async () => {
    mockDb({});
    vi.mocked(musicbrainz.searchArtist).mockResolvedValue(mbArtists([]));
    vi.mocked(musicbrainz.searchReleaseGroup).mockResolvedValue(mbAlbums([]));

    await searchCatalog("nada");

    expect(musicbrainz.searchArtist).toHaveBeenCalledTimes(1);
    expect(musicbrainz.searchReleaseGroup).toHaveBeenCalledTimes(1);
    expect(musicbrainz.browseReleaseGroupsByArtist).not.toHaveBeenCalled();
    expect(musicbrainz.getReleaseGroup).not.toHaveBeenCalled();
    expect(musicbrainz.getArtist).not.toHaveBeenCalled();
  });

  it("ordena cacheados → resto locales → solo-MusicBrainz, con la exacta al tope de su grupo", async () => {
    mockDb({
      artists: [
        makeArtistRow({ id: "cached", mbid: "mbid-cached", name: "Poison Idea", discographySyncedAt: new Date() }),
        makeArtistRow({ id: "plain", mbid: "mbid-plain", name: "Poison the Well" }),
      ],
    });
    vi.mocked(musicbrainz.searchArtist).mockResolvedValue(
      mbArtists([
        mbArtist("mbid-exact", "Poison"),
        mbArtist("mbid-new", "Lady Poison"),
      ]),
    );
    vi.mocked(musicbrainz.searchReleaseGroup).mockResolvedValue(mbAlbums([]));
    mockUpserts(
      [
        makeArtistRow({ id: "exact", mbid: "mbid-exact", name: "Poison" }),
        makeArtistRow({ id: "new", mbid: "mbid-new", name: "Lady Poison" }),
      ],
      [],
    );

    const results = await searchCatalog("Poison");
    expect(results.map((r) => r.id)).toEqual(["cached", "plain", "exact", "new"]);
    expect(results.map((r) => r.cached)).toEqual([true, false, false, false]);
  });

  it("incluye álbumes con año parcial y artista principal desde MusicBrainz", async () => {
    mockDb({});
    vi.mocked(musicbrainz.searchArtist).mockResolvedValue(mbArtists([]));
    vi.mocked(musicbrainz.searchReleaseGroup).mockResolvedValue(
      mbAlbums([
        {
          id: "rg-mbid",
          title: "Toxicity",
          "primary-type": "Album",
          "first-release-date": "2001-09-18",
          "artist-credit": [
            { name: "System of a Down", joinphrase: "", artist: { id: "soad", name: "System of a Down" } },
          ],
          score: 100,
        },
        { id: "rg-year", title: "Alive", "primary-type": "Album", "first-release-date": "1985" },
      ]),
    );
    mockUpserts([], [
      makeAlbumRow({ id: "stub-1", mbid: "rg-mbid", title: "Toxicity" }),
      makeAlbumRow({ id: "stub-2", mbid: "rg-year", title: "Alive" }),
    ]);

    const results = await searchCatalog("Alive OR Toxicity");
    const albums = results.filter((r) => r.kind === "release-group");
    expect(albums[0]).toMatchObject({ year: 2001, subtitle: "System of a Down", category: "studio" });
    expect(albums[1]).toMatchObject({ year: 1985, subtitle: null });
  });

  it("marca cached un álbum local ya ingerido y usa su crédito primario como subtítulo", async () => {
    mockDb({
      albums: [makeAlbumRow({ id: "a1", mbid: "mbid-album", title: "Poison" })],
      releaseRows: [{ releaseGroupId: "a1" }],
      creditRows: [{ releaseGroupId: "a1", name: "Alice Cooper" }],
    });
    vi.mocked(musicbrainz.searchArtist).mockResolvedValue(mbArtists([]));
    vi.mocked(musicbrainz.searchReleaseGroup).mockResolvedValue(mbAlbums([]));

    const results = await searchCatalog("Poison");

    expect(results).toEqual([
      expect.objectContaining({
        kind: "release-group",
        id: "a1",
        subtitle: "Alice Cooper",
        cached: true,
      }),
    ]);
  });

  it("sin coincidencias en ninguna fuente devuelve lista vacía", async () => {
    mockDb({});
    vi.mocked(musicbrainz.searchArtist).mockResolvedValue(mbArtists([]));
    vi.mocked(musicbrainz.searchReleaseGroup).mockResolvedValue(mbAlbums([]));

    await expect(searchCatalog("zzzz-inexistente")).resolves.toEqual([]);
  });

  it("degrada a resultados locales si MusicBrainz falla", async () => {
    mockDb({ artists: [makeArtistRow({ id: "local-a", mbid: "mbid-a", name: "Poison" })] });
    vi.mocked(musicbrainz.searchArtist).mockRejectedValue(new Error("MusicBrainz caído"));
    vi.mocked(musicbrainz.searchReleaseGroup).mockRejectedValue(new Error("MusicBrainz caído"));

    const results = await searchCatalog("Poison");

    expect(results).toEqual([
      expect.objectContaining({ kind: "artist", id: "local-a", cached: false }),
    ]);
  });

  it("lanza INTERNAL_ERROR si MusicBrainz falla y no hay coincidencias locales", async () => {
    mockDb({});
    vi.mocked(musicbrainz.searchArtist).mockRejectedValue(new Error("MusicBrainz caído"));
    vi.mocked(musicbrainz.searchReleaseGroup).mockRejectedValue(new Error("MusicBrainz caído"));

    await expect(searchCatalog("Poison")).rejects.toBeInstanceOf(ApiError);
    await expect(searchCatalog("Poison")).rejects.toMatchObject({
      code: "INTERNAL_ERROR",
      status: 502,
    });
  });

  it("conserva coincidencias de un tipo aunque el otro tipo falle en MusicBrainz", async () => {
    mockDb({});
    vi.mocked(musicbrainz.searchArtist).mockRejectedValue(new Error("timeout"));
    vi.mocked(musicbrainz.searchReleaseGroup).mockResolvedValue(
      mbAlbums([{ id: "rg-1", title: "Poison EP", "primary-type": "EP", score: 90 }]),
    );
    mockUpserts([], [makeAlbumRow({ id: "stub-rg1", mbid: "rg-1", title: "Poison EP", category: "single_ep" })]);

    const results = await searchCatalog("Poison");

    expect(results).toEqual([
      expect.objectContaining({ kind: "release-group", id: "stub-rg1", category: "single_ep" }),
    ]);
  });
});
