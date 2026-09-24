import { beforeEach, describe, expect, it, vi } from "vitest";
import page1 from "../musicbrainz/__fixtures__/dsotm-release-browse-page1.json";
import page2 from "../musicbrainz/__fixtures__/dsotm-release-browse-page2.json";
import type { MBReleaseBrowseByGroupItem, MBReleaseBrowseByGroupResponse } from "../musicbrainz/types";

const mocks = vi.hoisted(() => ({
  browse: vi.fn(),
  transaction: vi.fn(),
}));
vi.mock("@/db", () => ({ db: { transaction: mocks.transaction } }));
vi.mock("../musicbrainz/client", () => ({
  musicbrainz: { browseReleasesByReleaseGroup: mocks.browse },
  RELEASE_BROWSE_PAGE_SIZE: 100,
}));

const { fetchReleaseEditions, mapReleaseEdition, saveReleaseEditions, syncReleaseEditions } = await import("./release-editions");

const PAGE1 = page1 as MBReleaseBrowseByGroupResponse;
const PAGE2 = page2 as MBReleaseBrowseByGroupResponse;

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("fetchReleaseEditions", () => {
  it("pide las dos páginas de un álbum con 150 ediciones y toma la fecha canónica del grupo", async () => {
    mocks.browse.mockResolvedValueOnce(PAGE1).mockResolvedValueOnce(PAGE2);

    const result = await fetchReleaseEditions("f5093c06-23e3-404f-aeaa-40f72885ee3a");

    expect(mocks.browse).toHaveBeenNthCalledWith(1, "f5093c06-23e3-404f-aeaa-40f72885ee3a", 0);
    expect(mocks.browse).toHaveBeenNthCalledWith(2, "f5093c06-23e3-404f-aeaa-40f72885ee3a", 100);
    expect(result.editions).toHaveLength(150);
    expect(result.total).toBe(150);
    expect(result.truncated).toBe(false);
    expect(result.firstReleaseDate).toBe("1973-03-24");
  });

  it("respeta el tope de páginas y lo registra sin fallar", async () => {
    mocks.browse.mockResolvedValue({ ...PAGE1, "release-count": 700 });

    const result = await fetchReleaseEditions("rg", 5);

    expect(mocks.browse).toHaveBeenCalledTimes(5);
    expect(result.truncated).toBe(true);
    expect(result.total).toBe(700);
    expect(console.warn).toHaveBeenCalled();
  });

  it("corta cuando una página viene vacía", async () => {
    mocks.browse.mockResolvedValueOnce({ "release-count": 0, releases: [] });
    const result = await fetchReleaseEditions("rg");
    expect(mocks.browse).toHaveBeenCalledTimes(1);
    expect(result.editions).toEqual([]);
    expect(result.firstReleaseDate).toBeUndefined();
  });
});

describe("mapReleaseEdition", () => {
  it("mapea formatos por disco, recuento de pistas y sellos con catálogo", () => {
    const withLabel = PAGE1.releases.find(
      (r) => (r["label-info"] ?? []).some((l) => l.label && l["catalog-number"]) && (r.media ?? []).length > 0,
    )!;
    const mapped = mapReleaseEdition(withLabel);

    expect(mapped.mbid).toBe(withLabel.id);
    expect(mapped.mediumCount).toBe(withLabel.media!.length);
    expect(mapped.formats.length).toBeGreaterThan(0);
    expect(mapped.trackCount).toBe(withLabel.media!.reduce((sum, m) => sum + (m["track-count"] ?? 0), 0));
    expect(mapped.labels[0]).toMatchObject({ mbid: expect.any(String), catalogNumber: expect.any(String) });
  });

  it("con fecha parcial guarda solo el año", () => {
    const mapped = mapReleaseEdition({ id: "e1", title: "x", date: "1973" });
    expect(mapped.releaseDate).toBeNull();
    expect(mapped.releaseYear).toBe(1973);
  });

  it("conserva un número de catálogo sin sello identificado y descarta entradas vacías", () => {
    const edition: MBReleaseBrowseByGroupItem = {
      id: "e1",
      title: "x",
      "label-info": [
        { "catalog-number": "ABC-1", label: null },
        { "catalog-number": null, label: null },
      ],
    };
    expect(mapReleaseEdition(edition).labels).toEqual([{ mbid: null, name: null, catalogNumber: "ABC-1" }]);
  });

  it("sin recuento informado deja track_count nulo", () => {
    const mapped = mapReleaseEdition({ id: "e1", title: "x", media: [{ position: 1, format: "CD" }] });
    expect(mapped.trackCount).toBeNull();
    expect(mapped.formats).toEqual(["CD"]);
  });

  it("ordena los discos por posición", () => {
    const mapped = mapReleaseEdition({
      id: "e1",
      title: "x",
      media: [
        { position: 2, format: "DVD", "track-count": 3 },
        { position: 1, format: "CD", "track-count": 10 },
      ],
    });
    expect(mapped.formats).toEqual(["CD", "DVD"]);
    expect(mapped.trackCount).toBe(13);
  });
});

describe("saveReleaseEditions", () => {
  /** Transacción falsa que registra inserts, deletes y updates. */
  function fakeTransaction() {
    const calls: { op: string; values?: unknown }[] = [];
    const chain = (op: string, returning: unknown[] = []) => {
      const c: Record<string, unknown> = {};
      c.values = (values: unknown) => {
        calls.push({ op, values });
        return c;
      };
      c.onConflictDoUpdate = () => c;
      c.returning = async () => returning;
      c.set = (values: unknown) => {
        calls.push({ op, values });
        return c;
      };
      c.where = async () => undefined;
      c.then = (resolve: (v: unknown) => void) => resolve(undefined);
      return c;
    };
    let insertCount = 0;
    mocks.transaction.mockImplementation(async (cb: (tx: unknown) => Promise<void>) =>
      cb({
        insert: () => {
          insertCount++;
          if (insertCount === 1) return chain("insert-edition", [{ id: "ed-1", mbid: "e1" }]);
          if (insertCount === 2) return chain("insert-label", [{ id: "lab-1", mbid: "label-1" }]);
          return chain("insert-link");
        },
        delete: () => {
          calls.push({ op: "delete-links" });
          return chain("delete");
        },
        update: () => chain("update-group"),
      }),
    );
    return calls;
  }

  it("guarda ediciones, sellos y catálogo, y marca el álbum como sincronizado", async () => {
    const calls = fakeTransaction();
    await saveReleaseEditions("rg-1", [
      {
        id: "e1",
        title: "Album",
        status: "Official",
        date: "1973-03-24",
        "label-info": [{ "catalog-number": "SHVL 804", label: { id: "label-1", name: "Harvest" } }],
      },
    ]);

    const edition = calls.find((c) => c.op === "insert-edition")!.values as { releaseGroupId: string; mbid: string }[];
    expect(edition[0]).toMatchObject({ releaseGroupId: "rg-1", mbid: "e1", releaseYear: 1973 });
    expect(calls.find((c) => c.op === "insert-label")!.values).toEqual([{ mbid: "label-1", name: "Harvest" }]);
    expect(calls.some((c) => c.op === "delete-links")).toBe(true);
    expect(calls.find((c) => c.op === "insert-link")!.values).toEqual([
      { releaseEditionId: "ed-1", labelId: "lab-1", catalogNumber: "SHVL 804", position: 0 },
    ]);
    expect(calls.find((c) => c.op === "update-group")!.values).toMatchObject({ editionsSyncedAt: expect.any(Date) });
  });

  it("sin ediciones igual marca el álbum como sincronizado", async () => {
    const calls = fakeTransaction();
    await saveReleaseEditions("rg-1", []);
    expect(calls.map((c) => c.op)).toEqual(["update-group"]);
  });
});

describe("syncReleaseEditions", () => {
  /** Transacción con lock, relectura del álbum y de la representativa actual. */
  function syncTransaction(rgRow: unknown, currentMbid: string | null) {
    const executed: unknown[] = [];
    const writes: string[] = [];
    let selectCount = 0;
    mocks.transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) =>
      cb({
        execute: async (query: unknown) => {
          executed.push(query);
        },
        select: () => {
          selectCount++;
          const rows = selectCount === 1 ? (rgRow ? [rgRow] : []) : currentMbid ? [{ mbid: currentMbid }] : [];
          const c = { from: () => c, where: () => c, limit: async () => rows };
          return c;
        },
        insert: () => {
          writes.push("insert");
          const c: Record<string, unknown> = {};
          c.values = () => c;
          c.onConflictDoUpdate = () => c;
          c.returning = async () => [];
          c.then = (resolve: (v: unknown) => void) => resolve(undefined);
          return c;
        },
        delete: () => {
          writes.push("delete");
          return { where: async () => undefined };
        },
        update: () => {
          writes.push("update");
          return { set: () => ({ where: async () => undefined }) };
        },
      }),
    );
    return { executed, writes };
  }

  const RG = { id: "rg-1", mbid: "mbid-rg-1", editionsSyncedAt: null };
  const EDITIONS = [
    { id: "mbid-remaster", status: "Official", date: "2011-01-01", title: "Album (Remastered)" },
    { id: "mbid-original", status: "Official", date: "1994-09-13" },
  ];

  it("toma el lock, guarda el resumen y marca el álbum", async () => {
    mocks.browse.mockResolvedValueOnce({ "release-count": 2, releases: EDITIONS });
    const { executed, writes } = syncTransaction(RG, "mbid-original");

    const result = await syncReleaseEditions("rg-1");

    expect(executed).toHaveLength(1);
    expect(result).toMatchObject({ status: "synced", editionCount: 2, representativeWouldChange: false });
    expect(writes).toContain("update");
  });

  it("omite un álbum ya sincronizado sin llamar a MusicBrainz (otra visita ganó el lock)", async () => {
    syncTransaction({ ...RG, editionsSyncedAt: new Date() }, null);

    await expect(syncReleaseEditions("rg-1")).resolves.toEqual({ status: "skipped" });
    expect(mocks.browse).not.toHaveBeenCalled();
  });

  it("informa, sin cambiarla, cuando la representativa sería otra", async () => {
    mocks.browse.mockResolvedValueOnce({ "release-count": 2, releases: EDITIONS });
    syncTransaction(RG, "mbid-remaster");

    const result = await syncReleaseEditions("rg-1");

    expect(result).toMatchObject({
      status: "synced",
      currentRepresentativeMbid: "mbid-remaster",
      chosenRepresentativeMbid: "mbid-original",
      representativeWouldChange: true,
    });
  });

  it("en dry-run no escribe", async () => {
    mocks.browse.mockResolvedValueOnce({ "release-count": 2, releases: EDITIONS });
    const { writes } = syncTransaction(RG, "mbid-original");

    await syncReleaseEditions("rg-1", { dryRun: true });

    expect(writes).toEqual([]);
  });
});
