import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock("@/db", () => ({ db: { execute: mocks.execute } }));

const { DECADE_GENRES_LIMIT, DECADE_GENRES_PER_FAMILY, DECADE_GENRES_TTL_MS, listDecadeGenres, orderByFamily, resetDecadeGenresCache } =
  await import("./decade-genres");

const rows = [
  { slug: "rock", name: "rock", nameEs: null, familyKey: "rock" },
  { slug: "grunge", name: "grunge", nameEs: "grunge", familyKey: "rock" },
];

beforeEach(() => {
  resetDecadeGenresCache();
  mocks.execute.mockReset();
  mocks.execute.mockResolvedValue(rows);
});

describe("listDecadeGenres", () => {
  it("devuelve los géneros de la década con el nombre en los dos idiomas, sin la familia", async () => {
    await expect(listDecadeGenres(1990)).resolves.toEqual([
      { slug: "rock", name: "rock", nameEs: null },
      { slug: "grunge", name: "grunge", nameEs: "grunge" },
    ]);
  });

  it("pide la familia con la que entró cada género", async () => {
    await listDecadeGenres(1990);

    const text = new PgDialect().sqlToQuery(mocks.execute.mock.calls[0]![0] as SQL).sql.replace(/\s+/g, " ");
    expect(text).toContain('(array_agg(family_key order by rn))[1] as "familyKey"');
  });

  it("consulta los discos de esa década, del mayor al menor, con el slug como desempate y el tope de 12", async () => {
    await listDecadeGenres(1990);

    expect(mocks.execute).toHaveBeenCalledTimes(1);
    const query = new PgDialect().sqlToQuery(mocks.execute.mock.calls[0]![0] as SQL);
    const text = query.sql.replace(/\s+/g, " ");
    expect(text).toContain("rg.first_release_year between $1 and $2");
    expect(text).toContain("g.kind = 'style'");
    expect(text).toContain("count(distinct e.release_group_id)");
    expect(text).toMatch(/order by n desc, slug limit \$\d+\s*$/);
    expect(query.params).toEqual([1990, 1999, DECADE_GENRES_PER_FAMILY, DECADE_GENRES_LIMIT]);
    expect(DECADE_GENRES_LIMIT).toBe(12);
  });

  it("limita cuántos géneros de una misma familia entran en la fila", async () => {
    await listDecadeGenres(1990);

    const query = new PgDialect().sqlToQuery(mocks.execute.mock.calls[0]![0] as SQL);
    const text = query.sql.replace(/\s+/g, " ");
    // Se numera dentro de cada familia por tamaño (un género sin familia cuenta aparte) y se descarta pasado el tope.
    expect(text).toContain("partition by coalesce(fm.family_key, c.slug) order by c.n desc, c.slug");
    expect(text).toContain("having min(rn) <= $3");
    expect(DECADE_GENRES_PER_FAMILY).toBe(3);
  });

  it("una década inválida devuelve [] sin consultar la base", async () => {
    await expect(listDecadeGenres(1995)).resolves.toEqual([]);
    await expect(listDecadeGenres(Number.NaN)).resolves.toEqual([]);
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it("reutiliza el resultado por década y lo vuelve a leer al vencer", async () => {
    await listDecadeGenres(1990, 1_000);
    await listDecadeGenres(1990, 1_000 + DECADE_GENRES_TTL_MS - 1);
    expect(mocks.execute).toHaveBeenCalledTimes(1);

    await listDecadeGenres(1980, 1_000);
    expect(mocks.execute).toHaveBeenCalledTimes(2);

    await listDecadeGenres(1990, 1_000 + DECADE_GENRES_TTL_MS);
    expect(mocks.execute).toHaveBeenCalledTimes(3);
  });

  it("un error no se cachea: devuelve [] y la próxima visita reintenta", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.execute.mockRejectedValueOnce(new Error("boom"));

    await expect(listDecadeGenres(1990)).resolves.toEqual([]);
    const recovered = await listDecadeGenres(1990);

    expect(mocks.execute).toHaveBeenCalledTimes(2);
    expect(recovered).toHaveLength(2);
  });
});

describe("orderByFamily", () => {
  const row = (slug: string, familyKey: string | null) => ({ slug, name: slug, nameEs: null, familyKey });

  it("ordena por la familia en la taxonomía y deja la Clásica al final, aunque sus géneros sean los más grandes", () => {
    // Llegan del más grande al más chico: la clásica abre la lista.
    const ordered = orderByFamily([
      row("opera", "classical"),
      row("symphony", "classical"),
      row("pop", "pop"),
      row("rock", "rock"),
      row("jazz", "jazz"),
    ]);

    expect(ordered.map((genre) => genre.slug)).toEqual(["rock", "pop", "jazz", "opera", "symphony"]);
  });

  it("dentro de cada familia conserva el orden por tamaño con que llegan", () => {
    const ordered = orderByFamily([row("hard-rock", "rock"), row("pop", "pop"), row("rock", "rock"), row("synth-pop", "pop")]);

    expect(ordered.map((genre) => genre.slug)).toEqual(["hard-rock", "rock", "pop", "synth-pop"]);
  });

  it("un género sin familia o con una familia desconocida va al final", () => {
    const ordered = orderByFamily([row("huerfano", null), row("raro", "no-existe"), row("blues", "blues")]);

    expect(ordered.map((genre) => genre.slug)).toEqual(["blues", "huerfano", "raro"]);
  });

  it("no pierde ni repite géneros y no devuelve la familia", () => {
    const input = [row("a", "jazz"), row("b", "rock"), row("c", null)];
    const ordered = orderByFamily(input);

    expect(ordered).toHaveLength(3);
    expect(ordered.every((genre) => !("familyKey" in genre))).toBe(true);
  });
});
