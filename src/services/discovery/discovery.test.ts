import { sql, type SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  listAlbumsByDecade,
  listAlbumsByFamily,
  listAlbumsByGenre,
  listAlbumsFiltered,
  featuredActiveCondition,
  listFeaturedCollections,
  listGenreFamilies,
  listMostReviewed,
  listNewAlbums,
  listNewReleases,
  listRecentByYear,
  listTopRated,
  listUpcomingAlbums,
  listUpcomingReleases,
} from "./discovery";
import { FEATURED_RAIL_LIMIT, FILTERED_PAGE_SIZE, MIN_ALBUMS_FOR_SECTION, NEW_RELEASE_WINDOW_DAYS, RAIL_SIZE, UPCOMING_WINDOW_DAYS } from "./constants";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn() },
  enrichLists: vi.fn(),
}));

vi.mock("@/db", () => ({ db: mocks.db }));
vi.mock("@/services/lists/lists", () => ({ enrichLists: mocks.enrichLists }));

// Proxy que devuelve `this` para cualquier método encadenado y resuelve a
// `result` al hacer await (mismo helper que src/services/lists/discovery.test.ts).
function chain<T>(result: T): T {
  const promise = Promise.resolve(result);
  const proxy: unknown = new Proxy(function () {}, {
    get(_t, prop) {
      if (prop === "then") return promise.then.bind(promise);
      if (prop === "catch") return promise.catch.bind(promise);
      if (prop === "finally") return promise.finally.bind(promise);
      return () => proxy;
    },
    apply() {
      return proxy;
    },
  });
  return proxy as T;
}

function albumRow(id: string) {
  return {
    id,
    mbid: null,
    title: `Álbum ${id}`,
    category: "studio",
    firstReleaseDate: null,
    firstReleaseYear: 1994,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    coverThumbUrl: null,
    coverCheckedAt: null,
    coverBlockedAt: null,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listFeaturedCollections", () => {
  it("ordena por rank y enriquece con conteo y carátulas", async () => {
    mocks.db.select.mockReturnValue(
      chain([
        { id: "l2", title: "Segunda", rank: 2 },
        { id: "l1", title: "Primera", rank: 1 },
      ]),
    );
    mocks.enrichLists.mockResolvedValue(
      new Map([
        ["l1", { itemCount: 5, coverThumbs: ["a"] }],
        ["l2", { itemCount: 3, coverThumbs: [] }],
      ]),
    );

    const result = await listFeaturedCollections();

    // el orden lo da la query (mockeada); comprobamos el mapeo/enriquecimiento
    expect(result.map((c) => c.id)).toEqual(["l2", "l1"]);
    expect(result.find((c) => c.id === "l1")).toMatchObject({ itemCount: 5, coverThumbs: ["a"] });
  });

  it("filtra por vigencia y limita al tope del riel", async () => {
    mocks.db.select.mockReturnValue(chain([]));
    mocks.enrichLists.mockResolvedValue(new Map());
    await listFeaturedCollections();
    const condition = new PgDialect().sqlToQuery(featuredActiveCondition());
    expect(condition.sql).toContain('"user_list_featured"."starts_at" <= now()');
    expect(condition.sql).toContain('"user_list_featured"."expires_at" is null or "user_list_featured"."expires_at" > now()');
    expect(FEATURED_RAIL_LIMIT).toBe(6);
  });

  it("sin colecciones destacadas devuelve lista vacía", async () => {
    mocks.db.select.mockReturnValue(chain([]));
    mocks.enrichLists.mockResolvedValue(new Map());
    await expect(listFeaturedCollections()).resolves.toEqual([]);
  });
});

describe("rieles por reglas: degradación grácil", () => {
  it("listTopRated omite el riel (devuelve []) bajo MIN_ALBUMS_FOR_SECTION", async () => {
    const few = Array.from({ length: MIN_ALBUMS_FOR_SECTION - 1 }, (_, i) => ({
      ...albumRow(`a${i}`),
      avgStars: 4.5,
      ratingCount: 3,
    }));
    mocks.db.select.mockReturnValue(chain(few));
    await expect(listTopRated()).resolves.toEqual([]);
  });

  it("listTopRated muestra el riel al alcanzar el umbral", async () => {
    const enough = Array.from({ length: MIN_ALBUMS_FOR_SECTION }, (_, i) => ({
      ...albumRow(`a${i}`),
      avgStars: 4.5,
      ratingCount: 3,
    }));
    mocks.db.select.mockReturnValue(chain(enough));
    const result = await listTopRated();
    expect(result).toHaveLength(MIN_ALBUMS_FOR_SECTION);
    expect(result[0]).toMatchObject({ title: "Álbum a0", firstReleaseYear: 1994 });
  });

  it("listMostReviewed omite el riel bajo umbral", async () => {
    mocks.db.select.mockReturnValue(chain([{ ...albumRow("a0"), reviewCount: 2 }]));
    await expect(listMostReviewed()).resolves.toEqual([]);
  });
});

describe("listNewReleases", () => {
  const dialect = new PgDialect();

  // Captura el `where` y el `orderBy` que arma la consulta para inspeccionar su SQL.
  function capture(rows: unknown[]) {
    const seen: { where?: SQL; order: SQL[] } = { order: [] };
    const q: Record<string, unknown> = {};
    q.from = () => q;
    q.where = (w: SQL) => ((seen.where = w), q);
    q.orderBy = (...o: SQL[]) => ((seen.order = o), q);
    q.limit = () => q;
    q.then = (resolve: (v: unknown) => unknown) => Promise.resolve(rows).then(resolve);
    mocks.db.select.mockReturnValue(q);
    return seen;
  }

  it("filtra por ventana de fecha completa, hasta hoy, con carátula, y ordena por fecha", async () => {
    const seen = capture(Array.from({ length: MIN_ALBUMS_FOR_SECTION }, (_, i) => albumRow(`n${i}`)));
    await listNewReleases();
    const where = dialect.sqlToQuery(seen.where as SQL);
    expect(where.sql).toContain("between current_date -");
    expect(where.sql).toContain("and current_date");
    expect(where.sql).toContain('"cover_thumb_url" is not null');
    expect(where.sql).not.toContain("first_release_year");
    expect(where.params).toContain(NEW_RELEASE_WINDOW_DAYS);
    const order = seen.order.map((o) => dialect.sqlToQuery(o).sql).join(",");
    expect(order).toContain('"first_release_date" desc');
    expect(order).toContain('"id" asc');
    expect(order).not.toContain("created_at");
  });

  it("omite el riel (devuelve []) bajo MIN_ALBUMS_FOR_SECTION", async () => {
    capture([albumRow("n0")]);
    await expect(listNewReleases()).resolves.toEqual([]);
  });

  it("muestra el riel al alcanzar el umbral, acotado a RAIL_SIZE", async () => {
    capture(Array.from({ length: RAIL_SIZE + 3 }, (_, i) => albumRow(`n${i}`)));
    await expect(listNewReleases()).resolves.toHaveLength(RAIL_SIZE);
  });
});

describe("novedades: listado completo", () => {
  const dialect = new PgDialect();

  function capture(rows: unknown[]) {
    const seen: { where?: SQL; order: SQL[]; limit?: number; offset?: number } = { order: [] };
    const q: Record<string, unknown> = {};
    q.from = () => q;
    q.where = (w: SQL) => ((seen.where = w), q);
    q.orderBy = (...o: SQL[]) => ((seen.order = o), q);
    q.limit = (n: number) => ((seen.limit = n), q);
    q.offset = (n: number) => ((seen.offset = n), q);
    q.then = (resolve: (v: unknown) => unknown) => Promise.resolve(rows).then(resolve);
    mocks.db.select.mockReturnValue(q);
    return seen;
  }

  it("usa la misma condición y orden que el riel: ventana hasta hoy, carátula, fecha descendente, sin rating", async () => {
    const rail = capture(Array.from({ length: MIN_ALBUMS_FOR_SECTION }, (_, i) => albumRow(`n${i}`)));
    await listNewReleases();
    const listing = capture([albumRow("n0")]);
    await listNewAlbums();

    const sqlOf = (x: SQL | undefined) => dialect.sqlToQuery(x as SQL);
    expect(sqlOf(listing.where).sql).toBe(sqlOf(rail.where).sql);
    expect(sqlOf(listing.where).params).toEqual(sqlOf(rail.where).params);
    expect(sqlOf(listing.where).sql).toContain("between current_date -");
    expect(sqlOf(listing.where).params).toContain(NEW_RELEASE_WINDOW_DAYS);
    const order = listing.order.map((o) => dialect.sqlToQuery(o).sql).join(",");
    expect(order).toContain('"first_release_date" desc');
    expect(order).toContain('"id" asc');
    expect(order).not.toContain("rating");
    expect(listing.order.map((o) => dialect.sqlToQuery(o).sql)).toEqual(rail.order.map((o) => dialect.sqlToQuery(o).sql));
  });

  it("no aplica umbral: con 3 resultados los devuelve", async () => {
    capture([albumRow("n0"), albumRow("n1"), albumRow("n2")]);
    const page = await listNewAlbums();
    expect(page.albums).toHaveLength(3);
    expect(page.hasNext).toBe(false);
  });

  it("pagina con una fila de más y desplaza por página", async () => {
    const seen = capture(Array.from({ length: FILTERED_PAGE_SIZE + 1 }, (_, i) => albumRow(`n${i}`)));
    const page = await listNewAlbums(3);
    expect(page.albums).toHaveLength(FILTERED_PAGE_SIZE);
    expect(page.hasNext).toBe(true);
    expect(seen.limit).toBe(FILTERED_PAGE_SIZE + 1);
    expect(seen.offset).toBe(FILTERED_PAGE_SIZE * 2);
  });

  it("filtra por tipo y rechaza uno inválido o una página inválida", async () => {
    const seen = capture([]);
    await listNewAlbums(1, { category: "single_ep" });
    expect(dialect.sqlToQuery(seen.where as SQL).sql).toContain('"category" = $');
    await expect(listNewAlbums(1, { category: "otro" as never })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(listNewAlbums(0)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});

describe("próximos lanzamientos", () => {
  const dialect = new PgDialect();

  function capture(rows: unknown[]) {
    const seen: { where?: SQL; order: SQL[]; limit?: number; offset?: number } = { order: [] };
    const q: Record<string, unknown> = {};
    q.from = () => q;
    q.where = (w: SQL) => ((seen.where = w), q);
    q.orderBy = (...o: SQL[]) => ((seen.order = o), q);
    q.limit = (n: number) => ((seen.limit = n), q);
    q.offset = (n: number) => ((seen.offset = n), q);
    q.then = (resolve: (v: unknown) => unknown) => Promise.resolve(rows).then(resolve);
    mocks.db.select.mockReturnValue(q);
    return seen;
  }

  it("el riel toma lo posterior a hoy hasta hoy + ventana, con carátula, por fecha ascendente y sin rating", async () => {
    const seen = capture(Array.from({ length: MIN_ALBUMS_FOR_SECTION }, (_, i) => albumRow(`u${i}`)));
    await listUpcomingReleases();
    const where = dialect.sqlToQuery(seen.where as SQL);
    expect(where.sql).toContain("> current_date");
    expect(where.sql).toContain("<= current_date +");
    expect(where.sql).toContain('"cover_thumb_url" is not null');
    expect(where.params).toContain(UPCOMING_WINDOW_DAYS);
    const order = seen.order.map((o) => dialect.sqlToQuery(o).sql).join(",");
    expect(order).toContain('"first_release_date" asc');
    expect(order).toContain('"id" asc');
    expect(order).not.toContain("rating");
  });

  it("el riel se omite bajo MIN_ALBUMS_FOR_SECTION y se acota a RAIL_SIZE", async () => {
    capture([albumRow("u0")]);
    await expect(listUpcomingReleases()).resolves.toEqual([]);
    capture(Array.from({ length: RAIL_SIZE + 3 }, (_, i) => albumRow(`u${i}`)));
    await expect(listUpcomingReleases()).resolves.toHaveLength(RAIL_SIZE);
  });

  it("el listado no aplica umbral: con 2 resultados los devuelve", async () => {
    capture([albumRow("u0"), albumRow("u1")]);
    const page = await listUpcomingAlbums();
    expect(page.albums).toHaveLength(2);
    expect(page.hasNext).toBe(false);
  });

  it("el listado pagina con una fila de más y desplaza por página", async () => {
    const seen = capture(Array.from({ length: FILTERED_PAGE_SIZE + 1 }, (_, i) => albumRow(`u${i}`)));
    const page = await listUpcomingAlbums(2);
    expect(page.albums).toHaveLength(FILTERED_PAGE_SIZE);
    expect(page.hasNext).toBe(true);
    expect(seen.limit).toBe(FILTERED_PAGE_SIZE + 1);
    expect(seen.offset).toBe(FILTERED_PAGE_SIZE);
  });

  it("el listado filtra por tipo y rechaza uno inválido", async () => {
    const seen = capture([]);
    await listUpcomingAlbums(1, { category: "studio" });
    expect(dialect.sqlToQuery(seen.where as SQL).sql).toContain('"category" = $');
    await expect(listUpcomingAlbums(1, { category: "otro" as never })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("el listado rechaza una página inválida", async () => {
    await expect(listUpcomingAlbums(0)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});

describe("listRecentByYear", () => {
  it("conserva la lógica por año del riel de género, sin umbral", async () => {
    mocks.db.select.mockReturnValue(chain([albumRow("g0")]));
    await expect(listRecentByYear(12)).resolves.toHaveLength(1);
  });
});

describe("listGenreFamilies", () => {
  it("ordena las familias como la interfaz, con su tier, y omite las que no tienen álbumes", async () => {
    mocks.db.select.mockReturnValue(
      chain([
        { key: "latin", count: 4 },
        { key: "rock", count: 12 },
        { key: "world", count: 1 },
        { key: "jazz", count: 0 },
      ]),
    );
    await expect(listGenreFamilies()).resolves.toEqual([
      { key: "rock", tier: "main", count: 12 },
      { key: "latin", tier: "main", count: 4 },
      { key: "world", tier: "more", count: 1 },
    ]);
  });
});

describe("listados filtrados: validación", () => {
  it("rechaza una década no múltiplo de 10 o fuera de rango", async () => {
    mocks.db.select.mockReturnValue(chain([]));
    await expect(listAlbumsByDecade(1995, 1)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(listAlbumsByDecade(1200, 1)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("rechaza una paginación inválida", async () => {
    mocks.db.select.mockReturnValue(chain([]));
    await expect(listAlbumsByDecade(1990, 0)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(listAlbumsByGenre("rock", -1)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(listAlbumsByFamily("rock", -1)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("un género o una familia desconocidos devuelven la página vacía sin listar", async () => {
    mocks.db.select.mockReturnValue(chain([]));
    await expect(listAlbumsByGenre("   ", 1)).resolves.toMatchObject({ albums: [], hasNext: false, genre: null });
    await expect(listAlbumsByGenre("no-existe", 1)).resolves.toMatchObject({ albums: [], genre: null });
    await expect(listAlbumsByFamily("inexistente", 1)).resolves.toMatchObject({ albums: [], family: null });
    // Solo la búsqueda del slug consulta la base; ningún listado.
    expect(mocks.db.select).toHaveBeenCalledTimes(1);
  });

  it("lista una familia conocida y devuelve su clave", async () => {
    mocks.db.select.mockReturnValue(chain([albumRow("a1")]));
    const result = await listAlbumsByFamily(" Latin ", 1);
    expect(result.family).toBe("latin");
    expect(result.albums).toHaveLength(1);
  });

  it("calcula hasNext con una fila extra y recorta a pageSize", async () => {
    const rows = Array.from({ length: 25 }, (_, i) => albumRow(`a${i}`));
    mocks.db.select.mockReturnValue(chain(rows));
    const result = await listAlbumsByDecade(1990, 1);
    expect(result.albums).toHaveLength(24);
    expect(result.hasNext).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// listAlbumsFiltered (openspec: redesign-genre-page)
// ---------------------------------------------------------------------------

describe("listAlbumsFiltered", () => {
  type Captured = { where?: SQL; orderBy: SQL[]; limit?: number; offset?: number };

  function capture(rows: unknown[] = []): Captured {
    const captured: Captured = { orderBy: [] };
    const builder: Record<string, unknown> = {
      from: () => builder,
      leftJoin: () => builder,
      groupBy: () => builder,
      where: (arg: SQL) => {
        captured.where = arg;
        return builder;
      },
      orderBy: (...args: SQL[]) => {
        captured.orderBy = args;
        return builder;
      },
      limit: (n: number) => {
        captured.limit = n;
        return builder;
      },
      offset: (n: number) => {
        captured.offset = n;
        return Promise.resolve(rows);
      },
    };
    mocks.db.select.mockReturnValue(builder);
    return captured;
  }

  const dialect = new PgDialect();
  const render = (chunk: SQL | undefined) => (chunk ? dialect.sqlToQuery(chunk) : { sql: "", params: [] });
  const base = sql`1 = 1`;

  it("sin filtros usa el orden compartido de Explorar y pide una fila de más para saber si hay siguiente", async () => {
    const captured = capture([albumRow("a"), albumRow("b")]);
    const page = await listAlbumsFiltered(base, { page: 2 });
    expect(captured.limit).toBe(FILTERED_PAGE_SIZE + 1);
    expect(captured.offset).toBe(FILTERED_PAGE_SIZE);
    expect(page.hasNext).toBe(false);
    expect(page.albums.map((a) => a.id)).toEqual(["a", "b"]);
    const order = captured.orderBy.map((o) => render(o).sql).join(" | ");
    expect(order).toMatch(/avg\(.*desc nulls last/s);
    expect(order).toMatch(/first_release_year.*desc nulls last/);
  });

  it.each([
    ["popular", /count\(.*desc/],
    ["newest", /first_release_year" desc nulls last/],
    ["oldest", /first_release_year" asc nulls last/],
    ["az", /search_normalize\(.*title.*asc/],
  ] as const)("el orden %s desempata siempre por id", async (sort, pattern) => {
    const captured = capture();
    await listAlbumsFiltered(base, { sort });
    const rendered = captured.orderBy.map((o) => render(o).sql);
    expect(rendered.join(" | ")).toMatch(pattern);
    expect(rendered[rendered.length - 1]).toMatch(/"release_group"\."id" asc/);
  });

  it("combina tipo, década y texto en el WHERE con parámetros, no concatenados", async () => {
    const captured = capture();
    await listAlbumsFiltered(base, { category: "studio", decade: 1970, q: "Motörhead" });
    const { sql: text, params } = render(captured.where);
    expect(text).toContain('"category" = $');
    expect(text).toMatch(/between \$\d+ and \$\d+/);
    expect(text).toMatch(/search_normalize\(.*title.*\) LIKE search_normalize\(\$\d+\)/s);
    expect(text).toContain("FROM credit c JOIN artist a");
    expect(params).toContain("studio");
    expect(params).toContain(1970);
    expect(params).toContain(1979);
    expect(params).toContain("%Motörhead%");
    expect(text).not.toContain("Motörhead");
  });

  it("escapa % y _ del texto como literales", async () => {
    const captured = capture();
    await listAlbumsFiltered(base, { q: "50%_off" });
    expect(render(captured.where).params).toContain("%50\\%\\_off%");
  });

  it("un texto vacío o solo espacios no agrega condición", async () => {
    const captured = capture();
    await listAlbumsFiltered(base, { q: "   " });
    expect(render(captured.where).sql).not.toContain("credit c");
  });

  it("rechaza tipo, década, orden y paginación inválidos", async () => {
    capture();
    await expect(listAlbumsFiltered(base, { category: "bootleg" as never })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(listAlbumsFiltered(base, { decade: 1975 })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(listAlbumsFiltered(base, { sort: "azar" as never })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(listAlbumsFiltered(base, { page: 0 })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});
