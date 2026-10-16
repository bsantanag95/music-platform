import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

// El constructor de consultas registra el `where`, el `groupBy`, el `orderBy` y el `limit` para comprobar qué se pregunta.
const mocks = vi.hoisted(() => ({
  rows: [] as unknown[],
  selects: 0,
  seen: {} as { where?: SQL; orderBy?: SQL[]; limit?: number },
  failNext: false,
}));

vi.mock("@/db", () => ({
  db: {
    select: () => {
      mocks.selects += 1;
      const builder: Record<string, unknown> = {
        from: () => builder,
        innerJoin: () => builder,
        where: (condition: SQL) => ((mocks.seen.where = condition), builder),
        groupBy: () => builder,
        orderBy: (...order: SQL[]) => ((mocks.seen.orderBy = order), builder),
        limit: (value: number) => {
          mocks.seen.limit = value;
          if (mocks.failNext) {
            mocks.failNext = false;
            return Promise.reject(new Error("boom"));
          }
          return Promise.resolve(mocks.rows);
        },
      };
      return builder;
    },
  },
}));

const { FAMILY_GENRES_LIMIT, FAMILY_GENRES_TTL_MS, listFamilyGenres, resetFamilyGenresCache } = await import("./family-genres");

const render = (chunk: SQL) => new PgDialect().sqlToQuery(chunk);

beforeEach(() => {
  resetFamilyGenresCache();
  mocks.selects = 0;
  mocks.seen = {};
  mocks.failNext = false;
  mocks.rows = [
    { slug: "rock", name: "rock", nameEs: null },
    { slug: "hard-rock", name: "hard rock", nameEs: "hard rock" },
  ];
});

describe("listFamilyGenres", () => {
  it("devuelve los géneros de la familia tal como llegan, ya ordenados, con el nombre en los dos idiomas", async () => {
    const genres = await listFamilyGenres("rock");

    expect(genres).toEqual([
      { slug: "rock", name: "rock", nameEs: null },
      { slug: "hard-rock", name: "hard rock", nameEs: "hard rock" },
    ]);
  });

  it("consulta solo los géneros de estilo de esa familia, del mayor al menor, con tope de 12 y el slug como desempate", async () => {
    await listFamilyGenres("jazz");

    const where = render(mocks.seen.where!);
    expect(where.params).toContain("jazz");
    expect(mocks.seen.limit).toBe(FAMILY_GENRES_LIMIT);
    expect(FAMILY_GENRES_LIMIT).toBe(12);
    const order = mocks.seen.orderBy!;
    expect(render(order[0]!).sql).toMatch(/count\(distinct .*release_group_id.*\) desc/);
    // El desempate es la columna `slug` (no una expresión), para que el orden sea estable.
    expect((order[order.length - 1] as unknown as { name: string }).name).toBe("slug");
  });

  it("una familia desconocida devuelve [] sin consultar la base", async () => {
    await expect(listFamilyGenres("inexistente")).resolves.toEqual([]);
    expect(mocks.selects).toBe(0);
  });

  it("reutiliza el resultado por familia y lo vuelve a leer al vencer", async () => {
    await listFamilyGenres("rock", 1_000);
    await listFamilyGenres("rock", 1_000 + FAMILY_GENRES_TTL_MS - 1);
    expect(mocks.selects).toBe(1);

    await listFamilyGenres("jazz", 1_000);
    expect(mocks.selects).toBe(2);

    await listFamilyGenres("rock", 1_000 + FAMILY_GENRES_TTL_MS);
    expect(mocks.selects).toBe(3);
  });

  it("un error no se cachea: devuelve [] y la próxima visita reintenta", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.failNext = true;

    await expect(listFamilyGenres("rock")).resolves.toEqual([]);
    const recovered = await listFamilyGenres("rock");

    expect(mocks.selects).toBe(2);
    expect(recovered).toHaveLength(2);
  });

  it("una familia con pocos géneros devuelve solo los que tienen álbumes", async () => {
    mocks.rows = [{ slug: "forro", name: "forró", nameEs: null }];

    await expect(listFamilyGenres("brazilian")).resolves.toHaveLength(1);
  });
});
