import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
import { getAlbumFavorites, replaceAlbumFavorites } from "./album-favorites";

const rowsByTable: Record<string, unknown[]> = {};

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  transaction: vi.fn(),
  insert: vi.fn(),
  deleteFn: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    select: mocks.select,
    transaction: mocks.transaction,
    insert: mocks.insert,
    delete: mocks.deleteFn,
  },
}));
vi.mock("@/services/feed/feed", () => ({ PRIMARY_ARTIST_SQL: () => ({}) }));

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
  mocks.transaction.mockImplementation(async (cb: (tx: unknown) => unknown) =>
    cb({
      delete: () => ({ where: async () => undefined }),
      insert: () => ({ values: async () => undefined }),
    }),
  );
});

describe("getAlbumFavorites", () => {
  it("devuelve lista vacía sin audiencias visibles", async () => {
    await expect(getAlbumFavorites("u1", [])).resolves.toEqual([]);
  });

  it("mapea el join a la forma de la sección, ordenado por la query", async () => {
    rowsByTable.user_album_pin = [
      { id: "p1", favoriteId: "f1", position: 1, releaseGroupId: "rg1", title: "OK Computer", coverThumbUrl: "c1", artistName: "Radiohead" },
      { id: "p2", favoriteId: "f2", position: 2, releaseGroupId: "rg2", title: "In Rainbows", coverThumbUrl: null, artistName: "Radiohead" },
    ];
    const result = await getAlbumFavorites("u1", ["public"]);
    expect(result).toEqual([
      { id: "p1", favoriteId: "f1", position: 1, target: { id: "rg1", title: "OK Computer", artistName: "Radiohead", coverThumbUrl: "c1" } },
      { id: "p2", favoriteId: "f2", position: 2, target: { id: "rg2", title: "In Rainbows", artistName: "Radiohead", coverThumbUrl: null } },
    ]);
  });
});

describe("replaceAlbumFavorites", () => {
  it("rechaza más de 6", async () => {
    await expectCode(
      replaceAlbumFavorites("u1", Array.from({ length: 7 }, (_, i) => `f${i}`)),
      "VALIDATION_ERROR",
    );
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rechaza ids duplicados", async () => {
    await expectCode(replaceAlbumFavorites("u1", ["f1", "f1"]), "VALIDATION_ERROR");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rechaza si algún id no es un favorito de álbum propio", async () => {
    rowsByTable.favorite = [{ id: "f1" }]; // se pidieron f1 y f2, solo f1 valida
    await expectCode(replaceAlbumFavorites("u1", ["f1", "f2"]), "VALIDATION_ERROR");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("reemplaza el conjunto cuando todos los ids validan", async () => {
    rowsByTable.favorite = [{ id: "f1" }, { id: "f2" }];
    rowsByTable.user_album_pin = [];
    await replaceAlbumFavorites("u1", ["f2", "f1"]);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
  });

  it("un conjunto vacío se acepta y limpia (sin validar favoritos)", async () => {
    rowsByTable.user_album_pin = [];
    await replaceAlbumFavorites("u1", []);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
  });
});
