import { describe, it, expect, vi, beforeEach } from "vitest";
import { recanonicalizeReleaseGroup } from "./recanonicalize";

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/services/musicbrainz/client", () => ({
  musicbrainz: { getReleaseGroup: vi.fn() },
}));

vi.mock("./ingest-release", () => ({
  findOrIngestTracklist: vi.fn(),
  persistCanonicalReleaseDate: vi.fn(),
}));

const { db } = await import("@/db");
const { musicbrainz } = await import("@/services/musicbrainz/client");
const { findOrIngestTracklist, persistCanonicalReleaseDate } = await import("./ingest-release");

/** Encola respuestas para llamadas sucesivas a `db.select()...limit()`. */
function queueSelects(...results: unknown[][]) {
  const queue = [...results];
  vi.mocked(db.select).mockImplementation(() => {
    const rows = queue.shift() ?? [];
    const chain = {
      from: () => chain,
      where: () => chain,
      limit: async () => rows,
    };
    return chain as never;
  });
}

function mockDelete() {
  const chain = { where: vi.fn(async () => undefined) };
  vi.mocked(db.delete).mockReturnValue(chain as never);
  return chain;
}

const RG_ROW = { id: "rg-1", mbid: "mbid-rg-1", title: "Album", category: "studio" };

describe("recanonicalizeReleaseGroup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reemplaza la edición cuando la representativa difiere, sin tocar tablas sociales", async () => {
    queueSelects(
      [RG_ROW], // release_group
      [{ id: "r-old", mbid: "mbid-remaster" }], // release actual
    );
    vi.mocked(musicbrainz.getReleaseGroup).mockResolvedValue({
      id: "mbid-rg-1",
      title: "Album",
      "first-release-date": "1994-09-13",
      releases: [
        { id: "mbid-remaster", status: "Official", date: "2011-01-01", title: "Album (Remastered)" },
        { id: "mbid-original", status: "Official", date: "1994-09-13" },
      ],
    });
    const del = mockDelete();

    const result = await recanonicalizeReleaseGroup("rg-1");

    expect(result).toEqual({
      status: "recanonicalized",
      fromReleaseMbid: "mbid-remaster",
      toReleaseMbid: "mbid-original",
    });
    expect(persistCanonicalReleaseDate).toHaveBeenCalledWith("rg-1", "1994-09-13");
    expect(del.where).toHaveBeenCalledTimes(1); // solo el DELETE de release
    expect(findOrIngestTracklist).toHaveBeenCalledWith("rg-1", "mbid-rg-1");
  });

  it("no escribe nada cuando la edición ingerida ya es la representativa", async () => {
    queueSelects([RG_ROW], [{ id: "r-1", mbid: "mbid-original" }]);
    vi.mocked(musicbrainz.getReleaseGroup).mockResolvedValue({
      id: "mbid-rg-1",
      title: "Album",
      "first-release-date": "1994",
      releases: [{ id: "mbid-original", status: "Official", date: "1994-09-13" }],
    });
    mockDelete();

    const result = await recanonicalizeReleaseGroup("rg-1");

    expect(result).toEqual({ status: "unchanged", currentReleaseMbid: "mbid-original" });
    // la fecha canónica se repuebla igual (backfill)
    expect(persistCanonicalReleaseDate).toHaveBeenCalledWith("rg-1", "1994");
    expect(db.delete).not.toHaveBeenCalled();
    expect(findOrIngestTracklist).not.toHaveBeenCalled();
  });

  it("en dry-run informa sin escribir", async () => {
    queueSelects([RG_ROW], [{ id: "r-old", mbid: "mbid-remaster" }]);
    vi.mocked(musicbrainz.getReleaseGroup).mockResolvedValue({
      id: "mbid-rg-1",
      title: "Album",
      "first-release-date": "1994-09-13",
      releases: [
        { id: "mbid-remaster", status: "Official", date: "2011-01-01", title: "Album (Remastered)" },
        { id: "mbid-original", status: "Official", date: "1994-09-13" },
      ],
    });

    const result = await recanonicalizeReleaseGroup("rg-1", { dryRun: true });

    expect(result).toMatchObject({
      status: "dry-run",
      currentReleaseMbid: "mbid-remaster",
      chosenReleaseMbid: "mbid-original",
      wouldChangeEdition: true,
    });
    expect(persistCanonicalReleaseDate).not.toHaveBeenCalled();
    expect(db.delete).not.toHaveBeenCalled();
    expect(findOrIngestTracklist).not.toHaveBeenCalled();
  });

  it("omite un release-group sin mbid", async () => {
    queueSelects([{ ...RG_ROW, mbid: null }]);

    const result = await recanonicalizeReleaseGroup("rg-1");

    expect(result).toEqual({ status: "skipped", reason: "no-mbid" });
    expect(musicbrainz.getReleaseGroup).not.toHaveBeenCalled();
  });
});
