import { describe, expect, it, vi } from "vitest";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

const select = vi.fn();
vi.mock("@/db", () => ({ db: { select: (...args: unknown[]) => select(...args) } }));
vi.mock("../../genres/read", () => ({
  findStyleGenreBySlug: vi.fn(async (slug: string) => (slug === "rock" ? { id: "genre-rock" } : null)),
  genreWithDescendants: (id: string) => ({ queryChunks: [`(tree of ${id})`] }) as unknown as SQL,
}));

const {
  albumCatalogConditions,
  artistCatalogConditions,
  catalogAlbumPage,
  hasCatalogFields,
  personKindConditions,
  resolveCatalogFields,
  withoutUnresolved,
} = await import("./catalog-fields");

const render = (condition: SQL) => new PgDialect().sqlToQuery(condition);
const none = { genreId: null, award: null };

/** Consulta encadenable de drizzle que, al esperarla, devuelve `rows`. */
function query(rows: unknown[]) {
  const chain: Record<string, unknown> = {};
  for (const method of ["from", "where", "orderBy", "limit", "offset"]) chain[method] = () => chain;
  chain.then = (resolve: (value: unknown[]) => unknown) => resolve(rows);
  return chain;
}

describe("condiciones del catálogo (openspec: add-catalog-search-fields)", () => {
  it("actividad: solo con discografía explorada, hasta hoy si no consta separado", () => {
    const [condition] = artistCatalogConditions({ activeFrom: 1980, activeTo: 1990 }, none, 2026);
    const { sql, params } = render(condition!);
    expect(sql).toContain(`"artist"."discography_synced_at" IS NOT NULL`);
    expect(sql).toContain(`CASE WHEN "artist"."life_ended" IS TRUE THEN span.last_year ELSE`);
    expect(params).toEqual([1990, 2026, 1980]);
  });

  it("un rango abierto usa los extremos del calendario", () => {
    const { params } = render(artistCatalogConditions({ activeFrom: 2020 }, none, 2026)[0]!);
    expect(params).toEqual([2100, 2026, 2020]);
  });

  it("cada rol mira su dato: pertenencias o personal", () => {
    const sqlOf = (role: "member" | "producer" | "musician") => render(artistCatalogConditions({ role }, none)[0]!);
    expect(sqlOf("member").sql).toContain("FROM membership");
    expect(sqlOf("producer").params).toEqual(["producer", "engineer", "mix", "recording", "programming", "arranger"]);
    const musician = sqlOf("musician");
    expect(musician.params).toEqual(["instrument", "vocal"]);
    expect(musician.sql).toContain("NOT EXISTS");
  });

  it("premios: cualquiera o uno; ganadores con salón de la fama incluido", () => {
    const any = render(albumCatalogConditions({}, { genreId: null, award: "any" })[0]!);
    expect(any.sql).not.toContain("aw.slug");
    expect(any.sql).toContain("anchor_release_group_id");
    const won = render(artistCatalogConditions({ awardWon: true }, { genreId: null, award: "grammy" })[0]!);
    expect(won.params).toContain("grammy");
    expect(won.sql).toContain("n.won OR aw.kind = 'hall_of_fame'");
  });

  it("país del artista y género sobre el álbum", () => {
    const conditions = albumCatalogConditions({ artistCountry: ["CL", "AR"] }, { genreId: "genre-rock", award: null });
    expect(conditions).toHaveLength(2);
    expect(render(conditions[1]!).params).toEqual(["CL", "AR"]);
  });

  it("Solista exige discos propios; Otras personas sin rol, ninguno y algún dato de personal (openspec: split-person-search-types)", () => {
    const [own] = personKindConditions("solo", {});
    expect(render(own!).sql).toContain("c.role = 'primary'");
    const other = personKindConditions("other", {}).map((condition) => render(condition).sql);
    expect(other).toHaveLength(2);
    expect(other[0]).toContain("FROM membership m UNION SELECT p.artist_id FROM personnel_credit p");
    expect(other[1]).toContain("NOT EXISTS");
    // Con un rol, el rol basta (también solistas que lo cumplen); Grupo y sin tipo no suman nada.
    expect(personKindConditions("other", { role: "member" })).toEqual([]);
    // Con actividad, Solista no repite la condición: el período ya exige discos propios.
    expect(personKindConditions("solo", { activeFrom: 1980 })).toEqual([]);
    expect(personKindConditions("group", {})).toEqual([]);
    expect(personKindConditions(undefined, {})).toEqual([]);
  });

  it("sin campos no hay condiciones", () => {
    expect(artistCatalogConditions({}, none)).toEqual([]);
    expect(albumCatalogConditions({}, none)).toEqual([]);
  });
});

describe("resolución y paginación", () => {
  it("un género o un premio desconocido se quita y deja de ser campo del catálogo", async () => {
    select.mockReturnValueOnce(query([]));
    const resolved = await resolveCatalogFields({ genre: "zzz", award: "nada" });
    expect(resolved).toEqual({ genreId: null, award: null });
    const fields = withoutUnresolved({ genre: "zzz", award: "nada", awardWon: true }, resolved);
    expect(hasCatalogFields(fields)).toBe(false);
  });

  it("`any` no consulta la base y un género visible se resuelve", async () => {
    select.mockClear();
    expect(await resolveCatalogFields({ genre: "rock", award: "any" })).toEqual({ genreId: "genre-rock", award: "any" });
    expect(select).not.toHaveBeenCalled();
  });

  it("página de 25 con la cifra exacta y la siguiente página", async () => {
    const rows = Array.from({ length: 25 }, (_, index) => ({ id: `rg-${index}` }));
    select.mockReset();
    select.mockReturnValueOnce(query(rows)).mockReturnValueOnce(query([{ total: 80 }]));
    const first = await catalogAlbumPage("", {}, { artistCountry: ["CL"] }, none, 0);
    expect(first).toMatchObject({ total: 80, nextOffset: 25 });

    select.mockReturnValueOnce(query(rows.slice(0, 5))).mockReturnValueOnce(query([{ total: 80 }]));
    const last = await catalogAlbumPage("", {}, { artistCountry: ["CL"] }, none, 75);
    expect(last).toMatchObject({ total: 80, nextOffset: null });
  });
});
