import { beforeEach, describe, expect, it, vi } from "vitest";
import fixture from "../musicbrainz/__fixtures__/dsotm-release-with-relations.json";
import type { MBRelease } from "../musicbrainz/types";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  update: vi.fn(),
  transaction: vi.fn(),
  getRelease: vi.fn(),
  upsertArtistStub: vi.fn(),
  ensureArtistMemberships: vi.fn(),
  saveWorkCredits: vi.fn(),
}));
vi.mock("@/db", () => ({ db: { select: mocks.select, update: mocks.update, transaction: mocks.transaction } }));
vi.mock("../musicbrainz/client", () => ({ musicbrainz: { getRelease: mocks.getRelease } }));
vi.mock("./ingest-artist", () => ({
  upsertArtistStub: mocks.upsertArtistStub,
  ensureArtistMemberships: mocks.ensureArtistMemberships,
}));
vi.mock("./work-credits", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./work-credits")>()),
  saveWorkCredits: mocks.saveWorkCredits,
}));

const { completePersonnelSync, mapPersonnelRelations, savePersonnelCredits, syncPersonnelCredits } = await import(
  "./personnel-credits"
);

const RELEASE = fixture as MBRelease;

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

beforeEach(() => {
  vi.clearAllMocks();
  mocks.upsertArtistStub.mockImplementation(async (mbid: string) => ({ id: `artist-${mbid}` }));
});

describe("mapPersonnelRelations con la edición real de DSOTM", () => {
  const mapped = mapPersonnelRelations(RELEASE);

  it("tolera un medio sin lista de pistas (MusicBrainz, álbum \"Outlawed\")", () => {
    const withEmptyMedium: MBRelease = { ...RELEASE, media: [...(RELEASE.media ?? []), { position: 9 }] };
    expect(mapPersonnelRelations(withEmptyMedium).byRecordingMbid.size).toBe(mapped.byRecordingMbid.size);
  });

  it("separa las relaciones de la edición (arte) de las de cada grabación", () => {
    expect(mapped.release.map((r) => r.relationType).sort()).toEqual(["design/illustration", "design/illustration", "photography"].sort());
    expect(mapped.byRecordingMbid.size).toBeGreaterThan(0);
  });

  it("guarda todos los tipos con sus atributos ordenados", () => {
    const types = new Set([...mapped.byRecordingMbid.values()].flat().map((r) => r.relationType));
    expect(types).toEqual(new Set(["engineer", "instrument", "mix", "producer", "vocal"]));
    const nickMason = [...mapped.byRecordingMbid.values()]
      .flat()
      .find((r) => r.artistName === "Nick Mason" && r.attributes.includes("percussion"));
    expect(nickMason?.attributes).toEqual([...nickMason!.attributes].sort());
  });

  it("descarta relaciones que no son de artista", () => {
    const withOther = mapPersonnelRelations({
      id: "r",
      title: "x",
      relations: [{ type: "amazon asin", "target-type": "url" }],
    });
    expect(withOther.release).toEqual([]);
  });

  it("guarda el nombre acreditado solo cuando difiere", () => {
    const result = mapPersonnelRelations({
      id: "r",
      title: "x",
      relations: [
        { type: "photography", "target-type": "artist", "target-credit": "Storm", artist: { id: "a1", name: "Storm Thorgerson" } },
        { type: "design/illustration", "target-type": "artist", "target-credit": "Hipgnosis", artist: { id: "a2", name: "Hipgnosis" } },
      ],
    });
    expect(result.release.map((r) => r.creditedAs)).toEqual(["Storm", null]);
  });
});

describe("savePersonnelCredits", () => {
  function fakeTransaction(fail = false) {
    const ops: string[] = [];
    let inserted: unknown[] = [];
    mocks.transaction.mockImplementation(async (cb: (tx: unknown) => Promise<void>) =>
      cb({
        delete: () => {
          ops.push("delete");
          return { where: async () => undefined };
        },
        insert: () => ({
          values: (rows: unknown[]) => {
            if (fail) throw new Error("fallo a mitad");
            ops.push("insert");
            inserted = rows;
            return { onConflictDoNothing: async () => undefined };
          },
        }),
      }),
    );
    return { ops, inserted: () => inserted };
  }

  it("crea stubs de artistas una vez por artista y reemplaza los créditos en una transacción", async () => {
    const recordingMbids = RELEASE.media!.flatMap((m) => (m.tracks ?? []).map((t) => t.recording.id));
    const queue = [
      recordingMbids.map((mbid, i) => ({ id: `rec-${i}`, mbid })),
      recordingMbids.map((_mbid, i) => ({ recordingId: `rec-${i}` })),
    ];
    mocks.select.mockImplementation(() => queryChain(queue.shift()));
    const { ops, inserted } = fakeTransaction();

    await savePersonnelCredits("release-1", RELEASE);

    const distinctArtists = new Set(
      [...(RELEASE.relations ?? []), ...RELEASE.media!.flatMap((m) => (m.tracks ?? []).flatMap((t) => t.recording.relations ?? []))]
        .filter((r) => r["target-type"] === "artist")
        .map((r) => r.artist!.id),
    );
    expect(mocks.upsertArtistStub).toHaveBeenCalledTimes(distinctArtists.size);
    expect(ops).toEqual(["delete", "insert"]);
    const rows = inserted() as { releaseId: string | null; recordingId: string | null }[];
    expect(rows.filter((r) => r.releaseId === "release-1")).toHaveLength(3);
    expect(rows.every((r) => (r.releaseId === null) !== (r.recordingId === null))).toBe(true);
  });

  it("si falla a mitad, la transacción se revierte con el error", async () => {
    mocks.select.mockImplementation(() => queryChain([]));
    fakeTransaction(true);
    await expect(savePersonnelCredits("release-1", RELEASE)).rejects.toThrow("fallo a mitad");
  });
});

describe("completePersonnelSync", () => {
  it("asegura las pertenencias de los artistas principales antes de marcar la edición", async () => {
    mocks.select.mockImplementation(() => queryChain([{ artist: { id: "band", membershipsSyncedAt: null } }]));
    const set = vi.fn(() => ({ where: async () => undefined }));
    mocks.update.mockReturnValue({ set });

    await expect(completePersonnelSync("release-1", "rg-1")).resolves.toBe(true);

    expect(mocks.ensureArtistMemberships).toHaveBeenCalledWith({ id: "band", membershipsSyncedAt: null });
    expect(set).toHaveBeenCalledWith({ personnelSyncedAt: expect.any(Date) });
  });

  it("si fallan las pertenencias no marca la edición (queda pendiente)", async () => {
    mocks.select.mockImplementation(() => queryChain([{ artist: { id: "band" } }]));
    mocks.ensureArtistMemberships.mockRejectedValue(new Error("MusicBrainz caído"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(completePersonnelSync("release-1", "rg-1")).resolves.toBe(false);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});

describe("syncPersonnelCredits", () => {
  /** Transacción falsa con lock; `open` dice si está abierta y `selects` es la cola de `tx.select`. */
  function lockTransaction(selects: unknown[]) {
    const state = { open: false, executed: 0 };
    mocks.transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
      state.open = true;
      try {
        return await cb({
          select: () => queryChain(selects.shift()),
          execute: async () => {
            state.executed++;
          },
          delete: () => queryChain(undefined),
          insert: () => queryChain(undefined),
        });
      } finally {
        state.open = false;
      }
    });
    return state;
  }

  it("omite una edición con personal y autoría sincronizados sin llamar a MusicBrainz ni abrir transacción", async () => {
    mocks.select.mockImplementation(() =>
      queryChain([{ id: "release-1", mbid: "mbid-1", personnelSyncedAt: new Date(), worksSyncedAt: new Date() }]),
    );

    await expect(syncPersonnelCredits("rg-1")).resolves.toEqual({ status: "skipped" });
    expect(mocks.getRelease).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("con el personal sincronizado pero la autoría pendiente, pide la edición fuera de la transacción y guarda ambos", async () => {
    const pending = { id: "release-1", mbid: "mbid-1", personnelSyncedAt: new Date(), worksSyncedAt: null };
    // Cola del cliente global: la lectura previa y, después de la transacción, las pertenencias.
    const globalSelects: unknown[] = [[pending], []];
    mocks.select.mockImplementation(() => queryChain(globalSelects.shift()));
    // Cola de la transacción: la relectura y las pistas de la edición.
    const tx = lockTransaction([[pending], []]);
    const noCredits = { id: "mbid-1", title: "Sin créditos", media: [] } as MBRelease;
    const openDuring: Record<string, boolean> = {};
    mocks.getRelease.mockImplementation(async () => {
      openDuring.getRelease = tx.open;
      return noCredits;
    });
    mocks.update.mockImplementation(() => {
      openDuring.markPersonnel = tx.open;
      return queryChain(undefined);
    });

    const result = await syncPersonnelCredits("rg-1");

    expect(result).toEqual({ status: "synced", creditCount: 0, workCreditCount: 0 });
    expect(mocks.getRelease).toHaveBeenCalledTimes(1);
    expect(tx.executed).toBe(1);
    expect(mocks.saveWorkCredits).toHaveBeenCalledWith("release-1", noCredits, expect.anything());
    // La request y la marca de personal (tras asegurar las pertenencias) van fuera de la transacción.
    expect(openDuring).toEqual({ getRelease: false, markPersonnel: false });
  });

  it("si otra visita guardó todo mientras se esperaba a MusicBrainz, la relectura bajo el candado no escribe", async () => {
    mocks.select.mockImplementation(() => queryChain([{ id: "release-1", mbid: "mbid-1", personnelSyncedAt: null, worksSyncedAt: null }]));
    lockTransaction([[{ id: "release-1", mbid: "mbid-1", personnelSyncedAt: new Date(), worksSyncedAt: new Date() }]]);
    mocks.getRelease.mockResolvedValue(RELEASE);

    await expect(syncPersonnelCredits("rg-1")).resolves.toEqual({ status: "skipped" });
    expect(mocks.getRelease).toHaveBeenCalledTimes(1);
    expect(mocks.upsertArtistStub).not.toHaveBeenCalled();
    expect(mocks.saveWorkCredits).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("en dry-run cuenta los créditos sin escribir ni abrir transacción", async () => {
    mocks.select.mockImplementation(() => queryChain([{ id: "release-1", mbid: "mbid-1", personnelSyncedAt: null }]));
    mocks.getRelease.mockResolvedValue(RELEASE);

    const result = await syncPersonnelCredits("rg-1", { dryRun: true });

    expect(result).toMatchObject({ status: "synced" });
    expect((result as { creditCount: number }).creditCount).toBeGreaterThan(100);
    expect(mocks.upsertArtistStub).not.toHaveBeenCalled();
    expect(mocks.saveWorkCredits).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
