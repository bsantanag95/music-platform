import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ArtistRow } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";

vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/services/musicbrainz/client", () => ({
  musicbrainz: {
    searchArtist: vi.fn(),
    searchReleaseGroup: vi.fn(),
    searchRecording: vi.fn(),
    browseReleasesByRecording: vi.fn(),
  },
}));
vi.mock("../ingest-artist", () => ({ upsertArtistStubsFromSearch: vi.fn() }));
vi.mock("./local-match", () => ({ matchLocalArtists: vi.fn() }));
vi.mock("./activity", () => ({ activityScores: vi.fn(async () => new Map()) }));

const { musicbrainz } = await import("@/services/musicbrainz/client");
const { upsertArtistStubsFromSearch } = await import("../ingest-artist");
const { matchLocalArtists } = await import("./local-match");
const { activityScores } = await import("./activity");
const { searchArtists, uniqueExactArtist } = await import("./artists");

function row(overrides: Partial<ArtistRow>): ArtistRow {
  return {
    id: `id-${overrides.mbid ?? overrides.name}`,
    mbid: null,
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

/** Los stubs devuelven una fila por candidato de MusicBrainz, con su tipo mapeado. */
function stubsEcho() {
  vi.mocked(upsertArtistStubsFromSearch).mockImplementation(async (stubs) =>
    stubs.map((stub) =>
      row({
        mbid: stub.mbid,
        name: stub.name,
        type: stub.mbType === "Person" ? "person" : stub.mbType === "Group" ? "group" : "unknown",
        bio: stub.disambiguation,
      }),
    ),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(activityScores).mockResolvedValue(new Map());
  stubsEcho();
});

describe("searchArtists", () => {
  it("una sola solicitud a MusicBrainz y nunca resuelve álbumes ni canciones", async () => {
    vi.mocked(matchLocalArtists).mockResolvedValue([]);
    vi.mocked(musicbrainz.searchArtist).mockResolvedValue({ artists: [] });

    await searchArtists("Sabrina Carpenter taste");

    expect(musicbrainz.searchArtist).toHaveBeenCalledTimes(1);
    expect(musicbrainz.searchReleaseGroup).not.toHaveBeenCalled();
    expect(musicbrainz.searchRecording).not.toHaveBeenCalled();
    expect(musicbrainz.browseReleasesByRecording).not.toHaveBeenCalled();
  });

  it("antepone la coincidencia exacta a las subcadenas locales (caso Icon)", async () => {
    vi.mocked(matchLocalArtists).mockResolvedValue([
      row({ name: "Ennio Morricone", mbid: "morricone" }),
    ]);
    vi.mocked(musicbrainz.searchArtist).mockResolvedValue({
      artists: [
        { id: "icon-az", name: "Icon", type: "Group", disambiguation: "US, Arizona hair metal band", country: "US", score: 100 },
        { id: "despised", name: "Despised Icon", type: "Group", score: 92 },
      ],
    });

    const response = await searchArtists("icon");

    expect(response.results.map((result) => result.name)).toEqual([
      "Icon",
      "Despised Icon",
      "Ennio Morricone",
    ]);
    expect(response.results[0]).toMatchObject({ exact: true, country: "US", artistType: "group" });
  });

  it("con homónimos no hay coincidencia única; con un solo nombre exacto sí", async () => {
    vi.mocked(matchLocalArtists).mockResolvedValue([]);
    vi.mocked(musicbrainz.searchArtist).mockResolvedValue({
      artists: [
        { id: "kiss-us", name: "KISS", type: "Group", disambiguation: "US rock band", score: 100 },
        { id: "kiss-kr", name: "KISS", type: "Group", disambiguation: "South Korean girl group", score: 70 },
        { id: "kiss-kiss", name: "Kiss Kiss", type: "Group", score: 74 },
      ],
    });
    const kiss = await searchArtists("KISS");
    expect(uniqueExactArtist(kiss)).toBeNull();
    expect(kiss.results.filter((result) => result.exact)).toHaveLength(2);

    vi.mocked(musicbrainz.searchArtist).mockResolvedValue({
      artists: [
        { id: "sabrina", name: "Sabrina Carpenter", type: "Person", score: 100 },
        { id: "carpenter", name: "Carpenter", type: "Group", score: 80 },
      ],
    });
    const sabrina = await searchArtists("sabrina carpenter");
    expect(uniqueExactArtist(sabrina)?.name).toBe("Sabrina Carpenter");
  });

  it("dentro del mismo nivel ordena por actividad, luego cacheado, luego MusicBrainz", async () => {
    const cached = row({ name: "Icon", mbid: "cached", discographySyncedAt: new Date() });
    const plain = row({ name: "Icon", mbid: "plain" });
    vi.mocked(matchLocalArtists).mockResolvedValue([plain, cached]);
    vi.mocked(musicbrainz.searchArtist).mockResolvedValue({
      artists: [{ id: "remote", name: "Icon", type: "Person", score: 100 }],
    });
    vi.mocked(activityScores).mockResolvedValue(new Map([["id-remote", 5]]));

    const response = await searchArtists("icon");

    expect(response.results.map((result) => result.mbid)).toEqual(["remote", "cached", "plain"]);
  });

  it("homónimos ya persistidos como stub siguen el orden de relevancia de MusicBrainz", async () => {
    // Cada búsqueda persiste sus candidatos: tras buscar "KISS" una vez, todos
    // son locales, y la similitud de la base no distingue entre homónimos.
    vi.mocked(matchLocalArtists).mockResolvedValue([
      row({ name: "Kiss", mbid: "kiss-reggae" }),
      row({ name: "KISS", mbid: "kiss-kr" }),
      row({ name: "KISS", mbid: "kiss-us" }),
    ]);
    vi.mocked(musicbrainz.searchArtist).mockResolvedValue({
      artists: [
        { id: "kiss-us", name: "KISS", type: "Group", score: 100 },
        { id: "kiss-kr", name: "KISS", type: "Group", score: 70 },
        { id: "kiss-reggae", name: "Kiss", type: "Group", score: 65 },
      ],
    });

    const response = await searchArtists("KISS");

    expect(response.results.map((result) => result.mbid)).toEqual(["kiss-us", "kiss-kr", "kiss-reggae"]);
  });

  it("filtra por tipo en la consulta remota y en los stubs existentes", async () => {
    vi.mocked(matchLocalArtists).mockResolvedValue([]);
    vi.mocked(musicbrainz.searchArtist).mockResolvedValue({
      artists: [
        { id: "don", name: "Don Dokken", type: "Person", score: 100 },
        { id: "band", name: "Dokken", type: "Group", score: 90 },
      ],
    });

    const response = await searchArtists("dokken", { artistType: "person" });

    expect(musicbrainz.searchArtist).toHaveBeenCalledWith("(dokken) AND type:person");
    expect(matchLocalArtists).toHaveBeenCalledWith("dokken", { limit: 10, artistType: "person" });
    expect(response.results.map((result) => result.name)).toEqual(["Don Dokken"]);
  });

  it("MusicBrainz caído con datos locales: 200 con remoteFailed y sin redirección", async () => {
    vi.mocked(matchLocalArtists).mockResolvedValue([row({ name: "Icon", mbid: "icon-az" })]);
    vi.mocked(musicbrainz.searchArtist).mockRejectedValue(new Error("503"));

    const response = await searchArtists("icon");

    expect(response.remoteFailed).toBe(true);
    expect(response.results).toHaveLength(1);
    expect(uniqueExactArtist(response)).toBeNull();
  });

  it("MusicBrainz caído sin datos locales: INTERNAL_ERROR", async () => {
    vi.mocked(matchLocalArtists).mockResolvedValue([]);
    vi.mocked(musicbrainz.searchArtist).mockRejectedValue(new Error("503"));

    await expect(searchArtists("icon")).rejects.toBeInstanceOf(ApiError);
  });
});
