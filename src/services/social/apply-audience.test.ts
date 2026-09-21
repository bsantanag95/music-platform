import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyAudienceToExisting, previewApplyAudience } from "./apply-audience";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  update: vi.fn(),
  execute: vi.fn(),
  transaction: vi.fn(),
  set: vi.fn(),
  // Resultados por orden de llamada.
  selectResults: [] as unknown[][],
  updateResults: [] as unknown[],
  calls: [] as string[],
}));

vi.mock("@/db", () => ({
  db: { select: mocks.select, update: mocks.update, transaction: mocks.transaction },
}));

// db.select().from().[innerJoin()].where() → [{ n }]
function queueCounts(...counts: number[]) {
  mocks.selectResults = counts.map((n) => [{ n }]);
}

// tx.update(t).set(v).where().returning() → filas, en el orden en que se llaman.
function queueUpdates(...results: unknown[]) {
  mocks.updateResults = results;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.calls = [];
  mocks.selectResults = [];
  mocks.updateResults = [];

  mocks.select.mockImplementation(() => {
    const result = mocks.selectResults.shift() ?? [{ n: 0 }];
    const chain: Record<string, unknown> = {
      from: () => chain,
      innerJoin: () => chain,
      where: () => Promise.resolve(result),
    };
    return chain;
  });

  mocks.execute.mockImplementation(async () => {
    mocks.calls.push("set_config");
  });
  const tx = {
    execute: mocks.execute,
    update: () => {
      mocks.calls.push("update");
      return {
        set: (values: unknown) => {
          mocks.set(values);
          return {
            where: () => ({
              returning: async () => {
                const next = mocks.updateResults.shift();
                if (next instanceof Error) throw next;
                return next ?? [];
              },
            }),
          };
        },
      };
    },
  };
  mocks.transaction.mockImplementation(async (cb: (t: typeof tx) => unknown) => cb(tx));
});

describe("previewApplyAudience", () => {
  it("devuelve cuántos elementos cambiarían por tipo y cuántos son destacados", async () => {
    // Orden: favoritos, diario, listas, colección, listas fijadas, álbumes fijados, diario destacado.
    queueCounts(3, 5, 2, 1, 1, 2, 4);

    await expect(previewApplyAudience("u1", "private")).resolves.toEqual({
      audience: "private",
      favorites: 3,
      diary: 5,
      lists: 2,
      collection: 1,
      highlighted: { pinnedLists: 1, pinnedAlbumFavorites: 2, highlightedDiary: 4 },
    });
  });

  it("devuelve ceros cuando todo ya tiene esa audiencia", async () => {
    queueCounts(0, 0, 0, 0, 0, 0, 0);

    await expect(previewApplyAudience("u1", "public")).resolves.toEqual({
      audience: "public",
      favorites: 0,
      diary: 0,
      lists: 0,
      collection: 0,
      highlighted: { pinnedLists: 0, pinnedAlbumFavorites: 0, highlightedDiary: 0 },
    });
  });

  it("solo lee: no abre transacción ni actualiza nada", async () => {
    queueCounts(1, 1, 1, 1, 0, 0, 0);
    await previewApplyAudience("u1", "followers");

    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it.each(["", "auto", null, undefined, "PUBLIC"])(
    "rechaza la audiencia inválida %j sin consultar la base",
    async (value) => {
      await expect(previewApplyAudience("u1", value as never)).rejects.toMatchObject({
        code: "VALIDATION_ERROR",
        status: 400,
      });
      expect(mocks.select).not.toHaveBeenCalled();
    },
  );
});

describe("applyAudienceToExisting", () => {
  it("aplica la audiencia a los cuatro tipos y devuelve los conteos reales", async () => {
    queueUpdates([{ id: "f1" }, { id: "f2" }], [{ id: "e1" }], [{ id: "l1" }, { id: "l2" }, { id: "l3" }], []);

    await expect(applyAudienceToExisting("u1", "private")).resolves.toEqual({
      audience: "private",
      favorites: 2,
      diary: 1,
      lists: 3,
      collection: 0,
    });
    expect(mocks.set).toHaveBeenCalledTimes(4);
    // Solo se escribe la columna de audiencia.
    for (const [values] of mocks.set.mock.calls) expect(values).toEqual({ audience: "private" });
  });

  it("todo ocurre dentro de una única transacción", async () => {
    queueUpdates([], [], [], []);
    await applyAudienceToExisting("u1", "followers");

    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    // `db.update` fuera de la transacción nunca se usa.
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("activa el indicador que conserva updated_at antes de los UPDATE", async () => {
    queueUpdates([], [], [], []);
    await applyAudienceToExisting("u1", "public");

    expect(mocks.calls).toEqual(["set_config", "update", "update", "update", "update"]);
    // set_config con `true` = local a la transacción (no se filtra a otras conexiones).
    const [statement] = mocks.execute.mock.calls[0] as [{ queryChunks: unknown[] }];
    const text = JSON.stringify(statement.queryChunks);
    expect(text).toContain("app.preserve_updated_at");
    expect(text).toContain("true");
  });

  it("es idempotente: sin filas distintas responde con ceros", async () => {
    queueUpdates([], [], [], []);

    await expect(applyAudienceToExisting("u1", "public")).resolves.toEqual({
      audience: "public",
      favorites: 0,
      diary: 0,
      lists: 0,
      collection: 0,
    });
  });

  it("si falla un UPDATE el error se propaga y la transacción no devuelve resultado", async () => {
    queueUpdates([{ id: "f1" }], [{ id: "e1" }], new Error("boom"), []);

    await expect(applyAudienceToExisting("u1", "private")).rejects.toThrow("boom");
    // El cuarto UPDATE no llega a ejecutarse: el fallo aborta la transacción.
    expect(mocks.set).toHaveBeenCalledTimes(3);
  });

  it.each(["", "auto", null, undefined, "PUBLIC"])(
    "rechaza la audiencia inválida %j sin abrir transacción",
    async (value) => {
      await expect(applyAudienceToExisting("u1", value as never)).rejects.toMatchObject({
        code: "VALIDATION_ERROR",
        status: 400,
      });
      expect(mocks.transaction).not.toHaveBeenCalled();
    },
  );
});
