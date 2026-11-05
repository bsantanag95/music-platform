import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ArtistRow } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";

vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/services/musicbrainz/client", () => ({
  musicbrainz: {
    searchArtist: vi.fn(),
    searchReleaseGroup: vi.fn(),
    searchRecording: vi.fn(),
  },
}));
vi.mock("../ingest-artist", () => ({ upsertArtistStubsFromSearch: vi.fn() }));
vi.mock("./local-match", () => ({ matchLocalArtists: vi.fn() }));
// "Integrante de" lee la base por página (openspec: add-catalog-search-fields): aquí, nadie es integrante.
vi.mock("./catalog-fields", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./catalog-fields")>()),
  memberOf: vi.fn(async () => new Map()),
  resolveCatalogFields: vi.fn(async () => ({ genreId: null, award: null })),
  catalogArtistPage: vi.fn(),
  activeSpans: vi.fn(async () => new Map()),
}));
vi.mock("./activity", () => ({
  activityScores: vi.fn(async () => new Map()),
  primaryDiscCounts: vi.fn(async () => new Map()),
  albumCommunity: vi.fn(async () => new Map()),
  exploredScores: vi.fn(async () => new Map()),
  exploredArtistMbids: vi.fn(async () => new Set()),
}));

const { musicbrainz } = await import("@/services/musicbrainz/client");
const { upsertArtistStubsFromSearch } = await import("../ingest-artist");
const { matchLocalArtists } = await import("./local-match");
const { activityScores } = await import("./activity");
const { searchArtists, uniqueExactArtist } = await import("./artists");
const catalogFields = await import("./catalog-fields");

function row(overrides: Partial<ArtistRow>): ArtistRow {
  return {
    id: `id-${overrides.mbid ?? overrides.name}`,
    mbid: null,
    searchText: null,
    type: "group",
    name: "X",
    disambiguation: null,
    photoUrl: null,
    createdAt: new Date("2026-01-01"),
    discographySyncedAt: null,
    discographyCompleteAt: null,
    discographyMbTotal: null,
    discographyCheckedAt: null,
    discographyRefreshRequestedAt: null,
    membershipsSyncedAt: null,
    lineupSyncedAt: null,
    country: null,
    beginAreaName: null,
    endAreaName: null,
    lifeBegin: null,
    lifeEnd: null,
    lifeEnded: null,
    wikidataId: null,
    profileSyncedAt: null,
    wikimediaSyncedAt: null,
    photoFile: null,
    photoAuthor: null,
    photoLicense: null,
    photoLicenseUrl: null,
    photoSourceUrl: null,
    photoBlockedAt: null,
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
        disambiguation: stub.disambiguation,
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
  it("localOnly: solo lo local, ordenado, sin MusicBrainz ni stubs (openspec: speed-up-search)", async () => {
    vi.mocked(matchLocalArtists).mockResolvedValue([
      row({ mbid: "kiss-army", name: "Kiss Army" }),
      row({ mbid: "kiss", name: "Kiss", discographySyncedAt: new Date() }),
    ]);

    const response = await searchArtists("kiss", { localOnly: true });

    expect(musicbrainz.searchArtist).not.toHaveBeenCalled();
    expect(upsertArtistStubsFromSearch).not.toHaveBeenCalled();
    expect(response.results.map((artist) => artist.name)).toEqual(["Kiss", "Kiss Army"]);
    expect(response).toMatchObject({ remoteFailed: false, total: null, nextOffset: null });
  });

  it("una sola solicitud a MusicBrainz y nunca resuelve álbumes ni canciones", async () => {
    vi.mocked(matchLocalArtists).mockResolvedValue([]);
    vi.mocked(musicbrainz.searchArtist).mockResolvedValue({ artists: [] });

    await searchArtists("Sabrina Carpenter taste");

    expect(musicbrainz.searchArtist).toHaveBeenCalledTimes(1);
    expect(musicbrainz.searchReleaseGroup).not.toHaveBeenCalled();
    expect(musicbrainz.searchRecording).not.toHaveBeenCalled();
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

    const response = await searchArtists("dokken", { filters: { artistType: "person" } });

    expect(musicbrainz.searchArtist).toHaveBeenCalledWith("(dokken) AND type:person", { offset: 0, signal: undefined });
    expect(matchLocalArtists).toHaveBeenCalledWith("dokken", { limit: 10, artistType: "person" });
    expect(response.results.map((result) => result.name)).toEqual(["Don Dokken"]);
  });

  it("filtros avanzados en una sola consulta a MusicBrainz y en lo local", async () => {
    vi.mocked(matchLocalArtists).mockResolvedValue([]);
    vi.mocked(musicbrainz.searchArtist).mockResolvedValue({
      artists: [{ id: "soda", name: "Soda Stereo", type: "Group", country: "AR", score: 100 }],
    });

    const filters = { country: ["AR"], beginFrom: 1980, beginTo: 1989 };
    const response = await searchArtists("soda", { filters });

    expect(musicbrainz.searchArtist).toHaveBeenCalledTimes(1);
    expect(musicbrainz.searchArtist).toHaveBeenCalledWith(
      "(soda) AND country:(AR) AND begin:[1980 TO 1989-12-31]",
      { offset: 0, signal: undefined },
    );
    expect(matchLocalArtists).toHaveBeenCalledWith("soda", { limit: 10, ...filters });
    expect(response.results.map((result) => [result.name, result.country])).toEqual([["Soda Stereo", "AR"]]);
  });

  it("un artista local sin país vuelve con el país de MusicBrainz", async () => {
    // El SQL lo deja fuera (sin país); la página remota lo trae y el stub existente se reutiliza.
    vi.mocked(matchLocalArtists).mockResolvedValue([]);
    vi.mocked(musicbrainz.searchArtist).mockResolvedValue({
      artists: [{ id: "sumo", name: "Sumo", type: "Group", country: "AR", score: 100 }],
    });
    vi.mocked(upsertArtistStubsFromSearch).mockResolvedValue([row({ mbid: "sumo", name: "Sumo" })]);

    const response = await searchArtists("sumo", { filters: { country: ["AR"] } });

    expect(response.results.map((result) => [result.name, result.country])).toEqual([["Sumo", "AR"]]);
  });

  it("sin nombre: solo campos, con total y página siguiente; lo local solo en la primera", async () => {
    vi.mocked(matchLocalArtists).mockResolvedValue([row({ name: "Los Prisioneros", mbid: "prisioneros" })]);
    vi.mocked(musicbrainz.searchArtist).mockResolvedValue({
      count: 53,
      artists: [
        { id: "prisioneros", name: "Los Prisioneros", type: "Group", country: "CL", score: 100 },
        { id: "laley", name: "La Ley", type: "Group", country: "CL", score: 100 },
      ],
    });

    const response = await searchArtists("", { filters: { country: ["CL"], artistType: "group" } });

    expect(musicbrainz.searchArtist).toHaveBeenCalledWith("type:group AND country:(CL)", { offset: 0, signal: undefined });
    expect(response.results.map((result) => result.name)).toEqual(["Los Prisioneros", "La Ley"]);
    expect(response.total).toBe(53);
    expect(response.nextOffset).toBe(2);

    vi.mocked(matchLocalArtists).mockClear();
    const next = await searchArtists("", { filters: { country: ["CL"] }, offset: 2 });
    expect(matchLocalArtists).not.toHaveBeenCalled();
    expect(next.nextOffset).toBe(4);
  });

  it("nombre exacto: la frase de MusicBrainz trae nombres más largos y se reaplica la igualdad", async () => {
    vi.mocked(matchLocalArtists).mockResolvedValue([]);
    vi.mocked(musicbrainz.searchArtist).mockResolvedValue({
      artists: [
        { id: "kiss", name: "KISS", type: "Group", score: 100 },
        { id: "kisskiss", name: "Kiss Kiss", type: "Group", score: 90 },
      ],
    });

    const response = await searchArtists("Kiss", { filters: { exact: true } });

    expect(musicbrainz.searchArtist).toHaveBeenCalledWith('artist:"Kiss"', { offset: 0, signal: undefined });
    expect(response.results.map((result) => result.name)).toEqual(["KISS"]);
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

describe("searchArtists abandonada (openspec: speed-up-quick-actions-search)", () => {
  it("pasa la señal a MusicBrainz y no escribe stubs", async () => {
    const controller = new AbortController();
    vi.mocked(matchLocalArtists).mockResolvedValue([]);
    vi.mocked(musicbrainz.searchArtist).mockImplementation(async () => {
      controller.abort();
      return { artists: [{ id: "slayer", name: "Slayer", type: "Group", score: 100 }] };
    });

    await expect(searchArtists("slayer", { signal: controller.signal })).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(vi.mocked(musicbrainz.searchArtist).mock.calls[0]![1]).toEqual({ offset: 0, signal: controller.signal });
    expect(upsertArtistStubsFromSearch).not.toHaveBeenCalled();
  });
});

describe("años y lugar de MusicBrainz (openspec: refine-advanced-search-phase3)", () => {
  it("un stub sin ficha toma años y ciudad de la búsqueda; la ficha local manda", async () => {
    vi.mocked(matchLocalArtists).mockResolvedValue([
      row({ mbid: "mb-local", name: "Los Tres", lifeBegin: "1987", beginAreaName: "Concepción" }),
    ]);
    vi.mocked(musicbrainz.searchArtist).mockResolvedValue({
      count: 2,
      artists: [
        {
          id: "mb-local",
          name: "Los Tres",
          "life-span": { begin: "1990" },
          "begin-area": { id: "a1", name: "Santiago" },
        },
        {
          id: "mb-remote",
          name: "Los Prisioneros",
          type: "Group",
          country: "CL",
          "life-span": { begin: "1982-05", end: "2006", ended: true },
          "begin-area": { id: "a2", name: "San Miguel" },
        },
      ],
    });

    const { results } = await searchArtists("los", {});
    const local = results.find((artist) => artist.name === "Los Tres");
    const remote = results.find((artist) => artist.name === "Los Prisioneros");
    expect(local).toMatchObject({ beginYear: 1987, beginArea: "Concepción", endYear: null });
    expect(remote).toMatchObject({ beginYear: 1982, endYear: 2006, beginArea: "San Miguel" });
  });
});

describe("searchArtists solo del catálogo (openspec: add-catalog-search-fields)", () => {
  it("con un campo del catálogo no consulta MusicBrainz y pagina la base con período e integrantes", async () => {
    const mena = row({ mbid: "mena", name: "Javiera Mena", type: "person", discographySyncedAt: new Date() });
    vi.mocked(catalogFields.catalogArtistPage).mockResolvedValue({ rows: [mena], total: 30, nextOffset: 25 });
    vi.mocked(catalogFields.activeSpans).mockResolvedValue(new Map([[mena.id, { from: 2006, to: null }]]));
    vi.mocked(catalogFields.memberOf).mockResolvedValue(new Map([[mena.id, { id: "band", name: "Prisma", more: 1 }]]));

    const response = await searchArtists("", {
      filters: { artistType: "person", country: ["CL"] },
      catalog: { activeFrom: 2005, activeTo: 2010 },
    });

    expect(musicbrainz.searchArtist).not.toHaveBeenCalled();
    expect(upsertArtistStubsFromSearch).not.toHaveBeenCalled();
    expect(catalogFields.catalogArtistPage).toHaveBeenCalledWith(
      "",
      { artistType: "person", country: ["CL"] },
      { activeFrom: 2005, activeTo: 2010 },
      { genreId: null, award: null },
      0,
    );
    expect(response).toMatchObject({ catalogOnly: true, total: 30, nextOffset: 25, remoteFailed: false });
    expect(response.results[0]).toMatchObject({
      name: "Javiera Mena",
      activeFrom: 2006,
      activeTo: null,
      memberOf: { name: "Prisma", more: 1 },
    });
  });

  it("un género desconocido no activa el modo catálogo", async () => {
    vi.mocked(matchLocalArtists).mockResolvedValue([]);
    vi.mocked(musicbrainz.searchArtist).mockResolvedValue({ artists: [] });

    const response = await searchArtists("kiss", { catalog: { genre: "zzz" } });

    expect(musicbrainz.searchArtist).toHaveBeenCalledTimes(1);
    expect(response.catalogOnly).toBe(false);
  });
});
