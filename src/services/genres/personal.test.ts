import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

// `select` resuelve desde una cola en el orden de las consultas; el SQL real (aislamiento entre
// personas, subárbol) lo ejercita el smoke test contra Postgres.
const state = vi.hoisted(() => ({ selects: [] as unknown[][], wheres: [] as SQL[] }));

vi.mock("@/db", () => ({
  db: {
    select: () => {
      const proxy: unknown = new Proxy(function () {}, {
        get(_t, prop) {
          if (prop === "then") {
            const result = Promise.resolve(state.selects.shift() ?? []);
            return result.then.bind(result);
          }
          if (prop === "where") {
            return (arg: SQL) => {
              state.wheres.push(arg);
              return proxy;
            };
          }
          return () => proxy;
        },
      });
      return proxy;
    },
  },
}));
vi.mock("./read", () => ({ albumInGenreTreeOnce: () => ({ queryChunks: [] }) }));

const { footprintIsEmpty, getGenreFootprint, getMovedByCount, isGenreInIdentity } = await import("./personal");
const dialect = new PgDialect();

beforeEach(() => {
  state.selects = [];
  state.wheres = [];
});

describe("getGenreFootprint", () => {
  it("junta valoraciones, media, favoritos y pendientes", async () => {
    state.selects = [
      [{ ratedCount: 7, averageStars: 3.9 }],
      [
        { id: "a", title: "Souvlaki", stars: "5.0" },
        { id: "b", title: "Loveless", stars: "4.5" },
      ],
      [{ pendingCount: 2 }],
    ];
    await expect(getGenreFootprint("u1", "g1")).resolves.toEqual({
      ratedCount: 7,
      averageStars: 3.9,
      favorites: [
        { id: "a", title: "Souvlaki", stars: 5 },
        { id: "b", title: "Loveless", stars: 4.5 },
      ],
      pendingCount: 2,
    });
  });

  it("filtra siempre por la persona pedida", async () => {
    state.selects = [[{ ratedCount: 0, averageStars: null }], [], [{ pendingCount: 0 }]];
    await getGenreFootprint("u1", "g1");
    expect(state.wheres).toHaveLength(3);
    for (const where of state.wheres) expect(dialect.sqlToQuery(where).params).toContain("u1");
  });

  it("sin actividad la media es null y la huella está vacía", async () => {
    state.selects = [[{ ratedCount: 0, averageStars: null }], [], [{ pendingCount: 0 }]];
    const footprint = await getGenreFootprint("u1", "g1");
    expect(footprint.averageStars).toBeNull();
    expect(footprintIsEmpty(footprint)).toBe(true);
  });

  it("solo pendientes ya no es una huella vacía", () => {
    expect(footprintIsEmpty({ ratedCount: 0, averageStars: null, favorites: [], pendingCount: 1 })).toBe(false);
  });
});

describe("isGenreInIdentity", () => {
  it("lee si el slug está en la lista de la persona", async () => {
    state.selects = [[{ declared: true }]];
    await expect(isGenreInIdentity("u1", "shoegaze")).resolves.toBe(true);
    state.selects = [[]];
    await expect(isGenreInIdentity("u2", "shoegaze")).resolves.toBe(false);
  });
});

describe("getMovedByCount", () => {
  it("devuelve la cifra desde 5 personas", async () => {
    state.selects = [[{ n: 12 }]];
    await expect(getMovedByCount("shoegaze")).resolves.toBe(12);
    state.selects = [[{ n: 5 }]];
    await expect(getMovedByCount("shoegaze")).resolves.toBe(5);
  });

  it("bajo 5 devuelve null, nunca la cifra", async () => {
    state.selects = [[{ n: 4 }]];
    await expect(getMovedByCount("shoegaze")).resolves.toBeNull();
    state.selects = [[]];
    await expect(getMovedByCount("shoegaze")).resolves.toBeNull();
  });

  it("solo cuenta perfiles públicos y cuentas activas", async () => {
    state.selects = [[{ n: 9 }]];
    await getMovedByCount("shoegaze");
    const { sql, params } = dialect.sqlToQuery(state.wheres[0]!);
    expect(params).toContain("public");
    expect(params).toContain("shoegaze");
    expect(sql).toMatch(/deactivated_at.*is null/i);
  });
});
