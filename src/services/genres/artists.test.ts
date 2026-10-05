import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

// `execute` devuelve una cola de resultados en el orden de las consultas (principal, disco destacado,
// marcas) y registra cada consulta para revisar el SQL renderizado. El SQL real lo ejercita el smoke test.
const state = vi.hoisted(() => ({ results: [] as unknown[][], queries: [] as SQL[] }));

vi.mock("@/db", () => ({
  db: {
    execute: async (query: SQL) => {
      state.queries.push(query);
      return state.results.shift() ?? [];
    },
  },
}));
vi.mock("./read", () => ({
  albumInGenreTree: () => ({ queryChunks: [] }),
  albumInGenreTreeOnce: () => ({ queryChunks: [] }),
  genreWithDescendants: () => ({ queryChunks: [] }),
}));

const { listGenreArtists, listGenreArtistFacets } = await import("./artists");
const dialect = new PgDialect();
const flat = (text: string) => text.replace(/\s+/g, " ");
const render = (index: number) => {
  const { sql, params } = dialect.sqlToQuery(state.queries[index]!);
  return { sql: flat(sql), params };
};

const row = (id: string, albums: number, over: Record<string, unknown> = {}) => ({
  id,
  name: `Artista ${id}`,
  type: "group",
  photo_url: null,
  album_count: albums,
  complete: true,
  has_mbid: true,
  ...over,
});

beforeEach(() => {
  state.results = [];
  state.queries = [];
});

describe("listGenreArtists: página y marcas", () => {
  it("devuelve la página pedida y detecta si hay siguiente con una fila de más", async () => {
    state.results = [[row("a", 5), row("b", 4), row("c", 3)], [], []];
    const page = await listGenreArtists("g-1", { page: 1, pageSize: 2 });
    expect(page.artists.map((a) => a.id)).toEqual(["a", "b"]);
    expect(page.hasNext).toBe(true);
    expect(page.artists[0]).toEqual({
      id: "a",
      name: "Artista a",
      type: "group",
      photoUrl: null,
      albumCount: 5,
      discographyComplete: true,
      hasMbid: true,
      featuredAlbum: null,
    });
  });

  it("sin lector no consulta marcas ni devuelve known/following", async () => {
    state.results = [[row("a", 1)], []];
    const page = await listGenreArtists("g-1");
    expect(state.queries).toHaveLength(2);
    expect(page.artists[0]).not.toHaveProperty("known");
    expect(page.artists[0]).not.toHaveProperty("following");
  });

  it("con lector pide las marcas solo de los artistas de la página y las adjunta", async () => {
    state.results = [
      [row("a", 2), row("b", 1)],
      [],
      [
        { id: "a", known: true, following: false },
        { id: "b", known: false, following: true },
      ],
    ];
    const page = await listGenreArtists("g-1", { readerId: "reader-1" });
    expect(state.queries).toHaveLength(3);
    const marks = render(2);
    expect(marks.params.filter((p) => p === "reader-1").length).toBeGreaterThanOrEqual(9);
    expect(marks.params).toEqual(expect.arrayContaining(["a", "b"]));
    expect(page.artists.map((a) => [a.id, a.known, a.following])).toEqual([
      ["a", true, false],
      ["b", false, true],
    ]);
  });

  it("una página vacía no hace consultas extra", async () => {
    state.results = [[]];
    await listGenreArtists("g-1", { readerId: "reader-1" });
    expect(state.queries).toHaveLength(1);
  });

  it("adjunta el disco destacado y no expone la cantidad de seguidores", async () => {
    state.results = [
      [{ ...row("a", 1), follow_count: 987654 }],
      [{ artist_id: "a", id: "rg1", title: "Souvlaki", year: 1993 }],
    ];
    const page = await listGenreArtists("g-1", { sort: "followed" });
    expect(page.artists[0]!.featuredAlbum).toEqual({ id: "rg1", title: "Souvlaki", year: 1993 });
    expect(JSON.stringify(page)).not.toContain("987654");
  });

  it("un artista con la discografía sin explorar lo informa (para no mostrar un cero engañoso)", async () => {
    state.results = [[row("a", 0, { complete: false, has_mbid: false })], []];
    const [artist] = (await listGenreArtists("g-1")).artists;
    expect(artist).toMatchObject({ albumCount: 0, discographyComplete: false, hasMbid: false });
  });
});

describe("listGenreArtists: reglas de datos", () => {
  it("los discos propios son los principales de estudio y single/EP; el debut solo con la discografía explorada", async () => {
    await listGenreArtists("g-1", { sort: "recent" });
    const { sql } = render(0);
    expect(sql).toContain("oc.role = 'primary'");
    expect(sql).toContain("orb.category IN ('studio', 'single_ep')");
    expect(sql).toContain("orb.discography_unlisted_at IS NULL");
    expect(sql).toContain("CASE WHEN a.discography_complete_at IS NOT NULL THEN min(orb.first_release_year) END");
  });

  it("rendimiento: calcula los álbumes del subárbol una sola vez y solo lo que el orden o los filtros usan", async () => {
    await listGenreArtists("g-1");
    const base = render(0).sql;
    expect(base).toContain("WITH tree_albums AS MATERIALIZED");
    expect(base).toContain("JOIN tree_albums t ON t.release_group_id = c.release_group_id");
    expect(base).not.toContain("LATERAL ( SELECT count(DISTINCT orb.id)");
    expect(base).not.toContain("AS follow_count");

    state.queries = [];
    await listGenreArtists("g-1", { sort: "followed" });
    expect(render(0).sql).toContain("AS follow_count");
    expect(render(0).sql).not.toContain("orb.id");

    state.queries = [];
    await listGenreArtists("g-1", { debutDecade: 2010 });
    expect(render(0).sql).toContain("count(DISTINCT orb.id)");
    expect(render(0).sql).not.toContain("AS follow_count");

    state.queries = [];
    await listGenreArtists("g-1", { sort: "discover" });
    expect(render(0).sql).toContain("AS follow_count");
    expect(render(0).sql).toContain("count(DISTINCT orb.id)");
    expect(render(0).sql).toContain("JOIN tree_albums st ON st.release_group_id = sc.release_group_id");
  });

  it("la discografía corta exige explorada y de 1 a 5 discos: sin explorar o con 0 no es corta", async () => {
    await listGenreArtists("g-1", { shortOnly: true });
    const { sql, params } = render(0);
    expect(sql).toContain("(a.discography_complete_at IS NOT NULL AND own.own_albums BETWEEN 1 AND $");
    expect(params).toContain(5);
  });
});

describe("listGenreArtists: filtros", () => {
  it("país, década de debut y texto van como parámetros", async () => {
    await listGenreArtists("g-1", { country: "CL", debutDecade: 2010, q: "50%_x" });
    const { sql, params } = render(0);
    expect(sql).toContain("a.country = $");
    expect(sql).toContain("own.debut_year BETWEEN $");
    expect(params).toEqual(expect.arrayContaining(["CL", 2010, 2019, "%50\\%\\_x%"]));
    expect(sql).not.toContain("CL");
  });

  it("hideKnown con lector excluye lo conocido; sin lector se ignora", async () => {
    await listGenreArtists("g-1", { hideKnown: true, readerId: "reader-1" });
    expect(render(0).sql).toContain("NOT (EXISTS (SELECT 1 FROM artist_follow f");
    state.queries = [];
    await listGenreArtists("g-1", { hideKnown: true });
    expect(render(0).sql).not.toContain("NOT (EXISTS");
  });

  it("debutKnownOnly exige que el debut sea conocido", async () => {
    await listGenreArtists("g-1", { debutKnownOnly: true });
    expect(render(0).sql).toContain("own.debut_year IS NOT NULL");
  });

  it("unexploredOnly pide solo artistas sin explorar y con MBID", async () => {
    await listGenreArtists("g-1", { unexploredOnly: true });
    expect(render(0).sql).toContain("(a.discography_complete_at IS NULL AND a.mbid IS NOT NULL)");
  });

  it("sin filtros no agrega condiciones", async () => {
    await listGenreArtists("g-1");
    const { sql } = render(0);
    expect(sql).not.toContain("a.country =");
    expect(sql).not.toContain("BETWEEN");
  });
});

describe("listGenreArtists: órdenes", () => {
  it.each([
    ["albums", "ORDER BY album_count DESC, a.name ASC, a.id ASC"],
    ["followed", "ORDER BY follow_count DESC, album_count DESC, a.name ASC, a.id ASC"],
    ["az", "ORDER BY search_normalize(a.name) ASC, a.id ASC"],
    ["recent", "ORDER BY own.debut_year DESC NULLS LAST, album_count DESC, a.name ASC, a.id ASC"],
    ["discover", "ORDER BY has_signal DESC, follow_count DESC, own.debut_year DESC NULLS LAST, a.name ASC, a.id ASC"],
  ] as const)("el orden %s es determinista", async (sort, expected) => {
    await listGenreArtists("g-1", { sort });
    expect(render(0).sql).toContain(expected);
  });

  it("la señal de comunidad solo se calcula en el orden discover (3 valoraciones y media 3,5)", async () => {
    await listGenreArtists("g-1", { sort: "discover" });
    const discover = render(0);
    expect(discover.sql).toContain("AS has_signal");
    expect(discover.params).toEqual(expect.arrayContaining([3, 3.5]));
    state.queries = [];
    await listGenreArtists("g-1", { sort: "albums" });
    expect(render(0).sql).toContain("FALSE AS has_signal");
  });

  it("el disco destacado prefiere mayor media con 3 valoraciones, luego estudio y más reciente", async () => {
    state.results = [[row("a", 1)]];
    await listGenreArtists("g-1");
    const { sql, params } = render(1);
    expect(sql).toContain("DISTINCT ON (fc.artist_id)");
    expect(sql).toContain("(rt.n >= $");
    expect(sql).toContain("(release_group.category = 'studio') DESC");
    expect(sql).toContain("release_group.first_release_year DESC NULLS LAST");
    expect(params).toContain(3);
  });
});

describe("listGenreArtists: validación", () => {
  it("rechaza paginación, orden, país y década inválidos", async () => {
    await expect(listGenreArtists("g-1", { page: 0 })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(listGenreArtists("g-1", { pageSize: 500 })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(listGenreArtists("g-1", { sort: "azar" as never })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(listGenreArtists("g-1", { country: "chile" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(listGenreArtists("g-1", { country: "cl" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(listGenreArtists("g-1", { debutDecade: 1975 })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(state.queries).toHaveLength(0);
  });
});

describe("listGenreArtistFacets", () => {
  it("devuelve países y décadas de debut ya ordenados, con su conteo", async () => {
    state.results = [
      [
        { country: "US", n: 188 },
        { country: "GB", n: 80 },
      ],
      [
        { decade: 2010, n: 2 },
        { decade: 1980, n: 9 },
      ],
    ];
    await expect(listGenreArtistFacets("g-1")).resolves.toEqual({
      countries: [
        { code: "US", count: 188 },
        { code: "GB", count: 80 },
      ],
      debutDecades: [
        { decade: 2010, count: 2 },
        { decade: 1980, count: 9 },
      ],
    });
  });

  it("el debut de las facetas sigue la misma regla (solo con debut conocido) y hace una consulta por faceta", async () => {
    await listGenreArtistFacets("g-1");
    expect(state.queries).toHaveLength(2);
    expect(render(1).sql).toContain("own.debut_year IS NOT NULL");
    expect(render(0).sql).toContain("a.country IS NOT NULL");
  });
});
