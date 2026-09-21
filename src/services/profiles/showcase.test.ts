import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
import {
  clearDefiningEntity,
  getShowcase,
  replacePinned,
  setAnthem,
  setDefiningEntity,
} from "./showcase";

// Mock de db agnóstico a la forma de la cadena, keyed por tabla (mismo patrón
// que stats.test.ts).
const rowsByTable: Record<string, unknown[]> = {};

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  transaction: vi.fn(),
  insert: vi.fn(),
  deleteFn: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    select: mocks.select,
    transaction: mocks.transaction,
    insert: mocks.insert,
    delete: mocks.deleteFn,
    update: mocks.update,
  },
}));
vi.mock("@/services/feed/feed", () => ({ PRIMARY_ARTIST_SQL: () => ({}), RECORDING_COVER_SQL: () => ({}) }));

function chainFor() {
  let table = "";
  const resolved = () => Promise.resolve(rowsByTable[table] ?? []);
  const step: unknown = new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === "from") {
          return (t: unknown) => {
            table = getTableName(t as Parameters<typeof getTableName>[0]);
            return step;
          };
        }
        if (prop === "then") return resolved().then.bind(resolved());
        if (prop === "catch") return resolved().catch.bind(resolved());
        if (prop === "finally") return resolved().finally.bind(resolved());
        return () => step;
      },
    },
  );
  return step;
}

async function expectCode(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({ code });
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(rowsByTable)) delete rowsByTable[key];
  mocks.select.mockImplementation(() => chainFor());
});

describe("replacePinned", () => {
  it("rechaza más de 4 destacados", async () => {
    const items = Array.from({ length: 5 }, (_, i) => ({
      type: "artist" as const,
      id: `a${i}`,
    }));
    await expectCode(replacePinned("u1", items), "VALIDATION_ERROR");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rechaza una nota de más de 120 caracteres", async () => {
    await expectCode(
      replacePinned("u1", [{ type: "release-group", id: "rg1", note: "x".repeat(121) }]),
      "VALIDATION_ERROR",
    );
  });

  it("traduce una violación de FK a VALIDATION_ERROR", async () => {
    mocks.transaction.mockRejectedValue({ code: "23503" });
    await expectCode(
      replacePinned("u1", [{ type: "artist", id: "no-existe" }]),
      "VALIDATION_ERROR",
    );
  });

  it("borra y vuelve a insertar en el orden dado, sin ningún marcador 'me define' (vive en user_showcase, no acá)", async () => {
    const insertValues = vi.fn().mockResolvedValue(undefined);
    const tx = {
      delete: () => ({ where: () => Promise.resolve(undefined) }),
      insert: () => ({ values: insertValues }),
    };
    mocks.transaction.mockImplementation(async (cb: (tx: unknown) => unknown) => cb(tx));
    rowsByTable.user_pinned_item = [];
    rowsByTable.user_showcase = [];

    await replacePinned("u1", [
      { type: "artist", id: "a1" },
      { type: "release-group", id: "rg1", note: "great" },
    ]);

    expect(insertValues).toHaveBeenCalledWith([
      { userId: "u1", artistId: "a1", releaseGroupId: null, recordingId: null, note: null, position: 0 },
      { userId: "u1", artistId: null, releaseGroupId: "rg1", recordingId: null, note: "great", position: 1 },
    ]);
  });
});

describe("setDefiningEntity / clearDefiningEntity", () => {
  it("marca un artista como definitorio: insert-or-update sobre user_showcase.defining_artist_id", async () => {
    const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
    const values = vi.fn(() => ({ onConflictDoUpdate }));
    mocks.insert.mockReturnValue({ values });

    await setDefiningEntity("u1", "artist", "a1");

    expect(values).toHaveBeenCalledWith({ userId: "u1", definingArtistId: "a1" });
    expect(onConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ set: { definingArtistId: "a1" } }),
    );
  });

  it("marca un álbum como definitorio: insert-or-update sobre user_showcase.defining_release_group_id", async () => {
    const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
    const values = vi.fn(() => ({ onConflictDoUpdate }));
    mocks.insert.mockReturnValue({ values });

    await setDefiningEntity("u1", "release-group", "rg1");

    expect(values).toHaveBeenCalledWith({ userId: "u1", definingReleaseGroupId: "rg1" });
    expect(onConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ set: { definingReleaseGroupId: "rg1" } }),
    );
  });

  it("no requiere que la entidad sea un destacado o un favorito — solo que exista (FK inválida → VALIDATION_ERROR)", async () => {
    const onConflictDoUpdate = vi.fn().mockRejectedValue({ code: "23503" });
    mocks.insert.mockReturnValue({ values: () => ({ onConflictDoUpdate }) });
    await expectCode(setDefiningEntity("u1", "artist", "no-existe"), "VALIDATION_ERROR");
  });

  it("clearDefiningEntity limpia la columna del tipo dado, idempotente", async () => {
    const set = vi.fn(() => ({ where: () => Promise.resolve(undefined) }));
    mocks.update.mockReturnValue({ set });

    await clearDefiningEntity("u1", "release-group");

    expect(set).toHaveBeenCalledWith({ definingReleaseGroupId: null });
  });
});

describe("getShowcase", () => {
  it("omite los destacados cuya entidad ya no existe", async () => {
    rowsByTable.user_pinned_item = [
      {
        id: "p1",
        note: null,
        position: 0,
        artistId: "a1",
        releaseGroupId: null,
        recordingId: null,
        artistName: "Slowdive",
      },
      {
        id: "p2",
        note: null,
        position: 1,
        artistId: "a2",
        releaseGroupId: null,
        recordingId: null,
        artistName: null, // entidad borrada
      },
    ];
    rowsByTable.user_showcase = [];

    const showcase = await getShowcase("u1");
    expect(showcase.pinned).toHaveLength(1);
    expect(showcase.pinned[0]!.entity.title).toBe("Slowdive");
    expect(showcase.identityCard.anthem).toBeNull();
  });

  it("resuelve el artista definitorio como referencia directa de user_showcase, no como un destacado", async () => {
    rowsByTable.user_pinned_item = [];
    rowsByTable.user_showcase = [
      { anthemRecordingId: null, definingArtistId: "a9", definingReleaseGroupId: null },
    ];
    rowsByTable.artist = [{ name: "Boygenius" }];

    const showcase = await getShowcase("u1");

    expect(showcase.identityCard.artist).toMatchObject({ type: "artist", id: "a9", title: "Boygenius" });
    expect(showcase.identityCard.album).toBeNull();
  });

  it("resuelve el álbum definitorio con carátula y artista acreditado", async () => {
    rowsByTable.user_pinned_item = [];
    rowsByTable.user_showcase = [
      { anthemRecordingId: null, definingArtistId: null, definingReleaseGroupId: "rg9" },
    ];
    rowsByTable.release_group = [
      { title: "Norman Fucking Rockwell!", coverThumbUrl: "https://cover/nfr.jpg", creditedArtist: "Lana Del Rey" },
    ];

    const showcase = await getShowcase("u1");

    expect(showcase.identityCard.album).toEqual({
      type: "release-group",
      id: "rg9",
      title: "Norman Fucking Rockwell!",
      artistName: "Lana Del Rey",
      coverThumbUrl: "https://cover/nfr.jpg",
    });
  });

  it("un álbum definitorio no depende de que también sea un destacado o un favorito de álbum", async () => {
    // Sin ninguna fila en user_pinned_item: el definitorio se resuelve igual.
    rowsByTable.user_pinned_item = [];
    rowsByTable.user_showcase = [
      { anthemRecordingId: null, definingArtistId: null, definingReleaseGroupId: "rg9" },
    ];
    rowsByTable.release_group = [{ title: "Short n' Sweet", coverThumbUrl: null, creditedArtist: "Sabrina Carpenter" }];

    const showcase = await getShowcase("u1");

    expect(showcase.pinned).toHaveLength(0);
    expect(showcase.identityCard.album?.title).toBe("Short n' Sweet");
  });
});

describe("setAnthem", () => {
  it("traduce una FK inválida a VALIDATION_ERROR", async () => {
    const onConflictDoUpdate = vi.fn().mockRejectedValue({ code: "23503" });
    mocks.insert.mockReturnValue({ values: () => ({ onConflictDoUpdate }) });
    await expectCode(setAnthem("u1", "no-existe"), "VALIDATION_ERROR");
  });

  it("no lee escuchas (himno independiente de la última escucha)", async () => {
    const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
    mocks.insert.mockReturnValue({ values: () => ({ onConflictDoUpdate }) });
    await setAnthem("u1", "rec1");
    expect(mocks.select).not.toHaveBeenCalled();
  });
});
