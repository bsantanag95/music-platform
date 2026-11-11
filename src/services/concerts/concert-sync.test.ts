import { beforeEach, describe, expect, it, vi } from "vitest";
import { CONCERTS_REFRESH_MS, ensureArtistConcerts, syncArtistConcerts } from "./concert-sync";

// Orquestación de la sincronización de conciertos (openspec: add-shared-concerts-phase1): primera página sincrónica, el
// resto con `after()`, refresco de 30 días, marca solo con recorrido completo y fallos que no rompen la pestaña. La base
// se simula con una cadena que siempre resuelve; el SQL real lo verifica scripts/smoke-test-shared-concerts.ts.

const mocks = vi.hoisted(() => ({
  browse: vi.fn(),
  scheduled: [] as (() => Promise<unknown>)[],
  marks: 0,
}));

// La fusión con conciertos de la comunidad (Fase 2) la verifica scripts/smoke-test-community-concerts.ts.
vi.mock("./merge", () => ({ mergeCommunityDuplicatesInto: vi.fn().mockResolvedValue(0) }));
vi.mock("next/server", () => ({ after: (task: () => Promise<unknown>) => mocks.scheduled.push(task) }));
vi.mock("@/services/musicbrainz/client", () => ({
  RELEASE_BROWSE_PAGE_SIZE: 100,
  musicbrainz: { browseEventsByArtist: mocks.browse },
}));

function chain(): unknown {
  const proxy: Record<string, unknown> = {};
  for (const method of ["from", "where", "values", "onConflictDoUpdate", "returning", "innerJoin", "orderBy", "limit"]) {
    proxy[method] = () => proxy;
  }
  proxy.set = (values: Record<string, unknown>) => {
    if ("concertsSyncedAt" in values) mocks.marks += 1;
    return proxy;
  };
  proxy.then = (resolve: (value: unknown) => unknown) => resolve([{ id: "c1" }]);
  return proxy;
}

vi.mock("@/db", () => ({
  db: {
    select: () => chain(),
    insert: () => chain(),
    update: () => chain(),
    delete: () => chain(),
    transaction: async (cb: (tx: unknown) => Promise<unknown>) => cb({ insert: () => chain(), delete: () => chain() }),
  },
}));

const ARTIST = { id: "a1", mbid: "00000000-0000-4000-8000-0000000000a1" };
const concertEvent = (n: number) => ({ id: `e${n}`, name: `Concierto ${n}`, type: "Concert", "life-span": { begin: "2019-01-01" }, relations: [] });
const pageOf = (total: number, size: number) => ({ "event-count": total, events: Array.from({ length: size }, (_, i) => concertEvent(i)) });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.scheduled = [];
  mocks.marks = 0;
});

describe("ensureArtistConcerts", () => {
  it("primera visita con todo en una página: importa y marca, sin trabajo en segundo plano", async () => {
    mocks.browse.mockResolvedValue(pageOf(2, 2));
    await ensureArtistConcerts({ ...ARTIST, concertsSyncedAt: null });
    expect(mocks.browse).toHaveBeenCalledWith(ARTIST.mbid, 0);
    expect(mocks.marks).toBe(1);
    expect(mocks.scheduled).toHaveLength(0);
  });

  it("primera visita con más páginas: la primera ya, el resto después, y marca al terminar", async () => {
    mocks.browse.mockImplementation(async (_mbid: string, offset: number) => pageOf(250, offset >= 200 ? 50 : 100));
    await ensureArtistConcerts({ ...ARTIST, concertsSyncedAt: null });
    expect(mocks.browse).toHaveBeenCalledTimes(1);
    expect(mocks.marks).toBe(0);
    expect(mocks.scheduled).toHaveLength(1);
    await mocks.scheduled[0]!();
    expect(mocks.browse.mock.calls.map((call) => call[1])).toEqual([0, 100, 200]);
    expect(mocks.marks).toBe(1);
  });

  it("MusicBrainz caído en la primera visita: no rompe ni marca", async () => {
    mocks.browse.mockRejectedValue(new Error("MusicBrainz respondió 503"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(ensureArtistConcerts({ ...ARTIST, concertsSyncedAt: null })).resolves.toBeUndefined();
    expect(mocks.marks).toBe(0);
  });

  it("sincronizado hace poco: no consulta; vencido: refresca en segundo plano", async () => {
    const now = new Date("2026-11-11T00:00:00Z");
    await ensureArtistConcerts({ ...ARTIST, concertsSyncedAt: new Date(now.getTime() - 1000) }, now);
    expect(mocks.browse).not.toHaveBeenCalled();
    expect(mocks.scheduled).toHaveLength(0);
    await ensureArtistConcerts({ ...ARTIST, concertsSyncedAt: new Date(now.getTime() - CONCERTS_REFRESH_MS - 1) }, now);
    expect(mocks.browse).not.toHaveBeenCalled();
    expect(mocks.scheduled).toHaveLength(1);
  });

  it("sin mbid no hace nada", async () => {
    await ensureArtistConcerts({ id: "a2", mbid: null, concertsSyncedAt: null });
    expect(mocks.browse).not.toHaveBeenCalled();
  });
});

describe("syncArtistConcerts", () => {
  it("un recorrido interrumpido no marca el artista", async () => {
    mocks.browse.mockResolvedValueOnce(pageOf(250, 100)).mockRejectedValueOnce(new Error("timeout"));
    await expect(syncArtistConcerts({ ...ARTIST, concertsSyncedAt: null })).rejects.toThrow("timeout");
    expect(mocks.marks).toBe(0);
  });

  it("se detiene en el tope de 1.000 eventos", async () => {
    mocks.browse.mockResolvedValue(pageOf(5000, 100));
    await syncArtistConcerts({ ...ARTIST, concertsSyncedAt: null });
    expect(mocks.browse).toHaveBeenCalledTimes(10);
    expect(mocks.marks).toBe(1);
  });
});
