import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MBRecordingSearchItem } from "@/services/musicbrainz/types";
import { ApiError } from "@/lib/api/errors";

vi.mock("@/db", () => ({ db: { select: vi.fn() } }));
vi.mock("@/services/musicbrainz/client", () => ({
  musicbrainz: {
    searchArtist: vi.fn(),
    searchRecording: vi.fn(),
    browseReleaseGroupsByArtist: vi.fn(),
    browseReleasesByRecording: vi.fn(),
  },
}));
vi.mock("../ingest-recording", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../ingest-recording")>();
  return {
    ...actual,
    findOrIngestRecording: vi.fn(async (seed: { mbid: string; title: string }) => ({
      id: `local-${seed.mbid}`,
      mbid: seed.mbid,
      title: seed.title,
    })),
    albumsFromMbReleases: vi.fn(),
    localAppearanceAlbums: vi.fn(async () => []),
    localRecordingArtistName: vi.fn(async () => null),
  };
});
vi.mock("./local-match", () => ({
  findArtistsByKeys: vi.fn(async () => []),
  matchLocalRecordings: vi.fn(async () => []),
}));
vi.mock("./activity", () => ({ activityScores: vi.fn(async () => new Map()) }));

const { db } = await import("@/db");
const { musicbrainz } = await import("@/services/musicbrainz/client");
const ingestRecording = await import("../ingest-recording");
const { searchSongs, rankInterpretations, isRelevantRecordingTitle, baseSongTitle } = await import("./songs");

function rec(id: string, title: string, artist: string | null): MBRecordingSearchItem {
  return {
    id,
    title,
    "artist-credit": artist ? [{ name: artist, artist: { id: `${artist}-mbid`, name: artist } }] : [],
  };
}

function album(id: string, title: string, year: number) {
  return { releaseGroupId: id, mbid: id, title, category: "studio" as const, year };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Sin créditos locales ni grabación local previa.
  vi.mocked(db.select).mockImplementation(
    () =>
      ({
        from: vi.fn(() => ({
          innerJoin: vi.fn(() => ({ where: vi.fn(async () => []) })),
          where: vi.fn(() => ({ limit: vi.fn(async () => []) })),
        })),
      }) as never,
  );
  vi.mocked(musicbrainz.browseReleaseGroupsByArtist).mockResolvedValue({
    "release-group-count": 1,
    "release-groups": [{ id: "rg-attack", title: "Back for the Attack", "primary-type": "Album" }],
  });
  vi.mocked(musicbrainz.browseReleasesByRecording).mockResolvedValue({ releases: [], "release-count": 1 } as never);
});

describe("rankInterpretations", () => {
  const candidates = [
    { name: "Kiss of Death", mbid: "kod", localId: null, score: 86, activity: 0 },
    { name: "Dokken", mbid: "dokken", localId: null, score: 100, activity: 0 },
    { name: "KISS", mbid: "kiss", localId: null, score: 96, activity: 0 },
  ];

  it("ordena por relevancia, no por longitud, y solo artistas en un extremo", () => {
    const interpretations = rankInterpretations("dokken kiss of death", candidates);
    expect(interpretations.map((item) => [item.artistName, item.songPart])).toEqual([
      ["Dokken", "kiss of death"],
      ["Kiss of Death", "dokken"],
    ]);
  });

  it("la actividad local pesa antes que el score", () => {
    const withActivity = candidates.map((item) =>
      item.name === "Kiss of Death" ? { ...item, activity: 3 } : item,
    );
    expect(rankInterpretations("dokken kiss of death", withActivity)[0]?.artistName).toBe("Kiss of Death");
  });

  it("separador explícito: ambos órdenes, el escrito primero", () => {
    const interpretations = rankInterpretations("Kiss of Death - Dokken", candidates);
    expect(interpretations.map((item) => [item.artistName, item.songPart])).toEqual([
      ["Kiss of Death", "dokken"],
      ["Dokken", "kiss of death"],
    ]);
  });
});

describe("filtros de título", () => {
  it("isRelevantRecordingTitle tolera ≤2 tokens extra y exige palabras completas", () => {
    expect(isRelevantRecordingTitle("taste", "Taste")).toBe(true);
    expect(isRelevantRecordingTitle("taste", "Taste (demo)")).toBe(true);
    expect(isRelevantRecordingTitle("taste", "sabrina carpenter - taste (dudda bootleg)")).toBe(false);
    expect(isRelevantRecordingTitle("kiss of death", "Kiss")).toBe(true);
    expect(isRelevantRecordingTitle("dokken", "Dokken Rules")).toBe(true);
    expect(isRelevantRecordingTitle("taste", "Distaste")).toBe(false);
  });

  it("baseSongTitle quita sufijos de versión", () => {
    expect(baseSongTitle("Kiss of Death (live)")).toBe("Kiss of Death");
    expect(baseSongTitle("Stairway to Heaven - Live at MSG")).toBe("Stairway to Heaven");
    expect(baseSongTitle("Taste [demo] (remastered)")).toBe("Taste");
    expect(baseSongTitle("Jay-Z Song")).toBe("Jay-Z Song");
    expect(baseSongTitle("(Untitled)")).toBe("(Untitled)");
  });
});

describe("searchSongs", () => {
  it("Dokken kiss of death: interpreta por relevancia, acota por rgid y ofrece la alternativa", async () => {
    vi.mocked(musicbrainz.searchArtist).mockResolvedValue({
      artists: [
        { id: "dokken", name: "Dokken", score: 100 },
        { id: "kod", name: "Kiss of Death", score: 86 },
      ],
    });
    vi.mocked(musicbrainz.searchRecording).mockResolvedValue({
      count: 3,
      recordings: [
        rec("kod-studio", "Kiss of Death", "Dokken"),
        rec("kod-live", "Kiss of Death (live)", "Dokken"),
      ],
    });
    vi.mocked(ingestRecording.albumsFromMbReleases)
      .mockResolvedValueOnce([album("rg-attack", "Back for the Attack", 1987)])
      .mockResolvedValueOnce([album("rg-live", "Beast From the East", 1988)]);
    vi.mocked(musicbrainz.browseReleasesByRecording)
      .mockResolvedValueOnce({ releases: [], "release-count": 9 } as never)
      .mockResolvedValueOnce({ releases: [], "release-count": 2 } as never);

    const response = await searchSongs("dokken kiss of death");

    expect(musicbrainz.searchRecording).toHaveBeenCalledTimes(1);
    expect(vi.mocked(musicbrainz.searchRecording).mock.calls[0]![0]).toBe(
      '"kiss of death" AND (rgid:rg-attack)',
    );
    expect(response.interpretation).toEqual({ song: "kiss of death", artistName: "Dokken" });
    expect(response.alternatives).toEqual([
      { song: "dokken", artistName: "Kiss of Death", query: "Kiss of Death - dokken" },
    ]);
    // La versión en vivo es la misma canción: un solo grupo con la unión.
    expect(response.results).toHaveLength(1);
    expect(response.results[0]).toMatchObject({
      title: "Kiss of Death",
      artistName: "Dokken",
      recordingId: "local-kod-studio",
    });
    expect(response.results[0]!.albums.map((item) => item.title)).toEqual([
      "Back for the Attack",
      "Beast From the East",
    ]);
    expect(ingestRecording.findOrIngestRecording).toHaveBeenCalledTimes(1);
  });

  it("sin canción con el artista, la segunda búsqueda es el título completo (nunca más de dos)", async () => {
    vi.mocked(musicbrainz.searchArtist).mockResolvedValue({
      artists: [
        { id: "kiss", name: "KISS", score: 100 },
        { id: "death", name: "Death", score: 90 },
      ],
    });
    vi.mocked(musicbrainz.searchRecording)
      .mockResolvedValueOnce({ count: 0, recordings: [] })
      .mockResolvedValueOnce({
        count: 120,
        recordings: [
          rec("a", "Kiss of Death", "Dokken"),
          rec("b", "Kiss of Death", "New Order"),
          rec("c", "Kiss of Death", "Dokken"),
        ],
      });
    vi.mocked(ingestRecording.albumsFromMbReleases).mockResolvedValue([album("rg", "Back for the Attack", 1987)]);

    const response = await searchSongs("kiss of death");

    expect(musicbrainz.searchRecording).toHaveBeenCalledTimes(2);
    expect(vi.mocked(musicbrainz.searchRecording).mock.calls[1]![0]).toBe("kiss of death");
    expect(response.interpretation).toBeNull();
    // Grupos por artista, sin mezclar apariciones.
    expect(response.results.map((group) => [group.artistName, group.albums.length])).toEqual([
      ["Dokken", 1],
      ["New Order", 0],
    ]);
    expect(response.results[1]!.query).toBe("New Order - Kiss of Death");
    expect(response.refine).toEqual({ total: 120, artists: ["Dokken", "New Order"] });
  });

  it("un título igual a la consulta completa no confirma la lectura con artista", async () => {
    // Una banda "Stairway" ocupa el inicio de "stairway de prueba", pero la
    // grabación se titula exactamente así: la persona escribió un título.
    vi.mocked(musicbrainz.searchArtist).mockResolvedValue({ artists: [{ id: "stairway", name: "Stairway", score: 100 }] });
    vi.mocked(musicbrainz.searchRecording).mockResolvedValue({
      count: 1,
      recordings: [rec("s", "Stairway de Prueba", "Artista de Prueba")],
    });
    vi.mocked(ingestRecording.albumsFromMbReleases).mockResolvedValue([album("rg", "Álbum de Prueba", 1971)]);

    const response = await searchSongs("stairway de prueba");

    expect(musicbrainz.searchRecording).toHaveBeenCalledTimes(2);
    expect(vi.mocked(musicbrainz.searchRecording).mock.calls[1]![0]).toBe("stairway de prueba");
    expect(response.interpretation).toBeNull();
    expect(response.results[0]).toMatchObject({ title: "Stairway de Prueba", artistName: "Artista de Prueba" });
  });

  it("una versión sin artista acreditado se une al grupo del mismo título", async () => {
    vi.mocked(musicbrainz.searchArtist).mockResolvedValue({ artists: [] });
    vi.mocked(musicbrainz.searchRecording).mockResolvedValue({
      count: 2,
      recordings: [rec("live", "Stairway to Heaven (live)", null), rec("studio", "Stairway to Heaven", "Led Zeppelin")],
    });
    vi.mocked(ingestRecording.albumsFromMbReleases).mockResolvedValue([album("rg", "Led Zeppelin IV", 1971)]);

    const response = await searchSongs("stairway to heaven");

    expect(response.results).toHaveLength(1);
    expect(response.results[0]).toMatchObject({ title: "Stairway to Heaven", artistName: "Led Zeppelin" });
    expect(musicbrainz.browseReleasesByRecording).toHaveBeenCalledTimes(2);
  });

  it("consulta que no es una canción: lista vacía", async () => {
    vi.mocked(musicbrainz.searchArtist).mockResolvedValue({ artists: [] });
    vi.mocked(musicbrainz.searchRecording).mockResolvedValue({
      count: 1,
      recordings: [rec("x", "Something Else Entirely", "X")],
    });

    const response = await searchSongs("xyzzyplugh 123");

    expect(response.results).toEqual([]);
    expect(response.remoteFailed).toBe(false);
  });

  it("MusicBrainz caído sin apariciones locales: INTERNAL_ERROR", async () => {
    vi.mocked(musicbrainz.searchArtist).mockRejectedValue(new Error("503"));
    vi.mocked(musicbrainz.searchRecording).mockRejectedValue(new Error("503"));

    await expect(searchSongs("taste")).rejects.toBeInstanceOf(ApiError);
  });
});

describe("searchSongs en modo de elección (openspec: speed-up-quick-actions-search)", () => {
  function withDisambiguation(item: MBRecordingSearchItem, disambiguation: string): MBRecordingSearchItem {
    return { ...item, disambiguation };
  }

  it("todos los grupos traen grabación identidad, sin browse de apariciones ni paginar", async () => {
    vi.mocked(musicbrainz.searchArtist).mockResolvedValue({ artists: [] });
    vi.mocked(musicbrainz.searchRecording).mockResolvedValue({
      count: 300,
      recordings: [
        rec("wars", "Holy Wars", "Megadeth"),
        withDisambiguation(rec("sabbath-live", "Holy Wars", "Sabbath"), "live, 1990"),
        rec("sabbath-studio", "Holy Wars", "Sabbath"),
        rec("cover", "Holy Wars", "Tributo"),
        rec("other", "Holy Wars", "Otra Banda"),
      ],
    });

    const response = await searchSongs("holy wars", { purpose: "pick" });

    expect(response.results.map((group) => [group.artistName, group.recordingId, group.albums])).toEqual([
      ["Megadeth", "local-wars", []],
      // Prefiere la versión sin disambiguation aunque la en vivo tenga más score.
      ["Sabbath", "local-sabbath-studio", []],
      ["Tributo", "local-cover", []],
      ["Otra Banda", "local-other", []],
    ]);
    expect(musicbrainz.browseReleasesByRecording).not.toHaveBeenCalled();
    expect(ingestRecording.albumsFromMbReleases).not.toHaveBeenCalled();
    expect(response.nextOffset).toBeNull();
  });

  it("si todas las versiones tienen disambiguation, usa la primera", async () => {
    vi.mocked(musicbrainz.searchArtist).mockResolvedValue({ artists: [] });
    vi.mocked(musicbrainz.searchRecording).mockResolvedValue({
      count: 2,
      recordings: [
        withDisambiguation(rec("a", "Hangar 18", "Megadeth"), "live"),
        withDisambiguation(rec("b", "Hangar 18", "Megadeth"), "demo"),
      ],
    });

    const response = await searchSongs("hangar 18", { purpose: "pick" });

    expect(response.results.map((group) => group.recordingId)).toEqual(["local-a"]);
  });

  it("prefiere la grabación local y no registra otra para ese grupo", async () => {
    const localMatch = await import("./local-match");
    vi.mocked(musicbrainz.searchArtist).mockResolvedValue({ artists: [] });
    vi.mocked(musicbrainz.searchRecording).mockResolvedValue({
      count: 1,
      recordings: [rec("wars-remote", "Holy Wars", "Megadeth")],
    });
    vi.mocked(localMatch.matchLocalRecordings).mockResolvedValueOnce([
      { id: "loc-wars", mbid: "wars-known", title: "Holy Wars" },
    ] as never);
    vi.mocked(ingestRecording.localAppearanceAlbums).mockResolvedValueOnce([
      album("rg-rust", "Rust in Peace", 1990),
    ]);
    vi.mocked(ingestRecording.localRecordingArtistName).mockResolvedValueOnce("Megadeth");

    const response = await searchSongs("holy wars", { purpose: "pick" });

    expect(response.results).toHaveLength(1);
    expect(response.results[0]).toMatchObject({ recordingId: "loc-wars", mbid: "wars-known", albums: [] });
    expect(ingestRecording.findOrIngestRecording).not.toHaveBeenCalled();
  });

  it("devuelve como mucho 10 grupos", async () => {
    vi.mocked(musicbrainz.searchArtist).mockResolvedValue({ artists: [] });
    vi.mocked(musicbrainz.searchRecording).mockResolvedValue({
      count: 12,
      recordings: Array.from({ length: 12 }, (_, index) => rec(`r${index}`, "Love", `Artista ${index}`)),
    });

    const response = await searchSongs("love", { purpose: "pick" });

    expect(response.results).toHaveLength(10);
    expect(ingestRecording.findOrIngestRecording).toHaveBeenCalledTimes(10);
  });

  it("abandonada: pasa la señal a MusicBrainz y no registra grabaciones", async () => {
    const controller = new AbortController();
    vi.mocked(musicbrainz.searchArtist).mockResolvedValue({ artists: [] });
    vi.mocked(musicbrainz.searchRecording).mockImplementation(async () => {
      controller.abort();
      return { count: 1, recordings: [rec("wars", "Holy Wars", "Megadeth")] };
    });

    await expect(searchSongs("holy wars", { purpose: "pick", signal: controller.signal })).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(vi.mocked(musicbrainz.searchArtist).mock.calls[0]![1]).toEqual({ signal: controller.signal });
    expect(vi.mocked(musicbrainz.searchRecording).mock.calls[0]![1]).toMatchObject({ signal: controller.signal });
    expect(ingestRecording.findOrIngestRecording).not.toHaveBeenCalled();
  });

  it("sin purpose, solo el primer grupo trae identidad y apariciones (como en /search)", async () => {
    vi.mocked(musicbrainz.searchArtist).mockResolvedValue({ artists: [] });
    vi.mocked(musicbrainz.searchRecording).mockResolvedValue({
      count: 2,
      recordings: [rec("wars", "Holy Wars", "Megadeth"), rec("cover", "Holy Wars", "Tributo")],
    });
    vi.mocked(ingestRecording.albumsFromMbReleases).mockResolvedValue([album("rg", "Rust in Peace", 1990)]);

    const response = await searchSongs("holy wars");

    expect(response.results.map((group) => group.recordingId)).toEqual(["local-wars", null]);
    expect(musicbrainz.browseReleasesByRecording).toHaveBeenCalled();
  });
});
