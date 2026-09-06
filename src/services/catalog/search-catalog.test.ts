import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ArtistRow, RecordingRow, ReleaseGroupRow } from "@/db/schema";
import { artist, credit, recording, release, releaseGroup } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import { searchCatalog } from "./search-catalog";
import type {
  MBReleaseGroupSearchResponse,
  MBArtistSearchResponse,
} from "../musicbrainz/types";
import type { SongContextAlbum } from "./ingest-recording";

vi.mock("@/db", () => ({ db: { select: vi.fn() } }));

vi.mock("@/services/musicbrainz/client", () => ({
  musicbrainz: {
    searchArtist: vi.fn(),
    searchReleaseGroup: vi.fn(),
    searchRecording: vi.fn(),
    browseReleaseGroupsByArtist: vi.fn(),
    browseReleasesByRecording: vi.fn(),
    getReleaseGroup: vi.fn(),
    getArtist: vi.fn(),
  },
}));

vi.mock("./ingest-artist", () => ({ upsertArtistStubsFromSearch: vi.fn() }));
vi.mock("./ingest-release-group", () => ({ upsertReleaseGroupStubs: vi.fn() }));
vi.mock("./ingest-recording", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./ingest-recording")>();
  return {
    ...actual,
    findOrIngestRecording: vi.fn(),
    albumsFromMbReleases: vi.fn(),
    localAppearanceAlbums: vi.fn(),
    localRecordingArtistName: vi.fn(),
  };
});

const { db } = await import("@/db");
const { musicbrainz } = await import("@/services/musicbrainz/client");
const { upsertArtistStubsFromSearch } = await import("./ingest-artist");
const { upsertReleaseGroupStubs } = await import("./ingest-release-group");
const ingestRecording = await import("./ingest-recording");

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

function makeRecordingRow(overrides: Partial<RecordingRow> = {}): RecordingRow {
  return {
    id: `rec-${overrides.mbid ?? "x"}`,
    mbid: "mbid-x",
    title: "X",
    durationSec: null,
    variantType: "original",
    variantOfId: null,
    ...overrides,
  };
}

/** Filas devueltas por cada select según la tabla en `from(...)`. */
interface DbFixture {
  artists?: ArtistRow[];
  albums?: ReleaseGroupRow[];
  recordings?: RecordingRow[];
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
          : table === recording ? fixture.recordings ?? []
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

function songAlbum(overrides: Partial<SongContextAlbum> = {}): SongContextAlbum {
  return {
    releaseGroupId: "rg-1",
    mbid: "rg-mbid-1",
    title: "Led Zeppelin IV",
    category: "studio",
    year: 1971,
    ...overrides,
  };
}

const mbRecordingSearch = (recordings: unknown[]) => ({ recordings } as never);

describe("searchCatalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(upsertArtistStubsFromSearch).mockResolvedValue([]);
    vi.mocked(upsertReleaseGroupStubs).mockResolvedValue([]);
    vi.mocked(musicbrainz.searchArtist).mockResolvedValue(mbArtists([]));
    vi.mocked(musicbrainz.searchReleaseGroup).mockResolvedValue(mbAlbums([]));
    vi.mocked(musicbrainz.searchRecording).mockResolvedValue(mbRecordingSearch([]));
    vi.mocked(musicbrainz.browseReleasesByRecording).mockResolvedValue({
      releases: [],
      "release-count": 0,
    } as never);
    vi.mocked(ingestRecording.findOrIngestRecording).mockResolvedValue(
      makeRecordingRow({ id: "rec-new", mbid: "rec-mbid", title: "Stairway to Heaven" }),
    );
    vi.mocked(ingestRecording.albumsFromMbReleases).mockResolvedValue([]);
    vi.mocked(ingestRecording.localAppearanceAlbums).mockResolvedValue([]);
    vi.mocked(ingestRecording.localRecordingArtistName).mockResolvedValue(null);
  });

  it("fusiona locales y de MusicBrainz, deduplicados por mbid", async () => {
    mockDb({ artists: [makeArtistRow({ id: "local-a", mbid: "mbid-a", name: "Poison" })] });
    vi.mocked(musicbrainz.searchArtist).mockResolvedValue(
      mbArtists([mbArtist("mbid-a", "Poison"), mbArtist("mbid-b", "Poison", { disambiguation: "thrash metal band" })]),
    );
    vi.mocked(musicbrainz.searchReleaseGroup).mockResolvedValue(mbAlbums([]));
    mockUpserts([makeArtistRow({ id: "stub-b", mbid: "mbid-b", name: "Poison", type: "group" })], []);

    const { results } = await searchCatalog("Poison");

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
    expect(musicbrainz.searchRecording).toHaveBeenCalledTimes(1);
    expect(musicbrainz.browseReleaseGroupsByArtist).not.toHaveBeenCalled();
    expect(musicbrainz.browseReleasesByRecording).not.toHaveBeenCalled();
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

    const { results } = await searchCatalog("Poison");
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

    const { results } = await searchCatalog("Alive OR Toxicity");
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

    const { results } = await searchCatalog("Poison");

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

    await expect(searchCatalog("zzzz-inexistente")).resolves.toEqual({ results: [] });
  });

  it("degrada a resultados locales si MusicBrainz falla", async () => {
    mockDb({ artists: [makeArtistRow({ id: "local-a", mbid: "mbid-a", name: "Poison" })] });
    vi.mocked(musicbrainz.searchArtist).mockRejectedValue(new Error("MusicBrainz caído"));
    vi.mocked(musicbrainz.searchReleaseGroup).mockRejectedValue(new Error("MusicBrainz caído"));

    const { results } = await searchCatalog("Poison");

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

    const { results } = await searchCatalog("Poison");

    expect(results).toEqual([
      expect.objectContaining({ kind: "release-group", id: "stub-rg1", category: "single_ep" }),
    ]);
  });

  describe("songContext (artista + canción)", () => {
    it("resuelve una canción en frío: top-1 relevante + browse + ingesta, con álbumes ordenados", async () => {
      mockDb({});
      vi.mocked(musicbrainz.searchArtist).mockResolvedValue(mbArtists([]));
      vi.mocked(musicbrainz.searchReleaseGroup).mockResolvedValue(mbAlbums([]));
      vi.mocked(musicbrainz.searchRecording).mockResolvedValue(
        mbRecordingSearch([
          {
            id: "rec-mbid",
            title: "Stairway to Heaven",
            length: 482000,
            "artist-credit": [
              { name: "Led Zeppelin", joinphrase: "", artist: { id: "led-mbid", name: "Led Zeppelin" } },
            ],
            score: 100,
          },
        ]),
      );
      vi.mocked(musicbrainz.browseReleasesByRecording).mockResolvedValue({ releases: [], "release-count": 30 } as never);
      vi.mocked(ingestRecording.albumsFromMbReleases).mockResolvedValue([
        songAlbum({ releaseGroupId: "rg-comp", mbid: "rg-mbid-comp", title: "Early Songs", category: "compilation", year: 1987 }),
        songAlbum({ releaseGroupId: "rg-studio", mbid: "rg-mbid-studio", title: "Led Zeppelin IV", category: "studio", year: 1971 }),
      ]);

      const response = await searchCatalog("led zeppelin stairway to heaven");

      expect(musicbrainz.browseReleasesByRecording).toHaveBeenCalledWith("rec-mbid");
      expect(ingestRecording.findOrIngestRecording).toHaveBeenCalledWith({
        mbid: "rec-mbid",
        title: "Stairway to Heaven",
        durationSec: 482,
        credits: [
          { name: "Led Zeppelin", joinphrase: "", artist: { id: "led-mbid", name: "Led Zeppelin" } },
        ],
      });
      expect(response.songContext).toMatchObject({
        recordingId: "rec-new",
        mbid: "rec-mbid",
        title: "Stairway to Heaven",
      });
      // D5: estudio antes que compilación, con año.
      expect(response.songContext?.albums.map((a) => a.id)).toEqual(["rg-studio", "rg-comp"]);
      expect(response.songContext?.albums[0]).toMatchObject({ year: 1971, category: "studio" });
    });

    it("las apariciones locales sirven la sección aunque MusicBrainz no aporte candidatos (degradación explícita)", async () => {
      mockDb({
        recordings: [makeRecordingRow({ id: "rec-local", mbid: "rec-mbid", title: "Stairway to Heaven" })],
      });
      vi.mocked(musicbrainz.searchArtist).mockResolvedValue(mbArtists([]));
      vi.mocked(musicbrainz.searchReleaseGroup).mockResolvedValue(mbAlbums([]));
      vi.mocked(ingestRecording.localAppearanceAlbums).mockResolvedValue([songAlbum()]);
      vi.mocked(ingestRecording.localRecordingArtistName).mockResolvedValue("Led Zeppelin");

      const response = await searchCatalog("stairway to heaven");

      // La pata recordings corre SIEMPRE (ahora es una fuente de unión más),
      // pero sin candidatos la sección queda servida por local: no encoge, se
      // degrada explícitamente.
      expect(musicbrainz.searchRecording).toHaveBeenCalledTimes(1);
      expect(ingestRecording.localAppearanceAlbums).toHaveBeenCalledWith("rec-local");
      expect(response.songContext).toEqual({
        recordingId: "rec-local",
        mbid: "rec-mbid",
        title: "Stairway to Heaven",
        artistName: "Led Zeppelin",
        albums: [
          { id: "rg-1", mbid: "rg-mbid-1", title: "Led Zeppelin IV", category: "studio", year: 1971 },
        ],
      });
    });

    it("fusiona apariciones locales y de MusicBrainz; la identidad es la de más release-count", async () => {
      // La misma grabación existe localmente (tracklist parcial: solo IV) y la
      // encuentra también la pata fría (aparece además en una compilación que
      // local no conoce porque su tracklist no fue ingerido). mockDb no filtra
      // predicados: ambas lecturas comparten mbid para que sea coherente.
      mockDb({
        recordings: [makeRecordingRow({ id: "rec-local", mbid: "rec-cold", title: "Stairway to Heaven" })],
      });
      vi.mocked(musicbrainz.searchArtist).mockResolvedValue(mbArtists([]));
      vi.mocked(musicbrainz.searchReleaseGroup).mockResolvedValue(mbAlbums([]));
      vi.mocked(ingestRecording.localAppearanceAlbums).mockResolvedValue([songAlbum()]);
      vi.mocked(ingestRecording.localRecordingArtistName).mockResolvedValue("Led Zeppelin");
      vi.mocked(musicbrainz.searchRecording).mockResolvedValue(
        mbRecordingSearch([{ id: "rec-cold", title: "Stairway to Heaven", score: 100 }]),
      );
      vi.mocked(musicbrainz.browseReleasesByRecording).mockResolvedValue({
        releases: [],
        "release-count": 40,
      } as never);
      vi.mocked(ingestRecording.albumsFromMbReleases).mockResolvedValue([
        songAlbum({ releaseGroupId: "rg-comp", mbid: "rg-mbid-comp", title: "Early Songs", category: "compilation", year: 1987 }),
      ]);

      const response = await searchCatalog("stairway to heaven");

      // Unión: IV (local) + Early Songs (cold); identidad: la contribución de
      // 40 apariciones; sin ingesta (la grabación ya era local).
      expect(response.songContext?.recordingId).toBe("rec-local");
      expect(ingestRecording.findOrIngestRecording).not.toHaveBeenCalled();
      expect(response.songContext?.albums.map((a) => a.id)).toEqual(["rg-1", "rg-comp"]);
    });

    it("rechaza el top-1 si su título no guarda relación de contención con la consulta", async () => {
      mockDb({});
      vi.mocked(musicbrainz.searchArtist).mockResolvedValue(mbArtists([]));
      vi.mocked(musicbrainz.searchReleaseGroup).mockResolvedValue(mbAlbums([]));
      vi.mocked(musicbrainz.searchRecording).mockResolvedValue(
        mbRecordingSearch([{ id: "rec-x", title: "Love Hurts", score: 100 }]),
      );

      const response = await searchCatalog("nada que ver");

      expect(response.songContext).toBeUndefined();
      expect(musicbrainz.browseReleasesByRecording).not.toHaveBeenCalled();
      expect(ingestRecording.findOrIngestRecording).not.toHaveBeenCalled();
    });

    it("un fallo de la pata de recordings no afecta results ni convierte la búsqueda en error", async () => {
      mockDb({});
      vi.mocked(musicbrainz.searchArtist).mockResolvedValue(mbArtists([mbArtist("mbid-a", "Poison")]));
      vi.mocked(musicbrainz.searchReleaseGroup).mockResolvedValue(mbAlbums([]));
      vi.mocked(musicbrainz.searchRecording).mockRejectedValue(new Error("MusicBrainz caído"));
      mockUpserts([makeArtistRow({ id: "a", mbid: "mbid-a", name: "Poison" })], []);

      const response = await searchCatalog("Poison");

      expect(response.results.length).toBeGreaterThan(0);
      expect(response.songContext).toBeUndefined();
    });

    it("excluye del contexto los álbumes que ya figuran en results (D5)", async () => {
      mockDb({});
      vi.mocked(musicbrainz.searchArtist).mockResolvedValue(mbArtists([]));
      vi.mocked(musicbrainz.searchReleaseGroup).mockResolvedValue(
        mbAlbums([{ id: "rg-mbid-1", title: "Stairway to Heaven", "primary-type": "Single", score: 100 }]),
      );
      mockUpserts([], [makeAlbumRow({ id: "album-rg1", mbid: "rg-mbid-1", title: "Stairway to Heaven", category: "single_ep" })]);
      vi.mocked(musicbrainz.searchRecording).mockResolvedValue(
        mbRecordingSearch([{ id: "rec-mbid", title: "Stairway to Heaven", score: 100 }]),
      );
      vi.mocked(musicbrainz.browseReleasesByRecording).mockResolvedValue({ releases: [], "release-count": 30 } as never);
      vi.mocked(ingestRecording.albumsFromMbReleases).mockResolvedValue([
        songAlbum({ releaseGroupId: "album-rg1", mbid: "rg-mbid-1" }),
        songAlbum({ releaseGroupId: "rg-other", mbid: "rg-mbid-other", title: "Led Zeppelin IV", category: "studio" }),
      ]);

      const response = await searchCatalog("stairway to heaven");

      expect(response.results.some((r) => r.id === "album-rg1")).toBe(true);
      expect(response.songContext?.albums.map((a) => a.id)).toEqual(["rg-other"]);
    });

    it("con artista reconocido en la consulta, busca la grabación con consulta estructurada", async () => {
      mockDb({
        artists: [makeArtistRow({ id: "artist-sc", mbid: "sc-mbid", name: "Sabrina Carpenter" })],
      });
      vi.mocked(musicbrainz.searchRecording).mockResolvedValue(
        mbRecordingSearch([
          {
            id: "rec-taste",
            title: "Taste",
            "artist-credit": [
              { name: "Sabrina Carpenter", joinphrase: "", artist: { id: "sc-mbid", name: "Sabrina Carpenter" } },
            ],
            score: 100,
          },
        ]),
      );
      vi.mocked(musicbrainz.browseReleasesByRecording).mockResolvedValue({
        releases: [],
        "release-count": 40,
      } as never);
      vi.mocked(ingestRecording.albumsFromMbReleases).mockResolvedValue([songAlbum()]);
      vi.mocked(ingestRecording.findOrIngestRecording).mockResolvedValue(
        makeRecordingRow({ id: "rec-taste-local", mbid: "rec-taste", title: "Taste" }),
      );

      const response = await searchCatalog("Sabrina Carpenter taste");

      // El hint convierte "artista + canción" en query acotada a los álbumes
      // propios del artista; sin discografía local ni browse, degrada a nombre.
      expect(musicbrainz.searchRecording).toHaveBeenCalledWith(
        '"taste" AND artist:"sabrina carpenter"',
      );
      expect(response.songContext).toMatchObject({ recordingId: "rec-taste-local", title: "Taste" });
    });

    it("con discografía local del artista, acota la búsqueda de recordings por rgid", async () => {
      mockDb({
        artists: [makeArtistRow({ id: "artist-sc", mbid: "sc-mbid", name: "Sabrina Carpenter" })],
        creditRows: [
          { mbid: "rg-mbid-1", category: "studio" },
          { mbid: "rg-mbid-2", category: "studio" },
        ] as never,
      });
      vi.mocked(musicbrainz.searchRecording).mockResolvedValue(mbRecordingSearch([]));

      await searchCatalog("Sabrina Carpenter taste");

      // mbids de release_group ya ingeridos: sin browse de discografía.
      expect(musicbrainz.searchRecording).toHaveBeenCalledWith(
        '"taste" AND (rgid:rg-mbid-1 OR rgid:rg-mbid-2)',
      );
      expect(musicbrainz.browseReleaseGroupsByArtist).not.toHaveBeenCalled();
    });

    it("sin discografía local pero con mbid de artista, usa el browse de release-groups", async () => {
      mockDb({
        artists: [makeArtistRow({ id: "artist-lz", mbid: "lz-mbid", name: "Led Zeppelin" })],
      });
      vi.mocked(musicbrainz.browseReleaseGroupsByArtist).mockResolvedValue({
        "release-groups": [
          { id: "rg-iv-mbid", title: "IV", "primary-type": "Album" },
          { id: "rg-bootleg-mbid", title: "B", "primary-type": "Album", "secondary-types": ["Live"] },
        ],
      } as never);
      vi.mocked(musicbrainz.searchRecording).mockResolvedValue(mbRecordingSearch([]));

      await searchCatalog("led zeppelin stairway to heaven");

      expect(musicbrainz.browseReleaseGroupsByArtist).toHaveBeenCalledWith("lz-mbid");
      // Orden por categoría: el álbum de estudio antes que el live.
      expect(musicbrainz.searchRecording).toHaveBeenCalledWith(
        '"stairway to heaven" AND (rgid:rg-iv-mbid OR rgid:rg-bootleg-mbid)',
      );
    });

    it("no corta ante 18 apariciones live: la de estudio (195) gana el clúster", async () => {
      mockDb({});
      const credit = [
        { name: "Led Zeppelin", joinphrase: "", artist: { id: "lz-mbid", name: "Led Zeppelin" } },
      ];
      vi.mocked(musicbrainz.searchRecording).mockResolvedValue(
        mbRecordingSearch([
          { id: "rec-live", title: "Stairway to Heaven", "artist-credit": credit, score: 100 },
          { id: "rec-studio", title: "Stairway to Heaven", "artist-credit": credit, score: 100 },
        ]),
      );
      vi.mocked(musicbrainz.browseReleasesByRecording)
        .mockResolvedValueOnce({ releases: [], "release-count": 18 } as never)
        .mockResolvedValueOnce({ releases: [], "release-count": 195 } as never);
      vi.mocked(ingestRecording.albumsFromMbReleases).mockResolvedValue([songAlbum()]);
      vi.mocked(ingestRecording.findOrIngestRecording).mockResolvedValue(
        makeRecordingRow({ id: "rec-studio-local", mbid: "rec-studio", title: "Stairway to Heaven" }),
      );

      const response = await searchCatalog("stairway to heaven");

      expect(vi.mocked(musicbrainz.browseReleasesByRecording).mock.calls).toEqual([
        ["rec-live"],
        ["rec-studio"],
      ]);
      expect(ingestRecording.findOrIngestRecording).toHaveBeenCalledWith(
        expect.objectContaining({ mbid: "rec-studio" }),
      );
      expect(response.songContext?.recordingId).toBe("rec-studio-local");
    });

    it("rechaza títulos inflados con basura entre paréntesis (bootlegs) y sigue con el siguiente candidato", async () => {
      mockDb({});
      vi.mocked(musicbrainz.searchRecording).mockResolvedValue(
        mbRecordingSearch([
          { id: "rec-bootleg", title: "sabrina carpenter - taste (dudda bootleg)", score: 100 },
          {
            id: "rec-taste",
            title: "Taste",
            "artist-credit": [
              { name: "Sabrina Carpenter", joinphrase: "", artist: { id: "sc-mbid", name: "Sabrina Carpenter" } },
            ],
            score: 90,
          },
        ]),
      );
      vi.mocked(musicbrainz.browseReleasesByRecording).mockResolvedValue({
        releases: [],
        "release-count": 5,
      } as never);
      vi.mocked(ingestRecording.albumsFromMbReleases).mockResolvedValue([songAlbum()]);
      vi.mocked(ingestRecording.findOrIngestRecording).mockResolvedValue(
        makeRecordingRow({ id: "rec-taste-local", mbid: "rec-taste", title: "Taste" }),
      );

      const response = await searchCatalog("taste");

      expect(musicbrainz.browseReleasesByRecording).toHaveBeenCalledTimes(1);
      expect(musicbrainz.browseReleasesByRecording).toHaveBeenCalledWith("rec-taste");
      expect(response.songContext?.title).toBe("Taste");
    });

    it("une el clúster de duplicados: se browséan todos y la identidad es la de más release-count", async () => {
      mockDb({});
      const credit = [
        { name: "Sabrina Carpenter", joinphrase: "", artist: { id: "sc-mbid", name: "Sabrina Carpenter" } },
      ];
      vi.mocked(musicbrainz.searchRecording).mockResolvedValue(
        mbRecordingSearch([
          { id: "rec-d1", title: "Taste", "artist-credit": credit, score: 100 },
          { id: "rec-d2", title: "Taste", "artist-credit": credit, score: 100 },
          { id: "rec-d3", title: "Taste", "artist-credit": credit, score: 100 },
          { id: "rec-d4", title: "Taste", "artist-credit": credit, score: 100 },
        ]),
      );
      // En MB "Taste" son seis grabaciones duplicadas: las dos primeras solo
      // aparecen en basura de una release; la tercera es la canónica (52).
      vi.mocked(musicbrainz.browseReleasesByRecording)
        .mockResolvedValueOnce({ releases: [], "release-count": 1 } as never)
        .mockResolvedValueOnce({ releases: [], "release-count": 1 } as never)
        .mockResolvedValueOnce({ releases: [], "release-count": 52 } as never);
      vi.mocked(ingestRecording.albumsFromMbReleases).mockResolvedValue([songAlbum()]);
      vi.mocked(ingestRecording.findOrIngestRecording).mockResolvedValue(
        makeRecordingRow({ id: "rec-d3-local", mbid: "rec-d3", title: "Taste" }),
      );

      const response = await searchCatalog("taste");

      // Sin corte temprano: se recorren los 4 candidatos (cada browse queda
      // cacheado por mbid; el coste es solo del primer golpe).
      expect(
        vi.mocked(musicbrainz.browseReleasesByRecording).mock.calls.map(([mbid]) => mbid),
      ).toEqual(["rec-d1", "rec-d2", "rec-d3", "rec-d4"]);
      expect(ingestRecording.findOrIngestRecording).toHaveBeenCalledWith(
        expect.objectContaining({ mbid: "rec-d3" }),
      );
      expect(response.songContext?.recordingId).toBe("rec-d3-local");
    });
  });
});
