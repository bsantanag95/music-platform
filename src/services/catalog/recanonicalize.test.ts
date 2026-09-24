import { describe, it, expect, vi, beforeEach } from "vitest";
import { recanonicalizeReleaseGroup } from "./recanonicalize";
import type { MBReleaseSummary } from "@/services/musicbrainz/types";

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
    transaction: vi.fn(),
  },
}));

vi.mock("./ingest-release", () => ({
  ingestReleaseTracklist: vi.fn(),
  persistCanonicalReleaseDate: vi.fn(),
}));

vi.mock("./release-editions", () => ({
  fetchReleaseEditions: vi.fn(),
  saveReleaseEditions: vi.fn(),
}));

const { db } = await import("@/db");
const { ingestReleaseTracklist, persistCanonicalReleaseDate } = await import("./ingest-release");
const { fetchReleaseEditions, saveReleaseEditions } = await import("./release-editions");

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

/** Transacción que registra cada `update().set()` para verificar el intercambio de la marca. */
function mockTransaction() {
  const sets: unknown[] = [];
  vi.mocked(db.transaction).mockImplementation((async (cb: (tx: unknown) => Promise<void>) => {
    const tx = {
      update: () => ({
        set: (values: unknown) => {
          sets.push(values);
          return { where: async () => undefined };
        },
      }),
    };
    await cb(tx);
  }) as never);
  return sets;
}

function mockEditions(releases: MBReleaseSummary[], firstReleaseDate?: string) {
  vi.mocked(fetchReleaseEditions).mockResolvedValue({
    editions: releases,
    firstReleaseDate,
    total: releases.length,
    truncated: false,
  });
}

const RG_ROW = { id: "rg-1", mbid: "mbid-rg-1", title: "Album", category: "studio" };
const REMASTER_AND_ORIGINAL: MBReleaseSummary[] = [
  { id: "mbid-remaster", status: "Official", date: "2011-01-01", title: "Album (Remastered)" },
  { id: "mbid-original", status: "Official", date: "1994-09-13" },
];

describe("recanonicalizeReleaseGroup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("desmarca la anterior e ingiere la nueva representativa, sin tocar tablas sociales", async () => {
    queueSelects(
      [RG_ROW], // release_group
      [{ id: "r-old", mbid: "mbid-remaster" }], // representativa actual
      [], // la nueva todavía no está ingerida
    );
    mockEditions(REMASTER_AND_ORIGINAL, "1994-09-13");
    const sets = mockTransaction();

    const result = await recanonicalizeReleaseGroup("rg-1");

    expect(result).toEqual({
      status: "recanonicalized",
      fromReleaseMbid: "mbid-remaster",
      toReleaseMbid: "mbid-original",
    });
    expect(persistCanonicalReleaseDate).toHaveBeenCalledWith("rg-1", "1994-09-13");
    expect(saveReleaseEditions).toHaveBeenCalledWith("rg-1", REMASTER_AND_ORIGINAL);
    expect(sets).toEqual([{ isRepresentative: false }]);
    expect(ingestReleaseTracklist).toHaveBeenCalledWith(
      "rg-1",
      expect.objectContaining({ id: "mbid-original" }),
      { representative: true },
    );
  });

  it("si la nueva representativa ya está ingerida como variante, intercambia la marca sin pedir su tracklist", async () => {
    queueSelects([RG_ROW], [{ id: "r-old", mbid: "mbid-remaster" }], [{ id: "r-orig", mbid: "mbid-original" }]);
    mockEditions(REMASTER_AND_ORIGINAL, "1994-09-13");
    const sets = mockTransaction();

    const result = await recanonicalizeReleaseGroup("rg-1");

    expect(result).toMatchObject({ status: "recanonicalized", toReleaseMbid: "mbid-original" });
    expect(sets).toEqual([{ isRepresentative: false }, { isRepresentative: true }]);
    expect(ingestReleaseTracklist).not.toHaveBeenCalled();
  });

  it("no cambia la edición cuando la ingerida ya es la representativa", async () => {
    queueSelects([RG_ROW], [{ id: "r-1", mbid: "mbid-original" }]);
    mockEditions([{ id: "mbid-original", status: "Official", date: "1994-09-13" }], "1994");

    const result = await recanonicalizeReleaseGroup("rg-1");

    expect(result).toEqual({ status: "unchanged", currentReleaseMbid: "mbid-original" });
    // la fecha canónica y el resumen de ediciones se repueblan igual (backfill)
    expect(persistCanonicalReleaseDate).toHaveBeenCalledWith("rg-1", "1994");
    expect(saveReleaseEditions).toHaveBeenCalled();
    expect(db.transaction).not.toHaveBeenCalled();
    expect(ingestReleaseTracklist).not.toHaveBeenCalled();
  });

  it("en dry-run informa sin escribir", async () => {
    queueSelects([RG_ROW], [{ id: "r-old", mbid: "mbid-remaster" }]);
    mockEditions(REMASTER_AND_ORIGINAL, "1994-09-13");

    const result = await recanonicalizeReleaseGroup("rg-1", { dryRun: true });

    expect(result).toMatchObject({
      status: "dry-run",
      currentReleaseMbid: "mbid-remaster",
      chosenReleaseMbid: "mbid-original",
      wouldChangeEdition: true,
      canonicalFirstReleaseDate: "1994-09-13",
    });
    expect(persistCanonicalReleaseDate).not.toHaveBeenCalled();
    expect(saveReleaseEditions).not.toHaveBeenCalled();
    expect(db.transaction).not.toHaveBeenCalled();
    expect(ingestReleaseTracklist).not.toHaveBeenCalled();
  });

  it("omite un release-group sin mbid", async () => {
    queueSelects([{ ...RG_ROW, mbid: null }]);

    const result = await recanonicalizeReleaseGroup("rg-1");

    expect(result).toEqual({ status: "skipped", reason: "no-mbid" });
    expect(fetchReleaseEditions).not.toHaveBeenCalled();
  });
});
