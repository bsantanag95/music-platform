import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

const state = vi.hoisted(() => ({ rows: [] as unknown[], lastQuery: null as SQL | null }));

vi.mock("@/db", () => ({
  db: {
    execute: async (query: SQL) => {
      state.lastQuery = query;
      return state.rows;
    },
  },
}));
vi.mock("./read", () => ({
  albumInGenreTree: () => ({ queryChunks: [] }),
  genreWithDescendants: () => ({ queryChunks: [] }),
}));

const { listGenreArtists } = await import("./artists");
const dialect = new PgDialect();

const row = (id: string, albums: number) => ({ id, name: `Artista ${id}`, type: "group", photo_url: null, album_count: albums });

beforeEach(() => {
  state.rows = [];
  state.lastQuery = null;
});

describe("listGenreArtists", () => {
  it("devuelve la página pedida y detecta si hay siguiente con una fila de más", async () => {
    state.rows = [row("a", 5), row("b", 4), row("c", 3)];
    const page = await listGenreArtists("g-1", { page: 1, pageSize: 2 });
    expect(page.artists.map((a) => a.id)).toEqual(["a", "b"]);
    expect(page.hasNext).toBe(true);
    expect(page.artists[0]).toEqual({ id: "a", name: "Artista a", type: "group", photoUrl: null, albumCount: 5 });
  });

  it("no expone la cantidad de seguidores", async () => {
    state.rows = [{ ...row("a", 1), follow_count: 99 }];
    const page = await listGenreArtists("g-1", { sort: "followed" });
    expect(JSON.stringify(page)).not.toContain("99");
  });

  it.each([
    ["albums", /ORDER BY album_count DESC, a\.name ASC, a\.id ASC/],
    ["followed", /ORDER BY follow_count DESC, album_count DESC/],
    ["az", /ORDER BY search_normalize\(a\.name\) ASC, a\.id ASC/],
  ] as const)("el orden %s es determinista", async (sort, pattern) => {
    await listGenreArtists("g-1", { sort });
    expect(dialect.sqlToQuery(state.lastQuery as SQL).sql).toMatch(pattern);
  });

  it("la búsqueda va como parámetro y escapa % y _", async () => {
    await listGenreArtists("g-1", { q: "50%_x" });
    const { sql, params } = dialect.sqlToQuery(state.lastQuery as SQL);
    expect(sql).toContain("search_normalize(a.name) LIKE search_normalize($");
    expect(params).toContain("%50\\%\\_x%");
    expect(sql).not.toContain("50%_x");
  });

  it("rechaza paginación y orden inválidos", async () => {
    await expect(listGenreArtists("g-1", { page: 0 })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(listGenreArtists("g-1", { pageSize: 500 })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(listGenreArtists("g-1", { sort: "azar" as never })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});
