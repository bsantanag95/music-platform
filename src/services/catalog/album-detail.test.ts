import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReleaseGroupRow } from "@/db/schema";

vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("@/db", () => ({ db: { update: vi.fn(), select: vi.fn(), insert: vi.fn() } }));
vi.mock("./ingest-release", () => ({ findOrIngestTracklist: vi.fn() }));
vi.mock("../cover-art", () => ({
  resolveCoverThumbUrl: vi.fn(),
  fetchCoverThumb: vi.fn(),
}));
vi.mock("./personnel-credits", () => ({
  savePersonnelCredits: vi.fn(),
  completePersonnelSync: vi.fn(),
  syncPersonnelCredits: vi.fn(),
}));
vi.mock("./release-editions", () => ({ syncReleaseEditions: vi.fn() }));
vi.mock("./cover-mirror", () => ({
  isCoverMirrorEnabled: vi.fn(),
  mirrorCover: vi.fn(),
}));

const { after } = await import("next/server");
const { db } = await import("@/db");
const { resolveCoverThumbUrl, fetchCoverThumb } = await import("../cover-art");
const { isCoverMirrorEnabled, mirrorCover } = await import("./cover-mirror");
const { resolveAlbumCover, getAlbumDetail } = await import("./album-detail");
const { findOrIngestTracklist } = await import("./ingest-release");
const { syncReleaseEditions } = await import("./release-editions");
const { syncPersonnelCredits } = await import("./personnel-credits");

const DAY_MS = 24 * 60 * 60 * 1000;
const MBID = "mbid-rg-1";
const COVER_URL = `https://coverartarchive.org/release-group/${MBID}/front-250`;

function makeRg(overrides: Partial<ReleaseGroupRow> = {}): ReleaseGroupRow {
  return {
    id: "rg-1",
    mbid: MBID,
    title: "Album",
    category: "studio",
    coverThumbUrl: null,
    coverStorageKey: null,
    coverCheckedAt: null,
    coverBlockedAt: null,
    editionsSyncedAt: null,
    firstReleaseDate: null,
    firstReleaseYear: null,
    createdAt: new Date(),
    ...overrides,
  };
}

function makeUpdateChain() {
  const setValues: unknown[] = [];
  const chain = {
    setValues,
    set: vi.fn((values: unknown) => {
      setValues.push(values);
      return chain;
    }),
    where: vi.fn(async () => {}),
  };
  vi.mocked(db.update).mockReturnValue(chain as never);
  return chain;
}

describe("resolveAlbumCover (SSR del detalle de álbum)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isCoverMirrorEnabled).mockReturnValue(false);
  });

  it("usa el HEAD y agenda el espejo con after()", async () => {
    const chain = makeUpdateChain();
    vi.mocked(resolveCoverThumbUrl).mockResolvedValue(COVER_URL);
    vi.mocked(isCoverMirrorEnabled).mockReturnValue(true);
    vi.mocked(fetchCoverThumb).mockResolvedValue({
      status: "found",
      bytes: Buffer.from([1, 2, 3]),
    });

    let scheduled: (() => Promise<void>) | null = null;
    vi.mocked(after).mockImplementation((task) => {
      scheduled = task as () => Promise<void>;
    });

    const result = await resolveAlbumCover(makeRg());

    expect(resolveCoverThumbUrl).toHaveBeenCalledWith(MBID);
    expect(result).toBe(COVER_URL);
    expect(chain.setValues[0]).toMatchObject({ coverThumbUrl: COVER_URL });
    expect(after).toHaveBeenCalledTimes(1);

    await scheduled!();
    expect(fetchCoverThumb).toHaveBeenCalledWith(MBID);
    expect(mirrorCover).toHaveBeenCalled();
  });

  it("no agenda espejo cuando la carátula ya está en el storage", async () => {
    makeUpdateChain();
    vi.mocked(isCoverMirrorEnabled).mockReturnValue(true);

    const result = await resolveAlbumCover(
      makeRg({ coverThumbUrl: "https://cdn.example.com/covers/x.webp", coverStorageKey: "covers/x.webp" }),
    );

    expect(result).toBe("https://cdn.example.com/covers/x.webp");
    expect(resolveCoverThumbUrl).not.toHaveBeenCalled();
    expect(after).not.toHaveBeenCalled();
  });

  it("una carátula retirada devuelve null sin HEAD ni espejo", async () => {
    const result = await resolveAlbumCover(makeRg({ coverBlockedAt: new Date() }));

    expect(result).toBeNull();
    expect(resolveCoverThumbUrl).not.toHaveBeenCalled();
    expect(after).not.toHaveBeenCalled();
  });

  it("un negativo reciente devuelve null sin HEAD", async () => {
    const result = await resolveAlbumCover(
      makeRg({ coverCheckedAt: new Date(Date.now() - 1 * DAY_MS) }),
    );

    expect(result).toBeNull();
    expect(resolveCoverThumbUrl).not.toHaveBeenCalled();
  });

  it("sin carátula en CAA no escribe verificación (el HEAD no distingue 404 de error)", async () => {
    vi.mocked(resolveCoverThumbUrl).mockResolvedValue(null);

    const result = await resolveAlbumCover(makeRg());

    expect(result).toBeNull();
    expect(db.update).not.toHaveBeenCalled();
    expect(after).not.toHaveBeenCalled();
  });
});

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

describe("getAlbumDetail (artistas principales y variantes)", () => {
  const releaseRow = {
    id: "rel-1",
    mbid: "mbid-rel-1",
    releaseGroupId: "rg-1",
    editionLabel: "standard",
    releaseDate: null,
    coverThumbUrl: null,
    creditsSyncedAt: new Date(),
    isRepresentative: true,
    personnelSyncedAt: new Date(),
    worksSyncedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isCoverMirrorEnabled).mockReturnValue(false);
    vi.mocked(findOrIngestTracklist).mockResolvedValue(releaseRow as never);
  });

  function queueSelects(...results: unknown[]) {
    const queue = [...results];
    vi.mocked(db.select).mockImplementation((() => queryChain(queue.shift())) as never);
  }

  it("devuelve todos los artistas principales en orden con su joinPhrase", async () => {
    queueSelects(
      [makeRg({ coverThumbUrl: COVER_URL })],
      [
        { recordingId: "r1", position: 1, discNumber: 1, title: "Money (Live)", durationSec: 380, variantType: "live", variantOfId: "r0" },
        { recordingId: "r2", position: 2, discNumber: 1, title: "Time", durationSec: 413, variantType: "original", variantOfId: null },
      ],
      [],
      [{ id: "r0", title: "Money" }],
      [
        { id: "a1", name: "Artista A", joinPhrase: " & " },
        { id: "a2", name: "Artista B", joinPhrase: null },
      ],
    );

    const result = await getAlbumDetail("rg-1");
    if (result.kind !== "ok") throw new Error("esperaba ok");

    expect(result.detail.primaryArtists).toEqual([
      { id: "a1", name: "Artista A", joinPhrase: " & " },
      { id: "a2", name: "Artista B", joinPhrase: null },
    ]);
    expect(result.detail.primaryArtist).toEqual({ id: "a1", name: "Artista A" });
    expect(result.detail.tracks[0]?.variantType).toBe("live");
    expect(result.detail.tracks[0]?.variantOf).toEqual({ recordingId: "r0", title: "Money" });
    expect(result.detail.tracks[1]?.variantOf).toBeNull();
  });

  it("sin crédito de release-group deriva el artista de las pistas", async () => {
    queueSelects(
      [makeRg({ coverThumbUrl: COVER_URL })],
      [{ recordingId: "r1", position: 1, discNumber: 1, title: "Uno", durationSec: 100, variantType: "original", variantOfId: null }],
      [{ recordingId: "r1", artistId: "a9", name: "Banda", role: "primary", joinPhrase: null, position: 0 }],
      [],
    );
    vi.mocked(db.insert).mockReturnValue(queryChain(undefined) as never);

    const result = await getAlbumDetail("rg-1");
    if (result.kind !== "ok") throw new Error("esperaba ok");

    expect(result.detail.primaryArtists).toEqual([{ id: "a9", name: "Banda", joinPhrase: null }]);
    expect(db.insert).toHaveBeenCalledTimes(1);
  });

  it("agenda la sincronización de ediciones pendiente y la respuesta no depende de su resultado", async () => {
    queueSelects(
      [makeRg({ coverThumbUrl: COVER_URL, editionsSyncedAt: null })],
      [{ recordingId: "r1", position: 1, discNumber: 1, title: "Uno", durationSec: 100, variantType: "original", variantOfId: null }],
      [],
      [{ id: "a1", name: "Banda", joinPhrase: null }],
    );
    const tasks: (() => Promise<void>)[] = [];
    vi.mocked(after).mockImplementation((task) => {
      tasks.push(task as () => Promise<void>);
    });
    vi.mocked(syncReleaseEditions).mockRejectedValue(new Error("MusicBrainz caído"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await getAlbumDetail("rg-1");

    expect(result.kind).toBe("ok");
    expect(tasks).toHaveLength(1);
    await expect(tasks[0]!()).resolves.toBeUndefined();
    expect(syncReleaseEditions).toHaveBeenCalledWith("rg-1");
  });

  it("no agenda nada si el álbum ya tiene el resumen de ediciones", async () => {
    queueSelects(
      [makeRg({ coverThumbUrl: COVER_URL, editionsSyncedAt: new Date() })],
      [],
      [{ id: "a1", name: "Banda", joinPhrase: null }],
    );
    vi.mocked(after).mockImplementation(() => {});

    await getAlbumDetail("rg-1");

    expect(after).not.toHaveBeenCalled();
  });

  it("agenda los créditos de personal pendientes de la edición representativa", async () => {
    vi.mocked(findOrIngestTracklist).mockResolvedValue({ ...releaseRow, personnelSyncedAt: null } as never);
    queueSelects(
      [makeRg({ coverThumbUrl: COVER_URL, editionsSyncedAt: new Date() })],
      [],
      [{ id: "a1", name: "Banda", joinPhrase: null }],
    );
    const tasks: (() => Promise<void>)[] = [];
    vi.mocked(after).mockImplementation((task) => {
      tasks.push(task as () => Promise<void>);
    });

    await getAlbumDetail("rg-1");

    expect(tasks).toHaveLength(1);
    await tasks[0]!();
    expect(syncPersonnelCredits).toHaveBeenCalledWith("rg-1");
  });
});
