import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildVersionEntries,
  compareDiscs,
  compareDiscsByDate,
  getRecordingVersions,
  groupVersions,
  loadVersionAttributes,
  mergeAttributes,
  pickPrincipalDisc,
  resolveVersionLine,
  resolveVersionOf,
  resolveWorkOriginals,
  versionGroupOf,
  type VersionEntry,
} from "./recording-versions";

const mocks = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock("@/db", () => ({ db: { execute: mocks.execute } }));

beforeEach(() => vi.clearAllMocks());

const disc = (id: string, category: string, firstReleaseYear: number | null, firstReleaseDate: string | null = null) => ({
  releaseGroupId: id,
  category,
  firstReleaseYear,
  firstReleaseDate,
});

describe("compareDiscs", () => {
  it("pone los discos de estudio primero y después el más temprano", () => {
    const studio1991 = disc("uyi", "studio", 1991, "1991-09-17");
    const single1992 = disc("single", "single_ep", 1992);
    const demos1986 = disc("demos", "live_other", 1986);
    const sorted = [single1992, demos1986, studio1991].sort(compareDiscs);
    expect(sorted.map((d) => d.releaseGroupId)).toEqual(["uyi", "demos", "single"]);
  });

  it("usa el año cuando falta la fecha exacta y deja al final los discos sin año", () => {
    const sorted = [disc("b", "studio", null), disc("a", "studio", 1990), disc("c", "studio", 1990, "1990-01-02")].sort(
      compareDiscs,
    );
    expect(sorted.map((d) => d.releaseGroupId)).toEqual(["c", "a", "b"]);
  });

  it("desempata por id", () => {
    expect(compareDiscs(disc("a", "studio", 1990), disc("b", "studio", 1990))).toBeLessThan(0);
  });

  it("compareDiscsByDate no mira el tipo", () => {
    expect(compareDiscsByDate(disc("demos", "live_other", 1986), disc("uyi", "studio", 1991))).toBeLessThan(0);
  });

  it("pickPrincipalDisc elige el primer disco de estudio o el más temprano", () => {
    expect(pickPrincipalDisc([disc("s", "single_ep", 2015), disc("c", "compilation", 2018)])?.releaseGroupId).toBe("s");
    expect(pickPrincipalDisc([disc("c", "compilation", 1998), disc("uyi", "studio", 1991)])?.releaseGroupId).toBe("uyi");
    expect(pickPrincipalDisc([])).toBeNull();
  });
});

describe("atributos de versión", () => {
  it("mergeAttributes une, ordena y quita repetidos", () => {
    expect(mergeAttributes([["live"], ["cover", "live"], []])).toEqual(["cover", "live"]);
  });

  it("loadVersionAttributes devuelve vacío para grabaciones sin obra", async () => {
    mocks.execute.mockResolvedValue([
      { recording_id: "live", attributes: ["live"] },
      { recording_id: "medley", attributes: ["medley"] },
      { recording_id: "medley", attributes: ["live", "medley"] },
    ]);
    const result = await loadVersionAttributes(["live", "medley", "sin-obra"]);
    expect(result.get("live")).toEqual(["live"]);
    expect(result.get("medley")).toEqual(["live", "medley"]);
    expect(result.get("sin-obra")).toEqual([]);
  });

  it("loadVersionAttributes no consulta sin grabaciones", async () => {
    expect((await loadVersionAttributes([])).size).toBe(0);
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it("versionGroupOf: cover gana a live; sin marca va a otras", () => {
    expect(versionGroupOf(["cover", "live"])).toBe("covers");
    expect(versionGroupOf(["live", "medley"])).toBe("live");
    expect(versionGroupOf(["instrumental"])).toBe("others");
    expect(versionGroupOf([])).toBe("others");
  });
});

describe("resolveWorkOriginals", () => {
  it("mapea la fila elegida por la consulta a cada obra", async () => {
    mocks.execute.mockResolvedValue([
      { work_id: "w1", recording_id: "studio", title: "November Rain", artist_name: "Guns N' Roses" },
    ]);
    const originals = await resolveWorkOriginals(["w1", "w2", "w1"]);
    expect(originals.get("w1")).toEqual({ workId: "w1", recordingId: "studio", title: "November Rain", artistName: "Guns N' Roses" });
    expect(originals.has("w2")).toBe(false);
  });
});

describe("resolveVersionOf", () => {
  it("enlaza las versiones en vivo y los covers con la original de su obra", async () => {
    mocks.execute
      // obras de los candidatos
      .mockResolvedValueOnce([
        { recording_id: "live", work_id: "w1" },
        { recording_id: "cover", work_id: "w1" },
      ])
      // originales
      .mockResolvedValueOnce([{ work_id: "w1", recording_id: "studio", title: "November Rain", artist_name: "Guns N' Roses" }]);

    const attributes = new Map([
      ["studio", []],
      ["live", ["live"]],
      ["cover", ["cover"]],
      ["demo", []],
    ]);
    const result = await resolveVersionOf(["studio", "live", "cover", "demo"], attributes);
    expect(result.get("live")).toEqual({ recordingId: "studio", title: "November Rain", artistName: "Guns N' Roses" });
    expect(result.get("cover")?.recordingId).toBe("studio");
    expect(result.get("studio")).toBeNull();
    expect(result.get("demo")).toBeNull();
  });

  it("no enlaza una grabación consigo misma", async () => {
    mocks.execute
      .mockResolvedValueOnce([{ recording_id: "live", work_id: "w1" }])
      .mockResolvedValueOnce([{ work_id: "w1", recording_id: "live", title: "X", artist_name: null }]);
    const result = await resolveVersionOf(["live"], new Map([["live", ["live"]]]));
    expect(result.get("live")).toBeNull();
  });

  it("no consulta obras si ninguna grabación es versión de otra", async () => {
    const result = await resolveVersionOf(["a"], new Map([["a", ["instrumental"]]]));
    expect(result.get("a")).toBeNull();
    expect(mocks.execute).not.toHaveBeenCalled();
  });
});

describe("resolveVersionLine", () => {
  it("un cover en vivo se rotula como cover", async () => {
    mocks.execute
      .mockResolvedValueOnce([{ recording_id: "x", work_id: "w1" }])
      .mockResolvedValueOnce([{ work_id: "w1", recording_id: "studio", title: "November Rain", artist_name: "Guns N' Roses" }]);
    expect(await resolveVersionLine("x", ["cover", "live"])).toEqual({
      kind: "cover",
      original: { recordingId: "studio", title: "November Rain", artistName: "Guns N' Roses" },
    });
  });

  it("sin cover ni live no consulta", async () => {
    expect(await resolveVersionLine("x", ["instrumental"])).toBeNull();
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it("sin original distinta no hay línea", async () => {
    mocks.execute.mockResolvedValueOnce([{ recording_id: "x", work_id: "w1" }]).mockResolvedValueOnce([]);
    expect(await resolveVersionLine("x", ["live"])).toBeNull();
  });
});

function entry(recordingId: string, attributes: string[], earliestKey: string, title = "November Rain"): VersionEntry {
  return { recordingId, title, durationSec: null, artist: null, attributes, disc: null, earliestKey };
}

describe("groupVersions", () => {
  it("reparte por atributos, excluye la actual y ordena por fecha del disco más temprano", () => {
    const groups = groupVersions(
      [
        entry("studio", [], "1991-09-17"),
        entry("demo", [], "1986-99-99"),
        entry("tokyo", ["live"], "1992-12-30"),
        entry("live-era", ["live"], "1999-11-30"),
        entry("rockabye", ["cover"], "2009-11-10"),
        entry("8bit", ["cover", "instrumental"], "2017-05-12"),
        entry("cover-live", ["cover", "live"], "2001-01-01"),
      ],
      "studio",
    );
    expect(groups.others.map((e) => e.recordingId)).toEqual(["demo"]);
    expect(groups.live.map((e) => e.recordingId)).toEqual(["tokyo", "live-era"]);
    expect(groups.covers.map((e) => e.recordingId)).toEqual(["cover-live", "rockabye", "8bit"]);
  });
});

describe("buildVersionEntries", () => {
  it("una entrada por grabación con su disco principal, la fecha más temprana y los atributos unidos", () => {
    const base = {
      recording_id: "rec",
      title: "November Rain",
      duration_sec: 537,
      artist_id: "gnr",
      artist_name: "Guns N' Roses",
    };
    const entries = buildVersionEntries([
      { ...base, attributes: [], release_group_id: "comp", disc_title: "Greatest Hits", category: "compilation", first_release_date: "2004-03-23", first_release_year: 2004 },
      { ...base, attributes: [], release_group_id: "uyi", disc_title: "Use Your Illusion I", category: "studio", first_release_date: "1991-09-17", first_release_year: 1991 },
      { ...base, attributes: ["medley"], release_group_id: "uyi", disc_title: "Use Your Illusion I", category: "studio", first_release_date: "1991-09-17", first_release_year: 1991 },
    ]);
    expect(entries).toEqual([
      {
        recordingId: "rec",
        title: "November Rain",
        durationSec: 537,
        artist: { id: "gnr", name: "Guns N' Roses" },
        attributes: ["medley"],
        disc: { releaseGroupId: "uyi", title: "Use Your Illusion I", year: 1991 },
        earliestKey: "1991-09-17",
      },
    ]);
  });

  it("una grabación sin discos queda al final y sin disco", () => {
    const [only] = buildVersionEntries([
      {
        recording_id: "r",
        title: "T",
        duration_sec: null,
        attributes: [],
        artist_id: null,
        artist_name: null,
        release_group_id: null,
        disc_title: null,
        category: null,
        first_release_date: null,
        first_release_year: null,
      },
    ]);
    expect(only).toMatchObject({ disc: null, artist: null, earliestKey: "9999-99-99" });
  });
});

describe("getRecordingVersions", () => {
  it("devuelve null si la grabación no tiene obra", async () => {
    mocks.execute.mockResolvedValue([]);
    expect(await getRecordingVersions("sin-obra")).toBeNull();
  });

  it("devuelve grupos vacíos si la obra no tiene otras grabaciones", async () => {
    mocks.execute.mockResolvedValue([
      {
        recording_id: "solo",
        title: "T",
        duration_sec: null,
        attributes: [],
        artist_id: null,
        artist_name: null,
        release_group_id: null,
        disc_title: null,
        category: null,
        first_release_date: null,
        first_release_year: null,
      },
    ]);
    expect(await getRecordingVersions("solo")).toEqual({ covers: [], live: [], others: [] });
  });
});
