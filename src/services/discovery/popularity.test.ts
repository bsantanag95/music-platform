import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock("@/db", () => ({ db: { execute: mocks.execute } }));

const {
  POPULARITY_PERSON_CAP,
  POPULARITY_WEIGHTS,
  POPULAR_LIMIT,
  POPULAR_MIN,
  POPULAR_NOW_TTL_MS,
  listPopularNow,
  popularNow,
  popularityScoreQuery,
  resetPopularNowCache,
} = await import("./popularity");

const render = (query: SQL) => {
  const out = new PgDialect().sqlToQuery(query);
  return { sql: out.sql.replace(/\s+/g, " "), params: out.params };
};
const rows = (n: number, people = 2) => Array.from({ length: n }, (_, i) => ({ id: `t${i}`, score: 10 - i, people }));

beforeEach(() => {
  mocks.execute.mockReset();
  resetPopularNowCache();
});

describe("pesos y tope", () => {
  it("son los de la regla de negocio", () => {
    expect(POPULARITY_WEIGHTS).toEqual({
      favorite: 3,
      review: 2,
      follow: 2,
      listen: 1,
      rating: 1,
      list: 1,
      collection: 1,
      wantToListen: 0.5,
      wanted: 0.5,
    });
    expect(POPULARITY_PERSON_CAP).toBe(4);
  });
});

describe("popularityScoreQuery", () => {
  const album = render(popularityScoreQuery("album", { minPeople: 2, since: "2026-09-16T00:00:00.000Z", limit: 12 }));

  it("cuenta un gesto por persona, objetivo y tipo, el más reciente", () => {
    expect(album.sql).toContain("select distinct on (g.user_id, g.target_id, g.gesture)");
    expect(album.sql).toContain("order by g.user_id, g.target_id, g.gesture, g.at desc");
  });

  it("aplica el tope por persona y suma personas distintas por objetivo", () => {
    expect(album.sql).toMatch(/least\(sum\(d\.weight\), \$\d+\)/);
    expect(album.params).toContain(POPULARITY_PERSON_CAP);
    expect(album.sql).toContain("count(*)::int as \"people\"");
    expect(album.sql).toMatch(/having count\(\*\) >= \$\d+/);
  });

  it("ordena por puntuación, personas, actividad más reciente e id", () => {
    expect(album.sql).toContain("order by sum(p.person_score) desc, count(*) desc, max(p.last_at) desc, p.target_id");
  });

  it("solo cuenta cuentas activas", () => {
    expect(album.sql).toContain("join app_user au on au.id = g.user_id and au.deactivated_at is null");
  });

  it("acota a la ventana con la fecha como texto (no un Date)", () => {
    expect(album.sql).toMatch(/g\.at >= \$\d+::timestamptz/);
    expect(album.params).toContain("2026-09-16T00:00:00.000Z");
  });

  it("sin ventana no acota por fecha", () => {
    expect(render(popularityScoreQuery("album", { minPeople: 1 })).sql).not.toContain("g.at >=");
  });

  it("respeta lo privado: favoritos, diario, colección, búsqueda y listas privadas no cuentan; reseñas ocultas tampoco", () => {
    const text = album.sql;
    expect(text).toContain("from favorite x where x.release_group_id is not null and x.audience <> 'private'");
    expect(text).toContain("from listen_entry x where x.release_group_id is not null and x.audience <> 'private'");
    expect(text).toContain("from collection_entry x where x.audience <> 'private'");
    expect(text).toContain("from wanted_entry x where x.audience <> 'private'");
    expect(text).toContain("l.audience <> 'private'");
    expect(text).toContain("x.moderation_status = 'visible'");
  });

  it("las valoraciones cuentan como gesto, no por sus estrellas, y fechan por su última modificación", () => {
    expect(album.sql).toContain("'rating'::text as gesture, 1::float as weight, x.updated_at as at from rating x");
    expect(album.sql).not.toContain("stars");
  });

  it("los artistas suman sus gestos directos y los de sus discos por el artista principal", () => {
    const artist = render(popularityScoreQuery("artist", { minPeople: 1 })).sql;
    expect(artist).toContain("'follow'::text as gesture, 2::float as weight");
    expect(artist).toContain("select distinct on (c.release_group_id) c.release_group_id, c.artist_id from credit c");
    expect(artist).toContain("order by c.release_group_id, c.position");
  });

  it("las canciones cuentan los gestos sobre la grabación", () => {
    const song = render(popularityScoreQuery("song", { minPeople: 1 })).sql;
    expect(song).toContain("x.recording_id is not null");
    expect(song).not.toContain("collection_entry");
  });
});

describe("popularNow: ventana que se agranda", () => {
  const now = new Date("2026-10-16T12:00:00Z");

  it("con el mes suficiente usa el mes", async () => {
    mocks.execute.mockResolvedValueOnce(rows(POPULAR_MIN.album));

    const result = await popularNow("album", now);

    expect(result?.window).toBe("month");
    expect(mocks.execute).toHaveBeenCalledTimes(1);
    expect(render(mocks.execute.mock.calls[0]![0]).params).toContain("2026-09-16T12:00:00.000Z");
  });

  it("si el mes no llega prueba 90 días y luego siempre con umbral de una persona", async () => {
    mocks.execute
      .mockResolvedValueOnce(rows(2))
      .mockResolvedValueOnce(rows(3))
      .mockResolvedValueOnce(rows(POPULAR_MIN.album, 1));

    const result = await popularNow("album", now);

    expect(result?.window).toBe("all");
    expect(mocks.execute).toHaveBeenCalledTimes(3);
    const [month, quarter, all] = mocks.execute.mock.calls.map((call) => render(call[0]));
    expect(month!.params).toContain(2);
    expect(quarter!.params).toContain("2026-07-18T12:00:00.000Z");
    expect(all!.sql).not.toContain("g.at >=");
    expect(all!.params).toContain(1);
  });

  it("si ningún escalón llega, el tipo queda sin resultado", async () => {
    mocks.execute.mockResolvedValue(rows(1));

    await expect(popularNow("song", now)).resolves.toBeNull();
  });

  it("recorta al tope de cada tipo", async () => {
    mocks.execute.mockResolvedValueOnce(rows(30));

    const result = await popularNow("artist", now);

    expect(result?.items).toHaveLength(POPULAR_LIMIT.artist);
  });
});

describe("listPopularNow", () => {
  it("calcula los tres tipos y los guarda en caché", async () => {
    mocks.execute.mockResolvedValue(rows(12));

    const first = await listPopularNow(0);
    await listPopularNow(POPULAR_NOW_TTL_MS - 1);

    expect(first.albums?.items.length).toBeGreaterThan(0);
    expect(first.artists).not.toBeNull();
    expect(first.songs).not.toBeNull();
    expect(mocks.execute).toHaveBeenCalledTimes(3);
  });

  it("un error deja la sección sin contenido y no se cachea", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.execute.mockRejectedValueOnce(new Error("boom"));

    await expect(listPopularNow(0)).resolves.toEqual({ albums: null, artists: null, songs: null });
  });
});
