import { beforeEach, describe, expect, it, vi } from "vitest";
import pinkFloydPage1 from "../musicbrainz/__fixtures__/pink-floyd-release-group-browse-page1.json";
import pinkFloydPage2 from "../musicbrainz/__fixtures__/pink-floyd-release-group-browse-page2.json";
import pinkFloydPage3 from "../musicbrainz/__fixtures__/pink-floyd-release-group-browse-page3.json";
import losBunkersPage1 from "../musicbrainz/__fixtures__/los-bunkers-release-group-browse-page1.json";
import type { MBReleaseGroupBrowseResponse } from "../musicbrainz/types";
import type { ArtistRow, ReleaseGroupRow } from "@/db/schema";

// La base se mockea con cadenas que registran cada llamada y resuelven desde colas: se
// verifica la lógica de decisión (qué páginas se piden, qué se marca y qué se escribe),
// no el SQL, que cubre el smoke contra Postgres (scripts/smoke-test-artist-discography.ts).
const { state, db } = vi.hoisted(() => {
  type Call = [string, unknown[]];
  const state = {
    selects: [] as unknown[][],
    txSelects: [] as unknown[][],
    updateResults: [] as unknown[][],
    inserts: [] as Call[][],
    updates: [] as Call[][],
    execute: 0,
  };

  function chain(calls: Call[], next: () => unknown): unknown {
    const target: unknown = new Proxy(function () {}, {
      get(_t, prop) {
        if (prop === "then") {
          const result = Promise.resolve(next());
          return result.then.bind(result);
        }
        return (...args: unknown[]) => {
          calls.push([String(prop), args]);
          return target;
        };
      },
    });
    return target;
  }

  let insertCount = 0;
  const tx = {
    execute: async () => {
      state.execute += 1;
    },
    select: () => chain([], () => state.txSelects.shift() ?? []),
    update: (table: unknown) => {
      const calls: Call[] = [["table", [table]]];
      state.updates.push(calls);
      return chain(calls, () => state.updateResults.shift() ?? []);
    },
  };
  const db = {
    transaction: async (fn: (t: typeof tx) => unknown) => fn(tx),
    select: () => chain([], () => state.selects.shift() ?? []),
    insert: (table: unknown) => {
      const calls: Call[] = [["table", [table]]];
      state.inserts.push(calls);
      insertCount += 1;
      const id = `rg-${insertCount}`;
      return chain(calls, () => [{ id }]);
    },
  };
  return { state, db };
});

const mocks = vi.hoisted(() => ({
  browse: vi.fn(),
  after: vi.fn(),
  upsertArtistStub: vi.fn(async (mbid: string) => ({ id: `artist-${mbid}` })),
  hasStaleAlbumGenres: vi.fn(async () => true),
  syncAlbumGenreSeeds: vi.fn(async () => ({})),
}));

vi.mock("@/db", () => ({ db }));
vi.mock("next/server", () => ({ after: mocks.after }));
vi.mock("../musicbrainz/client", () => ({
  musicbrainz: { browseReleaseGroupsByArtist: mocks.browse },
  RELEASE_BROWSE_PAGE_SIZE: 100,
}));
vi.mock("./ingest-artist", () => ({ upsertArtistStub: mocks.upsertArtistStub }));
vi.mock("./ingest-release-group", () => ({ canonicalDateValues: () => ({}) }));
vi.mock("../genres/album-seeds", () => ({
  hasStaleAlbumGenres: mocks.hasStaleAlbumGenres,
  syncAlbumGenreSeeds: mocks.syncAlbumGenreSeeds,
}));

const {
  fetchDiscographyPages,
  findOrIngestDiscography,
  needsDiscographyRefresh,
  readArtistDiscography,
  syncArtistDiscography,
  DISCOGRAPHY_MAX_PAGES,
  DISCOGRAPHY_REFRESH_MS,
} = await import("./ingest-discography");
const { artist, releaseGroup } = await import("@/db/schema");

const PF1 = pinkFloydPage1 as MBReleaseGroupBrowseResponse;
const PF2 = pinkFloydPage2 as MBReleaseGroupBrowseResponse;
const PF3 = pinkFloydPage3 as MBReleaseGroupBrowseResponse;
const BUNKERS = losBunkersPage1 as MBReleaseGroupBrowseResponse;
const DAY = 24 * 60 * 60 * 1000;

function makeArtist(overrides: Partial<ArtistRow> = {}): ArtistRow {
  return {
    id: "artist-1",
    mbid: "e99f6d62-f62b-4e1e-8593-33d5696d85f0",
    type: "group",
    name: "Los Bunkers",
    disambiguation: null,
    photoUrl: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    discographySyncedAt: null,
    discographyCompleteAt: null,
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

function makeReleaseGroup(overrides: Partial<ReleaseGroupRow> = {}): ReleaseGroupRow {
  return {
    id: "rg-a",
    mbid: "mbid-a",
    title: "Álbum",
    category: "studio",
    coverThumbUrl: null,
    coverStorageKey: null,
    coverCheckedAt: null,
    coverBlockedAt: null,
    editionsSyncedAt: null,
    discographyUnlistedAt: null,
    primaryType: "Album",
    secondaryTypes: [],
    wikidataId: null,
    genresSyncedAt: null,
    firstReleaseDate: null,
    firstReleaseYear: 2001,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

/** Valores del `set` de cada update, en orden, con su tabla. */
function updateSets() {
  return state.updates.map((calls) => ({
    table: calls.find(([method]) => method === "table")?.[1][0],
    set: calls.find(([method]) => method === "set")?.[1][0] as Record<string, unknown>,
  }));
}

function releaseGroupInserts() {
  return state.inserts
    .filter((calls) => calls[0]?.[1][0] === releaseGroup)
    .map((calls) => calls.find(([method]) => method === "values")?.[1][0] as Record<string, unknown>);
}

beforeEach(() => {
  vi.clearAllMocks();
  state.selects = [];
  state.txSelects = [];
  state.updateResults = [];
  state.inserts = [];
  state.updates = [];
  state.execute = 0;
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("fetchDiscographyPages", () => {
  it("recorre las 3 páginas de un artista con 219 release-groups", async () => {
    mocks.browse.mockResolvedValueOnce(PF1).mockResolvedValueOnce(PF2).mockResolvedValueOnce(PF3);

    const result = await fetchDiscographyPages("pf");

    expect(mocks.browse.mock.calls.map(([, offset]) => offset)).toEqual([0, 100, 200]);
    expect(result).toMatchObject({ total: 219, complete: true, truncated: false });
    expect(result.releaseGroups).toHaveLength(219);
  });

  it("hace una sola request para un artista de una página", async () => {
    mocks.browse.mockResolvedValueOnce(BUNKERS);
    const result = await fetchDiscographyPages("bunkers");
    expect(mocks.browse).toHaveBeenCalledTimes(1);
    expect(result.complete).toBe(true);
  });

  it("con un límite menor que el total devuelve una discografía parcial, no truncada", async () => {
    mocks.browse.mockResolvedValue({ ...PF1, "release-group-count": 450 });
    const result = await fetchDiscographyPages("big", 3);
    expect(mocks.browse).toHaveBeenCalledTimes(3);
    expect(result).toMatchObject({ complete: false, truncated: false, total: 450 });
  });

  it("respeta el tope de 20 páginas y lo registra", async () => {
    mocks.browse.mockResolvedValue({ ...PF1, "release-group-count": 5000 });
    const result = await fetchDiscographyPages("huge");
    expect(mocks.browse).toHaveBeenCalledTimes(DISCOGRAPHY_MAX_PAGES);
    expect(result.truncated).toBe(true);
    expect(console.warn).toHaveBeenCalled();
  });

  it("corta si una página viene vacía", async () => {
    mocks.browse.mockResolvedValueOnce({ "release-group-count": 300, "release-groups": [] });
    const result = await fetchDiscographyPages("empty");
    expect(mocks.browse).toHaveBeenCalledTimes(1);
    expect(result.releaseGroups).toEqual([]);
  });
});

describe("syncArtistDiscography", () => {
  it("primera visita de un artista de una página: guarda tipos crudos, marca y fija la discografía completa", async () => {
    state.txSelects.push([makeArtist()]);
    state.updateResults.push([{ id: "bootleg" }], [{ id: "vuelto" }]);
    mocks.browse.mockResolvedValueOnce(BUNKERS);

    const result = await syncArtistDiscography("artist-1", { mode: "initial" });

    expect(result).toEqual({ status: "complete", saved: 18, total: 18, unlisted: 1, relisted: 1, truncated: false });
    expect(state.execute).toBe(1);
    const inserted = releaseGroupInserts();
    expect(inserted).toHaveLength(18);
    expect(inserted[0]).toMatchObject({ primaryType: expect.any(String), secondaryTypes: expect.any(Array) });

    const sets = updateSets();
    expect(sets.map((s) => s.table)).toEqual([releaseGroup, releaseGroup, artist]);
    expect(sets[0]!.set).toEqual({ discographyUnlistedAt: expect.any(Date) });
    expect(sets[1]!.set).toEqual({ discographyUnlistedAt: null });
    expect(sets[2]!.set).toEqual({ discographySyncedAt: expect.any(Date), discographyCompleteAt: expect.any(Date) });
  });

  it("guarda la entidad de Wikidata que declara MusicBrainz y la borra si dejó de declararla", async () => {
    const [first, second, ...rest] = BUNKERS["release-groups"];
    const withRelation = {
      ...first!,
      relations: [{ type: "wikidata", "target-type": "url", url: { resource: "https://www.wikidata.org/wiki/Q205458" } }],
    };
    const endedRelation = {
      ...second!,
      relations: [{ type: "wikidata", ended: true, url: { resource: "https://www.wikidata.org/wiki/Q1" } }],
    };
    state.txSelects.push([makeArtist()]);
    mocks.browse.mockResolvedValueOnce({ ...BUNKERS, "release-groups": [withRelation, endedRelation, ...rest] });

    await syncArtistDiscography("artist-1", { mode: "initial" });

    const inserted = releaseGroupInserts();
    expect(inserted[0]).toMatchObject({ wikidataId: "Q205458" });
    expect(inserted[1]).toMatchObject({ wikidataId: null });
    // El update en conflicto también escribe la entidad y reinicia la vigencia si cambió.
    const conflict = state.inserts[0]!.find(([method]) => method === "onConflictDoUpdate")?.[1][0] as {
      set: Record<string, unknown>;
    };
    expect(conflict.set).toMatchObject({ wikidataId: "Q205458" });
    expect(conflict.set).toHaveProperty("genresSyncedAt");
  });

  it("primera visita de un artista con más de 300: trae 3 páginas, guarda y no marca nada", async () => {
    state.txSelects.push([makeArtist()]);
    mocks.browse.mockResolvedValue({ ...PF1, "release-group-count": 450 });

    const result = await syncArtistDiscography("artist-1", { mode: "initial" });

    expect(result).toEqual({ status: "partial", saved: 300, total: 450 });
    expect(mocks.browse).toHaveBeenCalledTimes(3);
    const sets = updateSets();
    expect(sets).toHaveLength(1);
    expect(sets[0]).toEqual({ table: artist, set: { discographySyncedAt: expect.any(Date) } });
  });

  it("con el tope alcanzado fija la discografía completa sin marcar nada", async () => {
    state.txSelects.push([makeArtist()]);
    mocks.browse.mockResolvedValue({ ...PF1, "release-group-count": 5000 });

    const result = await syncArtistDiscography("artist-1", { mode: "full" });

    expect(result).toMatchObject({ status: "complete", truncated: true, unlisted: 0, relisted: 0 });
    const sets = updateSets();
    expect(sets.map((s) => s.table)).toEqual([artist]);
  });

  it("la primera visita se omite si otra ya sincronizó (candado + relectura)", async () => {
    state.txSelects.push([makeArtist({ discographySyncedAt: new Date() })]);
    const result = await syncArtistDiscography("artist-1", { mode: "initial" });
    expect(result).toEqual({ status: "skipped" });
    expect(state.execute).toBe(1);
    expect(mocks.browse).not.toHaveBeenCalled();
  });

  it("la sincronización completa se omite si la discografía está al día", async () => {
    const fresh = new Date(Date.now() - DAY);
    state.txSelects.push([makeArtist({ discographySyncedAt: fresh, discographyCompleteAt: fresh })]);
    const result = await syncArtistDiscography("artist-1", { mode: "full" });
    expect(result).toEqual({ status: "skipped" });
    expect(mocks.browse).not.toHaveBeenCalled();
  });

  it("la sincronización completa corre si la discografía tiene más de 7 días", async () => {
    const stale = new Date(Date.now() - 8 * DAY);
    state.txSelects.push([makeArtist({ discographySyncedAt: stale, discographyCompleteAt: stale })]);
    mocks.browse.mockResolvedValueOnce(BUNKERS);
    const result = await syncArtistDiscography("artist-1", { mode: "full" });
    expect(result.status).toBe("complete");
  });

  it("un artista sin MBID se omite", async () => {
    state.txSelects.push([makeArtist({ mbid: null })]);
    expect(await syncArtistDiscography("artist-1", { mode: "full" })).toEqual({ status: "skipped" });
  });

  it("en simulación calcula las marcas sin escribir", async () => {
    const returnedMbid = BUNKERS["release-groups"][0]!.id;
    state.txSelects.push(
      [makeArtist()],
      [
        { mbid: "bootleg-mbid", unlistedAt: null },
        { mbid: returnedMbid, unlistedAt: new Date() },
        { mbid: "ya-marcado", unlistedAt: new Date() },
      ],
    );
    mocks.browse.mockResolvedValueOnce(BUNKERS);

    const result = await syncArtistDiscography("artist-1", { mode: "full", dryRun: true });

    expect(result).toEqual({ status: "complete", saved: 18, total: 18, unlisted: 1, relisted: 1, truncated: false });
    expect(state.inserts).toHaveLength(0);
    expect(state.updates).toHaveLength(0);
  });
});

describe("readArtistDiscography", () => {
  it("devuelve una fila por release-group, con el crédito principal si el artista figura dos veces", async () => {
    state.selects.push([
      { releaseGroup: makeReleaseGroup({ id: "rg-1" }), role: "featured" },
      { releaseGroup: makeReleaseGroup({ id: "rg-1" }), role: "primary" },
      { releaseGroup: makeReleaseGroup({ id: "rg-2" }), role: "featured" },
    ]);

    const rows = await readArtistDiscography("artist-1");

    expect(rows.map((r) => [r.id, r.creditRole])).toEqual([
      ["rg-1", "primary"],
      ["rg-2", "featured"],
    ]);
  });
});

describe("findOrIngestDiscography", () => {
  it("con discografía guardada y vencida responde desde la base y programa la resincronización", async () => {
    const stale = new Date(Date.now() - 8 * DAY);
    state.selects.push([{ releaseGroup: makeReleaseGroup(), role: "primary" }]);

    const rows = await findOrIngestDiscography(makeArtist({ discographySyncedAt: stale, discographyCompleteAt: stale }));

    expect(rows).toHaveLength(1);
    expect(mocks.browse).not.toHaveBeenCalled();
    expect(mocks.after).toHaveBeenCalledTimes(1);
  });

  it("con discografía de la ingesta anterior (sin marca de completa) también programa la sincronización", async () => {
    state.selects.push([]);
    await findOrIngestDiscography(makeArtist({ discographySyncedAt: new Date() }));
    expect(mocks.after).toHaveBeenCalledTimes(1);
  });

  it("con discografía al día solo programa los géneros de los álbumes vencidos", async () => {
    const fresh = new Date(Date.now() - DAY);
    state.selects.push([]);
    await findOrIngestDiscography(makeArtist({ discographySyncedAt: fresh, discographyCompleteAt: fresh }));
    expect(mocks.after).toHaveBeenCalledTimes(1);

    await (mocks.after.mock.calls[0]![0] as () => Promise<void>)();
    expect(mocks.browse).not.toHaveBeenCalled();
    expect(mocks.syncAlbumGenreSeeds).toHaveBeenCalledWith("artist-1");
  });

  it("sin álbumes vencidos no consulta Wikidata", async () => {
    const fresh = new Date(Date.now() - DAY);
    state.selects.push([]);
    mocks.hasStaleAlbumGenres.mockResolvedValueOnce(false);
    await findOrIngestDiscography(makeArtist({ discographySyncedAt: fresh, discographyCompleteAt: fresh }));

    await (mocks.after.mock.calls[0]![0] as () => Promise<void>)();
    expect(mocks.syncAlbumGenreSeeds).not.toHaveBeenCalled();
  });

  it("fuera de una request de Next omite la sincronización en segundo plano sin fallar", async () => {
    mocks.after.mockImplementationOnce(() => {
      throw new Error("`after` was called outside a request scope");
    });
    state.selects.push([]);
    await expect(findOrIngestDiscography(makeArtist({ discographySyncedAt: new Date() }))).resolves.toEqual([]);
    expect(console.warn).toHaveBeenCalled();
  });

  it("primera visita parcial: guarda las páginas iniciales y programa el resto", async () => {
    state.txSelects.push([makeArtist()]);
    state.selects.push([]);
    mocks.browse.mockResolvedValue({ ...PF1, "release-group-count": 450 });

    await findOrIngestDiscography(makeArtist());

    expect(mocks.browse).toHaveBeenCalledTimes(3);
    expect(mocks.after).toHaveBeenCalledTimes(1);
  });

  it("primera visita completa: no programa más discografía, solo los géneros de sus álbumes", async () => {
    state.txSelects.push([makeArtist()]);
    state.selects.push([]);
    mocks.browse.mockResolvedValueOnce(BUNKERS);

    await findOrIngestDiscography(makeArtist());

    expect(mocks.after).toHaveBeenCalledTimes(1);
    await (mocks.after.mock.calls[0]![0] as () => Promise<void>)();
    expect(mocks.browse).toHaveBeenCalledTimes(1);
    expect(mocks.syncAlbumGenreSeeds).toHaveBeenCalledWith("artist-1");
  });

  it("la tarea programada ejecuta la sincronización completa y después la de géneros", async () => {
    const stale = new Date(Date.now() - 8 * DAY);
    state.selects.push([]);
    await findOrIngestDiscography(makeArtist({ discographySyncedAt: stale, discographyCompleteAt: stale }));

    state.txSelects.push([makeArtist({ discographySyncedAt: stale, discographyCompleteAt: stale })]);
    mocks.browse.mockResolvedValueOnce(BUNKERS);
    const task = mocks.after.mock.calls[0]![0] as () => Promise<void>;
    await task();

    expect(mocks.browse).toHaveBeenCalledTimes(1);
    expect(mocks.syncAlbumGenreSeeds).toHaveBeenCalledWith("artist-1");
    expect(mocks.browse.mock.invocationCallOrder[0]!).toBeLessThan(mocks.syncAlbumGenreSeeds.mock.invocationCallOrder[0]!);
  });

  it("un fallo de los géneros no rompe la tarea en segundo plano", async () => {
    const fresh = new Date(Date.now() - DAY);
    state.selects.push([]);
    mocks.syncAlbumGenreSeeds.mockRejectedValueOnce(new Error("Wikidata caído"));
    await findOrIngestDiscography(makeArtist({ discographySyncedAt: fresh, discographyCompleteAt: fresh }));

    await expect((mocks.after.mock.calls[0]![0] as () => Promise<void>)()).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });
});

describe("needsDiscographyRefresh", () => {
  it("sin marca de completa o con más de 7 días, sí; al día, no", () => {
    const now = Date.now();
    expect(needsDiscographyRefresh({ discographyCompleteAt: null }, now)).toBe(true);
    expect(needsDiscographyRefresh({ discographyCompleteAt: new Date(now - DISCOGRAPHY_REFRESH_MS - 1) }, now)).toBe(true);
    expect(needsDiscographyRefresh({ discographyCompleteAt: new Date(now - DAY) }, now)).toBe(false);
  });
});
