import { beforeEach, describe, expect, it, vi } from "vitest";
import kuervos from "../musicbrainz/__fixtures__/kuervos-del-sur-artist-with-relations.json";

const state = vi.hoisted(() => ({
  current: null as Record<string, unknown> | null,
  updates: [] as Record<string, unknown>[],
  deletes: 0,
  inserts: [] as unknown[],
  execute: 0,
}));
const mocks = vi.hoisted(() => ({ getArtistWithRelations: vi.fn() }));

vi.mock("@/db", () => {
  const tx = {
    execute: async () => {
      state.execute += 1;
    },
    select: () => ({ from: () => ({ where: () => ({ limit: async () => (state.current ? [state.current] : []) }) }) }),
    update: () => ({
      set: (values: Record<string, unknown>) => ({
        where: async () => {
          state.updates.push(values);
        },
      }),
    }),
    delete: () => ({
      where: async () => {
        state.deletes += 1;
      },
    }),
    insert: () => ({
      values: async (values: unknown) => {
        state.inserts.push(values);
      },
    }),
  };
  return { db: { transaction: async (fn: (t: typeof tx) => unknown) => fn(tx) } };
});
vi.mock("../musicbrainz/client", () => ({ musicbrainz: { getArtistWithRelations: mocks.getArtistWithRelations } }));

const { syncArtistProfileFacts, needsProfileRefresh, isStale, ARTIST_PROFILE_REFRESH_MS } = await import("./artist-profile");

const DAY = 24 * 60 * 60 * 1000;

beforeEach(() => {
  vi.clearAllMocks();
  state.current = { id: "a1", mbid: "b97abf8a-6b72-43eb-8f0f-8ce210fce812", profileSyncedAt: null };
  state.updates = [];
  state.deletes = 0;
  state.inserts = [];
  state.execute = 0;
  mocks.getArtistWithRelations.mockResolvedValue(kuervos);
});

describe("syncArtistProfileFacts", () => {
  it("con la ficha pendiente pide el artista, guarda la ficha y reemplaza los enlaces", async () => {
    const result = await syncArtistProfileFacts("a1");

    expect(state.execute).toBe(1);
    expect(mocks.getArtistWithRelations).toHaveBeenCalledTimes(1);
    expect(result.status).toBe("synced");
    expect(state.updates[0]).toMatchObject({ country: "CL", lifeBegin: "2003", wikidataId: "Q63565567", profileSyncedAt: expect.any(Date) });
    expect(state.deletes).toBe(1);
    expect(state.inserts[0]).toEqual([
      expect.objectContaining({ artistId: "a1", kind: "bandcamp", position: 0 }),
      expect.objectContaining({ artistId: "a1", kind: "streaming", position: 1 }),
    ]);
  });

  it("con la ficha al día no llama a MusicBrainz, salvo que se fuerce", async () => {
    state.current = { ...state.current, profileSyncedAt: new Date(Date.now() - DAY) };
    expect(await syncArtistProfileFacts("a1")).toEqual({ status: "skipped" });
    expect(mocks.getArtistWithRelations).not.toHaveBeenCalled();

    expect((await syncArtistProfileFacts("a1", { force: true })).status).toBe("synced");
  });

  it("un stub toma su tipo real de la misma respuesta", async () => {
    state.current = { ...state.current, type: "unknown" };
    await syncArtistProfileFacts("a1");
    expect(state.updates).toContainEqual({ type: "group" });
    expect(mocks.getArtistWithRelations).toHaveBeenCalledTimes(1);
  });

  it("en simulación no escribe", async () => {
    await syncArtistProfileFacts("a1", { dryRun: true });
    expect(state.updates).toHaveLength(0);
    expect(state.inserts).toHaveLength(0);
  });

  it("un artista sin MBID se omite", async () => {
    state.current = { ...state.current, mbid: null };
    expect(await syncArtistProfileFacts("a1")).toEqual({ status: "skipped" });
  });
});

describe("vigencia", () => {
  it("isStale y needsProfileRefresh con 30 días", () => {
    const now = Date.now();
    expect(isStale(null, now)).toBe(true);
    expect(isStale(new Date(now - ARTIST_PROFILE_REFRESH_MS - 1), now)).toBe(true);
    expect(isStale(new Date(now - DAY), now)).toBe(false);
    const fresh = new Date();
    expect(needsProfileRefresh({ mbid: "m", profileSyncedAt: fresh, wikimediaSyncedAt: fresh })).toBe(false);
    expect(needsProfileRefresh({ mbid: "m", profileSyncedAt: fresh, wikimediaSyncedAt: null })).toBe(true);
    expect(needsProfileRefresh({ mbid: null, profileSyncedAt: null, wikimediaSyncedAt: null })).toBe(false);
  });
});
