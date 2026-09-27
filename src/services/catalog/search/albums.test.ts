import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReleaseGroupRow } from "@/db/schema";
import type { MBReleaseGroupSearchItem } from "@/services/musicbrainz/types";

vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/services/musicbrainz/client", () => ({
  musicbrainz: { searchReleaseGroup: vi.fn(), searchRecording: vi.fn(), searchArtist: vi.fn() },
}));
vi.mock("../ingest-release-group", () => ({ upsertReleaseGroupStubs: vi.fn() }));
vi.mock("../ingest-discography", () => ({ ingestCredits: vi.fn() }));
vi.mock("./local-match", () => ({
  matchLocalReleaseGroups: vi.fn(async () => []),
  findArtistsByKeys: vi.fn(async () => []),
  releaseGroupsByArtistsAndTitle: vi.fn(async () => []),
  primaryArtistsByReleaseGroup: vi.fn(async () => new Map()),
  releaseGroupsWithContent: vi.fn(async () => new Set()),
}));
vi.mock("./activity", () => ({ activityScores: vi.fn(async () => new Map()) }));

const { musicbrainz } = await import("@/services/musicbrainz/client");
const { upsertReleaseGroupStubs } = await import("../ingest-release-group");
const { ingestCredits } = await import("../ingest-discography");
const localMatch = await import("./local-match");
const { activityScores } = await import("./activity");
const { searchAlbums } = await import("./albums");

function rgRow(overrides: Partial<ReleaseGroupRow>): ReleaseGroupRow {
  return {
    id: `rg-${overrides.mbid ?? overrides.title}`,
    mbid: null,
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
  vi.mocked(upsertReleaseGroupStubs).mockImplementation(async (stubs) =>
    stubs.map((stub) => rgRow({ mbid: stub.mbid, title: stub.title, category: stub.category })),
  );
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
    expect(ingestCredits).toHaveBeenCalledTimes(3);
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
