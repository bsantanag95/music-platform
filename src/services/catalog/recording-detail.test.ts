import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import {
  buildTrackStrip,
  discYear,
  getRecordingDetail,
  groupAppearances,
  scheduleSongCreditsSync,
  type ContainingAlbum,
} from "./recording-detail";
import { schedulePersonnelSync } from "./album-detail";

vi.mock("@/db", () => ({
  db: { select: vi.fn(), selectDistinct: vi.fn() },
}));
vi.mock("./album-detail", () => ({ schedulePersonnelSync: vi.fn() }));
vi.mock("./recording-versions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./recording-versions")>()),
  loadVersionAttributes: vi.fn(async (ids: string[]) => new Map(ids.map((id) => [id, ["live"]]))),
}));

function queryChain(result: unknown) {
  const chain: object = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "then") {
          return (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
            Promise.resolve(result).then(resolve, reject);
        }
        return () => chain;
      },
    },
  );
  return chain;
}

function album(id: string, category: string, year: number | null, date: string | null = null): ContainingAlbum {
  return { releaseGroupId: id, title: id, category, coverThumbUrl: null, firstReleaseDate: date, firstReleaseYear: year };
}

describe("getRecordingDetail", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve not_found y no hace llamadas externas", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    vi.mocked(db.select).mockReturnValue(queryChain([]) as never);

    await expect(getRecordingDetail("00000000-0000-0000-0000-000000000001")).resolves.toEqual({
      kind: "not_found",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("elige el disco principal, ordena los discos y trae los atributos de versión", async () => {
    const queue: unknown[] = [
      [{ id: "rec", mbid: null, title: "November Rain", durationSec: 537 }],
      [{ artistId: "gnr", name: "Guns N' Roses", role: "primary", joinPhrase: null, position: 0 }],
      [],
      [{ id: "gnr", name: "Guns N' Roses" }],
    ];
    vi.mocked(db.select).mockImplementation((() => queryChain(queue.shift())) as never);
    vi.mocked(db.selectDistinct).mockReturnValue(
      queryChain([
        album("comp", "compilation", 2004, "2004-03-23"),
        album("single", "single_ep", 1992),
        album("uyi", "studio", 1991, "1991-09-17"),
        album("demos", "live_other", 1986),
      ]) as never,
    );

    const result = await getRecordingDetail("rec");
    if (result.kind !== "ok") throw new Error("esperaba ok");
    expect(result.detail.principalDisc?.releaseGroupId).toBe("uyi");
    expect(result.detail.containingAlbums.map((a) => a.releaseGroupId)).toEqual(["demos", "uyi", "single", "comp"]);
    expect(result.detail.versionAttributes).toEqual(["live"]);
    expect(result.detail.primaryArtist).toEqual({ id: "gnr", name: "Guns N' Roses" });
  });
});

describe("groupAppearances", () => {
  it("agrupa por tipo en orden fijo y marca como original el disco más temprano", () => {
    const grouped = groupAppearances([
      album("comp-2004", "compilation", 2004),
      album("single-1992", "single_ep", 1992),
      album("uyi", "studio", 1991, "1991-09-17"),
      album("comp-1998", "compilation", 1998),
      album("rara", "desconocida", 2000),
    ]);
    expect(grouped.groups.map((g) => g.category)).toEqual(["studio", "single_ep", "compilation", "live_other"]);
    expect(grouped.groups[2]!.discs.map((d) => d.releaseGroupId)).toEqual(["comp-1998", "comp-2004"]);
    expect(grouped.groups[3]!.discs.map((d) => d.releaseGroupId)).toEqual(["rara"]);
    expect(grouped.originalReleaseGroupId).toBe("uyi");
  });

  it("sin discos no hay grupos ni original", () => {
    expect(groupAppearances([])).toEqual({ groups: [], originalReleaseGroupId: null });
  });

  it("discYear usa el año canónico o el de la fecha", () => {
    expect(discYear(album("a", "studio", 1991))).toBe(1991);
    expect(discYear(album("b", "studio", null, "1992-01-02"))).toBe(1992);
    expect(discYear(album("c", "studio", null))).toBeNull();
  });
});

describe("buildTrackStrip", () => {
  const tracks = [
    { recordingId: "a", discNumber: 1, position: 1, title: "Uno" },
    { recordingId: "b", discNumber: 1, position: 2, title: "Dos" },
    { recordingId: "c", discNumber: 2, position: 1, title: "Tres" },
  ];

  it("toma la anterior y la siguiente cruzando discos", () => {
    const strip = buildTrackStrip(tracks, "b");
    expect(strip).toMatchObject({ index: 2, total: 3, multiDisc: true });
    expect(strip?.previous?.recordingId).toBe("a");
    expect(strip?.next?.recordingId).toBe("c");
  });

  it("la primera no tiene anterior y la última no tiene siguiente", () => {
    expect(buildTrackStrip(tracks, "a")?.previous).toBeNull();
    expect(buildTrackStrip(tracks, "c")?.next).toBeNull();
  });

  it("devuelve null si la grabación no está en la lista", () => {
    expect(buildTrackStrip(tracks, "x")).toBeNull();
  });

  it("un solo disco no es multidisco", () => {
    expect(buildTrackStrip(tracks.slice(0, 2), "a")?.multiDisc).toBe(false);
  });
});

describe("scheduleSongCreditsSync", () => {
  beforeEach(() => vi.clearAllMocks());

  it("delega en la sincronización del álbum para la edición representativa", () => {
    const releaseRow = { id: "rel", releaseGroupId: "rg" } as never;
    scheduleSongCreditsSync(releaseRow);
    expect(schedulePersonnelSync).toHaveBeenCalledWith(releaseRow);
  });

  it("sin edición representativa no agenda nada", () => {
    scheduleSongCreditsSync(null);
    expect(schedulePersonnelSync).not.toHaveBeenCalled();
  });
});
