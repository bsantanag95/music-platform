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
vi.mock("../ingest-recording", () => ({ localRecordingArtistName: vi.fn(async () => "Sabrina Carpenter") }));
vi.mock("./activity", () => ({ activityScores: vi.fn(async () => new Map()) }));
vi.mock("./local-match", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./local-match")>();
  return {
    rankByMatchTier: actual.rankByMatchTier,
    matchLocalArtists: vi.fn(async () => []),
    matchLocalReleaseGroups: vi.fn(async () => []),
    matchLocalRecordings: vi.fn(async () => []),
    findArtistsByKeys: vi.fn(async () => []),
    releaseGroupsByArtistsAndTitle: vi.fn(async () => []),
    primaryArtistsByReleaseGroup: vi.fn(async () => new Map()),
  };
});

const localMatch = await import("./local-match");
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

  it("Canciones: grabaciones locales con su artista", async () => {
    vi.mocked(localMatch.matchLocalRecordings).mockResolvedValue([
      { id: "taste", mbid: null, title: "Taste", durationSec: null },
    ]);

    expect(await suggest("song", "tas")).toEqual([
      { kind: "song", id: "taste", title: "Taste", artistName: "Sabrina Carpenter" },
    ]);
  });
});
