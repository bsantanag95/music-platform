import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ select: vi.fn(), ingest: vi.fn() }));
vi.mock("@/db", () => ({ db: { select: mocks.select } }));
vi.mock("./ingest-release", () => ({ ingestReleaseTracklist: mocks.ingest }));

const { getAlbumEditions, getEditionExtraTracks } = await import("./album-editions");

/** Cadena de consulta encadenable que, al esperarse, resuelve `result`. */
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

function queueSelects(...results: unknown[]) {
  const queue = [...results];
  mocks.select.mockImplementation(() => queryChain(queue.shift()));
}

const EDITION = {
  id: "ed-1",
  mbid: "mbid-experience",
  releaseGroupId: "rg-1",
  title: "The Dark Side of the Moon",
  disambiguation: "Experience Edition",
  status: "Official",
  releaseDate: "2011-09-26",
  releaseYear: 2011,
  country: "GB",
  packaging: null,
  formats: ["CD", "CD"],
  mediumCount: 2,
  trackCount: 4,
};
const MAIN_TRACKS = [
  { recordingId: "r-money", title: "Money", releaseMbid: "mbid-original" },
  { recordingId: "r-time", title: "Time", releaseMbid: "mbid-original" },
];
const VARIANT_TRACKS = [
  { recordingId: "r-money", discNumber: 1, position: 1, title: "Money", durationSec: 380, variantType: "original" },
  { recordingId: "r-money-live", discNumber: 2, position: 1, title: "Money (Live)", durationSec: 400, variantType: "live" },
];

beforeEach(() => vi.clearAllMocks());

describe("getEditionExtraTracks", () => {
  it("la primera vez ingiere la edición como no representativa y devuelve solo lo que agrega", async () => {
    queueSelects([EDITION], MAIN_TRACKS, [], VARIANT_TRACKS);
    mocks.ingest.mockResolvedValue({ id: "rel-exp" });

    const tracks = await getEditionExtraTracks("rg-1", "ed-1");

    expect(mocks.ingest).toHaveBeenCalledTimes(1);
    expect(mocks.ingest).toHaveBeenCalledWith(
      "rg-1",
      expect.objectContaining({ id: "mbid-experience", disambiguation: "Experience Edition" }),
      { representative: false },
    );
    expect(tracks.map((t) => t.recordingId)).toEqual(["r-money-live"]);
  });

  it("la segunda vez lee la edición ya ingerida sin ir a MusicBrainz", async () => {
    queueSelects([EDITION], MAIN_TRACKS, [{ id: "rel-exp" }], VARIANT_TRACKS);

    await getEditionExtraTracks("rg-1", "ed-1");

    expect(mocks.ingest).not.toHaveBeenCalled();
  });

  it("una caja responde EDITION_IS_BOX sin ingerir", async () => {
    queueSelects([{ ...EDITION, packaging: "Box", mediumCount: 6, trackCount: 193 }], MAIN_TRACKS);

    await expect(getEditionExtraTracks("rg-1", "ed-1")).rejects.toMatchObject({
      code: "EDITION_IS_BOX",
      status: 422,
    });
    expect(mocks.ingest).not.toHaveBeenCalled();
  });

  it("una edición de otro álbum responde EDITION_NOT_FOUND", async () => {
    queueSelects([]);

    await expect(getEditionExtraTracks("rg-1", "ed-otro")).rejects.toMatchObject({
      code: "EDITION_NOT_FOUND",
      status: 404,
    });
  });
});

describe("getAlbumEditions", () => {
  it("devuelve las ediciones con sus sellos, la representativa y las variantes", async () => {
    queueSelects(
      [{ title: "The Dark Side of the Moon" }],
      [EDITION, { ...EDITION, id: "ed-0", mbid: "mbid-original", disambiguation: null, releaseDate: "1973-03-24", releaseYear: 1973, formats: ["12\" Vinyl"], mediumCount: 1, trackCount: 2 }],
      [{ releaseEditionId: "ed-1", name: "EMI", catalogNumber: "50999" }],
      MAIN_TRACKS,
    );

    const result = await getAlbumEditions("rg-1");

    expect(result.editions.map((e) => e.mbid)).toEqual(["mbid-original", "mbid-experience"]);
    expect(result.editions[1]!.labels).toEqual([{ name: "EMI", catalogNumber: "50999" }]);
    expect(result.representativeMbid).toBe("mbid-original");
    expect(result.representativeTrackCount).toBe(2);
    expect(result.variants).toHaveLength(1);
    expect(result.variants[0]).toMatchObject({ editionId: "ed-1", name: "Experience Edition", labels: ["EMI"] });
  });

  it("un álbum inexistente no tiene ediciones", async () => {
    queueSelects([]);
    await expect(getAlbumEditions("rg-x")).resolves.toEqual({
      editions: [],
      representativeMbid: null,
      representativeTrackCount: 0,
      variants: [],
    });
  });
});
