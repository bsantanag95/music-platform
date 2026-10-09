import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ArtistRow, ReleaseGroupRow } from "@/db/schema";

vi.mock("@/db", () => ({ db: { select: vi.fn() } }));
vi.mock("@/services/musicbrainz/client", () => ({
  musicbrainz: new Proxy(
    {},
    {
      get: () => {
        throw new Error("las sugerencias nunca deben salir a MusicBrainz");
      },
    },
  ),
}));
vi.mock("@/services/storage/avatar-urls", () => ({ resolveImageUrls: vi.fn(async () => new Map()) }));
vi.mock("./song-suggestions", () => ({
  songSuggestions: vi.fn(async () => [{ id: "taste", title: "Taste", artistName: "Sabrina Carpenter" }]),
}));
vi.mock("./activity", () => ({ activityScores: vi.fn(async () => new Map()) }));
vi.mock("./local-match", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./local-match")>();
  return {
    rankByMatchTier: actual.rankByMatchTier,
    matchLocalArtists: vi.fn(async () => []),
    matchLocalReleaseGroups: vi.fn(async () => []),
    findArtistsByKeys: vi.fn(async () => []),
    releaseGroupsByArtistsAndTitle: vi.fn(async () => []),
    primaryArtistsByReleaseGroup: vi.fn(async () => new Map()),
    shortPrefixArtists: vi.fn(async () => []),
    shortPrefixReleaseGroups: vi.fn(async () => []),
  };
});

const localMatch = await import("./local-match");
const songSuggestionsModule = await import("./song-suggestions");
const { suggest } = await import("./suggest");

const dokken = { id: "dokken", name: "Dokken", type: "group", disambiguation: null } as ArtistRow;
const attack = { id: "attack", title: "Back for the Attack", firstReleaseYear: 1987 } as ReleaseGroupRow;

beforeEach(() => vi.clearAllMocks());

describe("suggest", () => {
  it("menos de dos caracteres no consulta nada", async () => {
    expect(await suggest("artist", " s ")).toEqual([]);
    expect(localMatch.matchLocalArtists).not.toHaveBeenCalled();
  });

  it("Artistas: incluye el puente artista + título primero, por prefijo", async () => {
    vi.mocked(localMatch.findArtistsByKeys).mockResolvedValue([dokken]);
    vi.mocked(localMatch.releaseGroupsByArtistsAndTitle).mockResolvedValue([{ row: attack, artistId: "dokken" }]);
    vi.mocked(localMatch.matchLocalArtists).mockResolvedValue([dokken]);

    const suggestions = await suggest("artist", "dokken back for");

    expect(localMatch.releaseGroupsByArtistsAndTitle).toHaveBeenCalledWith(["dokken"], "back for", {
      limit: 6,
      mode: "prefix",
    });
    expect(suggestions).toEqual([
      { kind: "album", id: "attack", title: "Back for the Attack", artistName: "Dokken", year: 1987, bridge: true },
      { kind: "artist", id: "dokken", name: "Dokken", artistType: "group", disambiguation: null },
    ]);
  });

  it("Álbumes: coincidencias por título con su artista principal", async () => {
    vi.mocked(localMatch.matchLocalReleaseGroups).mockResolvedValue([attack]);
    vi.mocked(localMatch.primaryArtistsByReleaseGroup).mockResolvedValue(
      new Map([["attack", [{ id: "dokken", name: "Dokken" }]]]),
    );

    expect(await suggest("album", "back for")).toEqual([
      { kind: "album", id: "attack", title: "Back for the Attack", artistName: "Dokken", year: 1987, bridge: false },
    ]);
  });

  it("con 2 letras, Artistas y Álbumes buscan por inicio de palabra (openspec: speed-up-short-suggestions)", async () => {
    vi.mocked(localMatch.shortPrefixArtists).mockResolvedValue([dokken]);
    vi.mocked(localMatch.shortPrefixReleaseGroups).mockResolvedValue([attack]);

    expect(await suggest("artist", "Dö")).toEqual([
      { kind: "artist", id: "dokken", name: "Dokken", artistType: "group", disambiguation: null },
    ]);
    expect(await suggest("album", "ba")).toMatchObject([{ kind: "album", id: "attack" }]);
    expect(localMatch.shortPrefixArtists).toHaveBeenCalledWith("Dö", 40);
    expect(localMatch.shortPrefixReleaseGroups).toHaveBeenCalledWith("ba", 40);
    expect(localMatch.matchLocalArtists).not.toHaveBeenCalled();
    expect(localMatch.matchLocalReleaseGroups).not.toHaveBeenCalled();
  });

  it("con 2 letras, un artista conocido por prefijo va antes que uno desconocido por palabra completa", async () => {
    const moPair = { id: "mo-pair", name: "Mo Pair", type: "group", disambiguation: null, discographySyncedAt: null } as ArtistRow;
    const motley = { id: "motley", name: "Mötley Crüe", type: "group", disambiguation: null, discographySyncedAt: new Date() } as ArtistRow;
    vi.mocked(localMatch.shortPrefixArtists).mockResolvedValue([moPair, motley]);

    const names = (await suggest("artist", "mo")).map((row) => (row.kind === "artist" ? row.name : row.kind));

    expect(names).toEqual(["Mötley Crüe", "Mo Pair"]);
  });

  it("con 3 letras sigue la coincidencia tolerante", async () => {
    await suggest("artist", "dok");
    await suggest("album", "bac");
    expect(localMatch.matchLocalArtists).toHaveBeenCalledWith("dok", { limit: 40 });
    expect(localMatch.matchLocalReleaseGroups).toHaveBeenCalledWith("bac", { limit: 40 });
    expect(localMatch.shortPrefixArtists).not.toHaveBeenCalled();
    expect(localMatch.shortPrefixReleaseGroups).not.toHaveBeenCalled();
  });

  it("Canciones: delega en las sugerencias agrupadas por canción con el límite de seis", async () => {
    expect(await suggest("song", "tas")).toEqual([
      { kind: "song", id: "taste", title: "Taste", artistName: "Sabrina Carpenter" },
    ]);
    expect(songSuggestionsModule.songSuggestions).toHaveBeenCalledWith("tas", 6);
  });
});
