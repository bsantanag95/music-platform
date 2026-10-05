import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { sql } from "drizzle-orm";

const state = vi.hoisted(() => ({
  rows: [] as { id: string; genreAlbumCount: number }[],
  where: null as SQL | null,
  having: null as SQL | null,
  limit: 0,
  offset: 0,
}));
const mocks = vi.hoisted(() => ({
  base: vi.fn(),
  enrich: vi.fn(),
}));

vi.mock("@/db", () => {
  const builder: Record<string, unknown> = {
    from: () => builder,
    innerJoin: () => builder,
    groupBy: () => builder,
    where: (arg: SQL) => {
      state.where = arg;
      return builder;
    },
    having: (arg: SQL) => {
      state.having = arg;
      return builder;
    },
    orderBy: () => builder,
    limit: (n: number) => {
      state.limit = n;
      return builder;
    },
    offset: (n: number) => {
      state.offset = n;
      return Promise.resolve(state.rows);
    },
  };
  return { db: { select: () => builder } };
});
vi.mock("@/services/lists/discovery", () => ({
  PUBLIC_LIST_COLUMNS: {},
  publicListBaseConditions: mocks.base,
  enrichPublicLists: mocks.enrich,
}));
vi.mock("./read", () => ({ albumInGenreTreeOnce: () => sql`TREE_CONDITION` }));

const { listGenreLists } = await import("./lists");
const dialect = new PgDialect();

beforeEach(() => {
  vi.clearAllMocks();
  state.rows = [];
  mocks.base.mockReturnValue([sql`BASE_CONDITION`]);
  mocks.enrich.mockImplementation(async (rows: { id: string }[]) => rows.map((r) => ({ id: r.id, saveCount: 0 })));
});

describe("listGenreLists", () => {
  it("usa las condiciones base de listas públicas con el lector y exige al menos 3 álbumes del género", async () => {
    await listGenreLists("reader-1", "g1");
    expect(mocks.base).toHaveBeenCalledWith("reader-1");
    const where = dialect.sqlToQuery(state.where as SQL);
    expect(where.sql).toContain("BASE_CONDITION");
    expect(where.sql).toContain("TREE_CONDITION");
    expect(where.params).toContain("release-group");
    const having = dialect.sqlToQuery(state.having as SQL);
    expect(having.sql).toMatch(/count\(distinct .*\) >= \$/);
    expect(having.params).toContain(3);
  });

  it("un lector anónimo pasa null a las condiciones", async () => {
    await listGenreLists(null, "g1");
    expect(mocks.base).toHaveBeenCalledWith(null);
  });

  it("devuelve los álbumes del género de cada lista y detecta la página siguiente", async () => {
    state.rows = [
      { id: "l1", genreAlbumCount: 7 },
      { id: "l2", genreAlbumCount: 3 },
      { id: "l3", genreAlbumCount: 3 },
    ];
    const page = await listGenreLists(null, "g1", { page: 1, pageSize: 2 });
    expect(page.hasNext).toBe(true);
    expect(page.lists.map((l) => [l.id, l.genreAlbumCount])).toEqual([
      ["l1", 7],
      ["l2", 3],
    ]);
    expect(state.limit).toBe(3);
  });

  it("calcula el offset de la página pedida", async () => {
    await listGenreLists(null, "g1", { page: 3, pageSize: 10 });
    expect(state.offset).toBe(20);
  });

  it("rechaza una paginación inválida", async () => {
    await expect(listGenreLists(null, "g1", { page: 0 })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(listGenreLists(null, "g1", { pageSize: 51 })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});
