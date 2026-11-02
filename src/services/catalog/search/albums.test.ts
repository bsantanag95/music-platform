import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReleaseGroupRow } from "@/db/schema";
import type { MBReleaseGroupSearchItem } from "@/services/musicbrainz/types";

vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/services/musicbrainz/client", () => ({
  musicbrainz: { searchReleaseGroup: vi.fn(), searchRecording: vi.fn(), searchArtist: vi.fn() },
}));
vi.mock("../ingest-release-group", () => ({ upsertReleaseGroupStubs: vi.fn() }));
vi.mock("../ingest-discography", () => ({ ingestReleaseGroupCreditsBatch: vi.fn() }));
vi.mock("./local-match", () => ({
  matchLocalReleaseGroups: vi.fn(async () => []),
  findArtistsByKeys: vi.fn(async () => []),
  releaseGroupsByArtistsAndTitle: vi.fn(async () => []),
  releaseGroupsByArtists: vi.fn(async () => []),
  primaryArtistsByReleaseGroup: vi.fn(async () => new Map()),
  releaseGroupsWithContent: vi.fn(async () => new Set()),
}));
vi.mock("./activity", () => ({
  activityScores: vi.fn(async () => new Map()),
  exploredScores: vi.fn(async () => new Map()),
  exploredArtistMbids: vi.fn(async () => new Set()),
}));

const { musicbrainz } = await import("@/services/musicbrainz/client");
const { upsertReleaseGroupStubs } = await import("../ingest-release-group");
const { ingestReleaseGroupCreditsBatch } = await import("../ingest-discography");
const localMatch = await import("./local-match");
const { activityScores, exploredScores } = await import("./activity");
const { searchAlbums } = await import("./albums");

function rgRow(overrides: Partial<ReleaseGroupRow>): ReleaseGroupRow {
  return {
    id: `rg-${overrides.mbid ?? overrides.title}`,
    mbid: null,
    searchText: null,
    title: "X",
    category: "studio",
    coverThumbUrl: null,
    coverStorageKey: null,
    coverCheckedAt: null,
    coverBlockedAt: null,
    firstReleaseDate: null,
    firstReleaseYear: null,
    editionsSyncedAt: null,
    discographyUnlistedAt: null,
    primaryType: null,
    secondaryTypes: null,
    wikidataId: null,
    genresSyncedAt: null,
    createdAt: new Date("2026-01-01"),
    ...overrides,
  };
}

function mbAlbum(
  id: string,
  title: string,
  artist: string,
  extra: Partial<MBReleaseGroupSearchItem> = {},
): MBReleaseGroupSearchItem {
  return {
    id,
    title,
    "primary-type": "Album",
    "first-release-date": "1976-03-15",
    "artist-credit": [{ name: artist, artist: { id: `${artist}-mbid`, name: artist } }],
    ...extra,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(activityScores).mockResolvedValue(new Map());
  vi.mocked(exploredScores).mockResolvedValue(new Map());
  vi.mocked(localMatch.findArtistsByKeys).mockResolvedValue([]);
  vi.mocked(localMatch.releaseGroupsByArtists).mockResolvedValue([]);
  vi.mocked(localMatch.primaryArtistsByReleaseGroup).mockResolvedValue(new Map());
  vi.mocked(upsertReleaseGroupStubs).mockImplementation(async (stubs) =>
    stubs.map((stub) => rgRow({ mbid: stub.mbid, title: stub.title, category: stub.category })),
  );
});

describe("searchAlbums — artista explorado (refine-search-results-phase1)", () => {
  it("el disco de un artista explorado va antes que homónimos con más ediciones, y el de estudio antes", async () => {
    vi.mocked(musicbrainz.searchReleaseGroup).mockResolvedValue({
      count: 875412,
      "release-groups": [
        mbAlbum("buzzg", "The Wall", "buzzG", { count: 9 }),
        mbAlbum("pf-single", "The Wall", "Pink Floyd", { "primary-type": "Single", count: 1 }),
        mbAlbum("pf", "The Wall", "Pink Floyd", { count: 1 }),
      ],
    });
    vi.mocked(exploredScores).mockResolvedValue(
      new Map([
        ["rg-pf", 2],
        ["rg-pf-single", 1],
      ]),
    );

    const response = await searchAlbums("the wall");

    expect(response.results.map((result) => `${result.artistName} ${result.category}`)).toEqual([
      "Pink Floyd studio",
      "Pink Floyd single_ep",
      "buzzG studio",
    ]);
    expect(exploredScores).toHaveBeenCalledWith("release-group", expect.arrayContaining(["rg-pf", "rg-buzzg"]));
  });
});

describe("searchAlbums — notoriedad", () => {
  it("entre homónimos con la misma coincidencia, el disco con más ediciones va primero", async () => {
    vi.mocked(musicbrainz.searchReleaseGroup).mockResolvedValue({
      count: 210,
      "release-groups": [
        mbAlbum("tributo", "Abbey Road", "Various Artists", { count: 1 }),
        mbAlbum("single", "Abbey Road", "Diana Herrera", { "primary-type": "Single", count: 1 }),
        mbAlbum("beatles", "Abbey Road", "The Beatles", { count: 73 }),
      ],
    });

    const response = await searchAlbums("abbey road");

    expect(response.results.map((result) => result.artistName)).toEqual(["The Beatles", "Various Artists", "Diana Herrera"]);
  });

  it("«The Dark Side of the Moon» cuenta como título exacto de «dark side of the moon»", async () => {
    vi.mocked(musicbrainz.searchReleaseGroup).mockResolvedValue({
      count: 77,
      "release-groups": [
        mbAlbum("a", "Dark Side of the Moon", "Hedonistas", { count: 1 }),
        mbAlbum("b", "Dark Side of the Moon", "Medicine Head", { count: 3 }),
        mbAlbum("pf", "The Dark Side of the Moon", "Pink Floyd", { count: 120 }),
      ],
    });

    const response = await searchAlbums("dark side of the moon");

    expect(response.results[0]).toMatchObject({ title: "The Dark Side of the Moon", artistName: "Pink Floyd" });
  });

  it("si la consulta es el nombre de un artista local, sus discos se suman a los candidatos", async () => {
    const floyd = { id: "artist-pf", name: "Pink Floyd" };
    vi.mocked(localMatch.findArtistsByKeys).mockImplementation(async (keys) =>
      keys.includes("pink floyd") ? ([floyd] as never) : [],
    );
    vi.mocked(localMatch.releaseGroupsByArtists).mockResolvedValue([
      rgRow({ mbid: "wall", title: "The Wall", firstReleaseYear: 1979 }),
    ]);
    vi.mocked(localMatch.primaryArtistsByReleaseGroup).mockResolvedValue(
      new Map([["rg-wall", [floyd]]]) as never,
    );
    vi.mocked(musicbrainz.searchReleaseGroup).mockResolvedValue({
      count: 40,
      "release-groups": [mbAlbum("homonimo", "Pink Floyd", "Masryat", { count: 1 })],
    });

    const response = await searchAlbums("pink floyd");

    expect(localMatch.releaseGroupsByArtists).toHaveBeenCalledWith(["artist-pf"], expect.objectContaining({ limit: 10 }));
    // El disco del artista (nivel 1) va antes que el homónimo exacto de otro artista (nivel 2).
    expect(response.results.map((result) => result.title)).toEqual(["The Wall", "Pink Floyd"]);
  });
});

describe("searchAlbums", () => {
  it("una solicitud a MusicBrainz y el artista puede ir delante o detrás", async () => {
    vi.mocked(musicbrainz.searchReleaseGroup).mockResolvedValue({
      count: 7125,
      "release-groups": [
        mbAlbum("demos", "Destroyer Demos", "KISS", { "secondary-types": ["Compilation"] }),
        mbAlbum("void", "Void", "Destroyer Destroyer"),
        mbAlbum("destroyer", "Destroyer", "KISS"),
      ],
    });

    const response = await searchAlbums("destroyer kiss");

    expect(musicbrainz.searchReleaseGroup).toHaveBeenCalledTimes(1);
    expect(musicbrainz.searchRecording).not.toHaveBeenCalled();
    expect(response.results.map((result) => result.title)).toEqual(["Destroyer", "Destroyer Demos", "Void"]);
    expect(response.results[0]).toMatchObject({ artistName: "KISS", year: 1976, category: "studio" });
    // Los créditos de los tres stubs, en un solo lote (openspec: speed-up-search).
    expect(ingestReleaseGroupCreditsBatch).toHaveBeenCalledTimes(1);
    expect(vi.mocked(ingestReleaseGroupCreditsBatch).mock.calls[0]![0]).toHaveLength(3);
  });

  it("consulta genérica: sugiere acotar con los artistas más frecuentes y pagina", async () => {
    vi.mocked(musicbrainz.searchReleaseGroup).mockResolvedValue({
      count: 716,
      "release-groups": [
        mbAlbum("a", "Destroyer", "Telepathe"),
        mbAlbum("b", "Destroyer", "KISS"),
        mbAlbum("c", "Destroyer Demos", "KISS"),
      ],
    });

    const response = await searchAlbums("destroyer");

    expect(response.refine).toEqual({ total: 716, artists: ["KISS", "Telepathe"] });
    expect(response.nextOffset).toBe(3);
  });

  it("sin sugerencia de acotar cuando el artista ya está en la consulta", async () => {
    vi.mocked(musicbrainz.searchReleaseGroup).mockResolvedValue({
      count: 7125,
      "release-groups": [mbAlbum("b", "Destroyer", "KISS")],
    });

    expect((await searchAlbums("kiss destroyer")).refine).toBeNull();
  });

  it("'Cargar más' pide la página siguiente sin repetir lo local", async () => {
    vi.mocked(musicbrainz.searchReleaseGroup).mockResolvedValue({
      count: 26,
      "release-groups": [mbAlbum("z", "Destroyer", "Z")],
    });

    const response = await searchAlbums("destroyer", { offset: 25 });

    expect(localMatch.matchLocalReleaseGroups).not.toHaveBeenCalled();
    expect(musicbrainz.searchReleaseGroup).toHaveBeenCalledWith("destroyer", { offset: 25 });
    expect(response.nextOffset).toBeNull();
    expect(response.refine).toBeNull();
  });

  it("reaplica categoría y década sobre lo que devuelve MusicBrainz", async () => {
    vi.mocked(musicbrainz.searchReleaseGroup).mockResolvedValue({
      count: 3,
      "release-groups": [
        mbAlbum("studio", "Destroyer", "KISS"),
        mbAlbum("live", "Destroyer Live", "KISS", { "secondary-types": ["Live"] }),
        mbAlbum("late", "Destroyer", "Other", { "first-release-date": "2015" }),
      ],
    });

    const response = await searchAlbums("destroyer", { category: "studio", decade: 1970 });

    expect(response.results.map((result) => result.mbid)).toEqual(["studio"]);
    expect(vi.mocked(musicbrainz.searchReleaseGroup).mock.calls[0]![0]).toContain(
      "firstreleasedate:[1970 TO 1979-12-31]",
    );
  });

  it("rango de años y artista en las dos fuentes; el rango reemplaza a la década", async () => {
    vi.mocked(musicbrainz.searchReleaseGroup).mockResolvedValue({
      count: 3,
      "release-groups": [
        mbAlbum("piece", "Piece of Mind", "Iron Maiden", { "first-release-date": "1983-05-16" }),
        mbAlbum("somewhere", "Somewhere in Time", "Iron Maiden", { "first-release-date": "1986-09-29" }),
        // La cláusula es aproximada: el año se reaplica sobre lo que vuelve.
        mbAlbum("beast", "The Number of the Beast", "Iron Maiden", { "first-release-date": "1982-03-22" }),
      ],
    });

    const response = await searchAlbums("maiden", {
      decade: 1970,
      yearFrom: 1983,
      yearTo: 1986,
      artist: "Iron Maiden",
    });

    expect(response.results.map((result) => result.mbid)).toEqual(["piece", "somewhere"]);
    expect(musicbrainz.searchReleaseGroup).toHaveBeenCalledTimes(1);
    expect(vi.mocked(musicbrainz.searchReleaseGroup).mock.calls[0]![0]).toBe(
      '(maiden) AND firstreleasedate:[1983 TO 1986-12-31] AND artist:"Iron Maiden"',
    );
    expect(localMatch.matchLocalReleaseGroups).toHaveBeenCalledWith("maiden", {
      limit: 10,
      category: undefined,
      decade: undefined,
      yearFrom: 1983,
      yearTo: 1986,
      artist: "Iron Maiden",
    });
  });

  it("sin título: solo campos, con artista exacto y varias categorías reaplicadas", async () => {
    vi.mocked(musicbrainz.searchReleaseGroup).mockResolvedValue({
      count: 3,
      "release-groups": [
        mbAlbum("live", "Alive!", "KISS", { "secondary-types": ["Live"], "first-release-date": "1975" }),
        mbAlbum("best", "Double Platinum", "KISS", { "secondary-types": ["Compilation"], "first-release-date": "1978" }),
        // La frase "Kiss" trae también otros artistas y discos de estudio: se descartan.
        mbAlbum("other", "Kiss Kiss Live", "Kiss Kiss", { "secondary-types": ["Live"], "first-release-date": "2001" }),
        mbAlbum("studio", "Destroyer", "KISS"),
      ],
    });

    const response = await searchAlbums("", {
      artist: "Kiss",
      artistExact: true,
      categories: ["live_other", "compilation"],
    });

    expect(response.results.map((result) => result.mbid)).toEqual(["live", "best"]);
    expect(vi.mocked(musicbrainz.searchReleaseGroup).mock.calls[0]![0]).toMatch(/^\(\(\(secondarytype:live/);
    expect(vi.mocked(musicbrainz.searchReleaseGroup).mock.calls[0]![0]).toContain('artist:"Kiss"');
    expect(localMatch.findArtistsByKeys).not.toHaveBeenCalled();
    expect(response.refine).toBeNull();
  });

  it("título exacto: frase en releasegroup y sin lectura artista + título", async () => {
    vi.mocked(musicbrainz.searchReleaseGroup).mockResolvedValue({
      count: 2,
      "release-groups": [
        mbAlbum("ps", "Powerslave", "Iron Maiden"),
        mbAlbum("coll", "Powerslave / Single Collection 2", "Iron Maiden"),
      ],
    });

    const response = await searchAlbums("Powerslave", { exact: true });

    expect(vi.mocked(musicbrainz.searchReleaseGroup).mock.calls[0]![0]).toBe('releasegroup:"Powerslave"');
    expect(response.results.map((result) => result.mbid)).toEqual(["ps"]);
  });

  it("separador explícito: campos de artista y título, con el orden inverso si no hay nada", async () => {
    vi.mocked(musicbrainz.searchReleaseGroup)
      .mockResolvedValueOnce({ count: 0, "release-groups": [] })
      .mockResolvedValueOnce({ count: 1, "release-groups": [mbAlbum("d", "Destroyer", "KISS")] });

    const response = await searchAlbums("Destroyer - KISS");

    expect(vi.mocked(musicbrainz.searchReleaseGroup).mock.calls.map(([query]) => query)).toEqual([
      'releasegroup:"KISS" AND artist:"Destroyer"',
      'releasegroup:"Destroyer" AND artist:"KISS"',
    ]);
    expect(response.results[0]?.title).toBe("Destroyer");
  });

  it("incluye los álbumes locales de un artista que ocupa un extremo de la consulta", async () => {
    const dokken = { id: "dokken", name: "Dokken" };
    vi.mocked(localMatch.findArtistsByKeys).mockResolvedValue([dokken as never]);
    const attack = rgRow({ id: "attack", mbid: "attack", title: "Back for the Attack", firstReleaseYear: 1987 });
    vi.mocked(localMatch.releaseGroupsByArtistsAndTitle).mockResolvedValue([
      { row: attack, artistId: "dokken" },
    ]);
    vi.mocked(localMatch.primaryArtistsByReleaseGroup).mockResolvedValue(
      new Map([["attack", [dokken]]]),
    );
    vi.mocked(musicbrainz.searchReleaseGroup).mockResolvedValue({ count: 0, "release-groups": [] });

    const response = await searchAlbums("dokken back for the attack");

    expect(localMatch.releaseGroupsByArtistsAndTitle).toHaveBeenCalledWith(
      ["dokken"],
      "back for the attack",
      expect.objectContaining({ mode: "fuzzy" }),
    );
    expect(response.results[0]).toMatchObject({ title: "Back for the Attack", artistName: "Dokken", year: 1987 });
  });

  it("MusicBrainz caído con datos locales: remoteFailed sin paginación", async () => {
    vi.mocked(localMatch.matchLocalReleaseGroups).mockResolvedValue([rgRow({ title: "Destroyer" })]);
    vi.mocked(musicbrainz.searchReleaseGroup).mockRejectedValue(new Error("503"));

    const response = await searchAlbums("destroyer");

    expect(response).toMatchObject({ remoteFailed: true, total: null, nextOffset: null });
    expect(response.results).toHaveLength(1);
  });
});

describe("searchAlbums abandonada (openspec: speed-up-quick-actions-search)", () => {
  it("pasa la señal a MusicBrainz y no escribe stubs ni créditos", async () => {
    const controller = new AbortController();
    vi.mocked(musicbrainz.searchReleaseGroup).mockImplementation(async () => {
      controller.abort();
      return { count: 1, "release-groups": [mbAlbum("reign", "Reign in Blood", "Slayer")] };
    });

    await expect(searchAlbums("slayer reign", { signal: controller.signal })).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(vi.mocked(musicbrainz.searchReleaseGroup).mock.calls[0]![1]).toMatchObject({ signal: controller.signal });
    expect(upsertReleaseGroupStubs).not.toHaveBeenCalled();
    expect(ingestReleaseGroupCreditsBatch).not.toHaveBeenCalled();
  });
});
