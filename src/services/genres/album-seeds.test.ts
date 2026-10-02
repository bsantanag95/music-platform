import { beforeEach, describe, expect, it, vi } from "vitest";

// Base mockeada que registra escrituras; Wikidata y el reemplazo de semillas también son mocks.
// El SQL real lo cubre scripts/smoke-test-genres.ts.
const state = vi.hoisted(() => ({
  albums: [] as { id: string; wikidataId: string | null }[],
  deletes: 0,
  syncUpdates: [] as string[],
}));
const mocks = vi.hoisted(() => ({ getEntities: vi.fn(), replace: vi.fn() }));

vi.mock("@/db", () => {
  const tx = {
    execute: async () => undefined,
    selectDistinct: () => ({ from: () => ({ innerJoin: () => ({ where: async () => state.albums }) }) }),
    delete: () => ({
      where: async () => {
        state.deletes++;
      },
    }),
    update: () => ({
      set: () => ({
        where: async () => {
          state.syncUpdates.push("genres_synced_at");
        },
      }),
    }),
    transaction: async (fn: (t: unknown) => unknown) => fn(tx),
  };
  return { db: { transaction: async (fn: (t: typeof tx) => unknown) => fn(tx) } };
});
vi.mock("../wikimedia/client", () => ({ wikimedia: { getEntities: mocks.getEntities } }));
vi.mock("./seeds", () => ({ replaceReleaseGroupGenreSeeds: mocks.replace }));

const { syncAlbumGenreSeeds, WIKIDATA_BATCH_SIZE } = await import("./album-seeds");

const genreClaim = (id: string) => ({ mainsnak: { datavalue: { value: { id } } }, rank: "normal" });

/** Wikidata responde a cada QID con un género derivado de su número (Q1 → Q1-genre). */
function entitiesWithGenres() {
  mocks.getEntities.mockImplementation(async (ids: string[]) => ({
    entities: Object.fromEntries(ids.map((id) => [id, { id, claims: { P136: [genreClaim(`${id}-genre`)] } }])),
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
  state.albums = [];
  state.deletes = 0;
  state.syncUpdates = [];
  mocks.replace.mockImplementation(async (_tx: unknown, _id: string, qids: string[]) => qids.length);
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("syncAlbumGenreSeeds", () => {
  it("pide las entidades en lotes de 50 y guarda los géneros de cada álbum", async () => {
    state.albums = Array.from({ length: 80 }, (_, i) => ({ id: `rg-${i}`, wikidataId: `Q${i + 1}` }));
    entitiesWithGenres();

    const result = await syncAlbumGenreSeeds("artist-1");

    expect(WIKIDATA_BATCH_SIZE).toBe(50);
    expect(mocks.getEntities).toHaveBeenCalledTimes(2);
    expect(mocks.getEntities.mock.calls[0]![0]).toHaveLength(50);
    expect(mocks.getEntities.mock.calls[0]![1]).toEqual(["claims"]);
    expect(mocks.replace).toHaveBeenCalledWith(expect.anything(), "rg-0", ["Q1-genre"]);
    expect(result).toEqual({ albums: 80, withoutEntity: 0, seeded: 80, requests: 2, failedBatches: 0 });
    expect(state.syncUpdates).toHaveLength(2); // un update de vigencia por lote
  });

  it("un álbum sin entidad de Wikidata queda sincronizado sin semillas y no se consulta", async () => {
    state.albums = [{ id: "rg-1", wikidataId: null }];

    const result = await syncAlbumGenreSeeds("artist-1");

    expect(mocks.getEntities).not.toHaveBeenCalled();
    expect(state.deletes).toBe(1);
    expect(state.syncUpdates).toHaveLength(1);
    expect(result).toMatchObject({ albums: 1, withoutEntity: 1, seeded: 0, requests: 0 });
  });

  it("una entidad borrada en Wikidata cuenta como sin géneros", async () => {
    state.albums = [{ id: "rg-1", wikidataId: "Q9" }];
    mocks.getEntities.mockResolvedValue({ entities: { Q9: { id: "Q9", missing: "" } } });

    await syncAlbumGenreSeeds("artist-1");

    expect(mocks.replace).toHaveBeenCalledWith(expect.anything(), "rg-1", []);
  });

  it("un lote que falla no marca sus álbumes y el resto sigue", async () => {
    state.albums = Array.from({ length: 60 }, (_, i) => ({ id: `rg-${i}`, wikidataId: `Q${i + 1}` }));
    entitiesWithGenres();
    mocks.getEntities.mockRejectedValueOnce(new Error("Wikidata caído"));

    const result = await syncAlbumGenreSeeds("artist-1");

    expect(result).toMatchObject({ requests: 2, failedBatches: 1, seeded: 10 });
    expect(state.syncUpdates).toHaveLength(1); // solo el segundo lote
    expect(console.warn).toHaveBeenCalled();
  });

  it("en simulación consulta y cuenta, pero no escribe", async () => {
    state.albums = [
      { id: "rg-1", wikidataId: "Q1" },
      { id: "rg-2", wikidataId: null },
    ];
    entitiesWithGenres();

    const result = await syncAlbumGenreSeeds("artist-1", { dryRun: true });

    expect(result).toMatchObject({ albums: 2, withoutEntity: 1, seeded: 1, requests: 1 });
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(state.deletes).toBe(0);
    expect(state.syncUpdates).toHaveLength(0);
  });
});
