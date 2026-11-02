import { describe, expect, it, vi } from "vitest";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

const select = vi.fn();
vi.mock("@/db", () => ({ db: { select: (...args: unknown[]) => select(...args) } }));

const { rankByMatchTier, recordingSignals, recordingsByArtistsAndTitlePrefix, matchLocalReleaseGroups } =
  await import("./local-match");

/** Consulta encadenable de drizzle que, al esperarla, devuelve `rows`. */
function query(rows: unknown[]) {
  const chain: Record<string, unknown> = {};
  for (const method of ["from", "innerJoin", "where", "orderBy", "groupBy", "limit"]) chain[method] = () => chain;
  chain.then = (resolve: (value: unknown[]) => unknown) => resolve(rows);
  return chain;
}

describe("rankByMatchTier", () => {
  it("antepone exactas y palabras completas a subcadenas a mitad de palabra", () => {
    // Orden de similitud tal como podría devolverlo la base.
    const bySimilarity = ["Jack Perricone", "Ennio Morricone", "Despised Icon", "Icon", "ICON"];
    expect(rankByMatchTier(bySimilarity, (name) => name, "icon")).toEqual([
      "Icon",
      "ICON",
      "Despised Icon",
      "Jack Perricone",
      "Ennio Morricone",
    ]);
  });

  it("dentro de un mismo nivel conserva el orden de la base", () => {
    const rows = [{ name: "Icon", id: "b" }, { name: "Icon", id: "a" }];
    expect(rankByMatchTier(rows, (row) => row.name, "icon").map((row) => row.id)).toEqual([
      "b",
      "a",
    ]);
  });
});

describe("señales de las sugerencias de canción (openspec: improve-song-suggestions)", () => {
  it("sin candidatos no consulta la base", async () => {
    select.mockClear();
    const signals = await recordingSignals([]);
    expect(select).not.toHaveBeenCalled();
    expect(signals.artistByRecording.size).toBe(0);
    expect(await recordingsByArtistsAndTitlePrefix([], "one", 10)).toEqual([]);
    expect(await recordingsByArtistsAndTitlePrefix(["metallica"], "  ", 10)).toEqual([]);
    expect(select).not.toHaveBeenCalled();
  });

  it("toma el primer artista principal por posición y convierte las cifras", async () => {
    select.mockReset();
    select
      .mockReturnValueOnce(query([])) // subconsulta de artistas principales (no se espera)
      .mockReturnValueOnce(
        query([
          { recordingId: "one", id: "metallica", name: "Metallica", syncedAt: new Date("2026-01-01") },
          { recordingId: "one", id: "guest", name: "Invitado", syncedAt: null },
          { recordingId: "cover", id: "quartet", name: "Midnite String Quartet", syncedAt: null },
        ]),
      )
      .mockReturnValueOnce(query([{ recordingId: "one", albums: "3" }]))
      .mockReturnValueOnce(query([{ artistId: "metallica", followers: "2" }]));

    const signals = await recordingSignals(["one", "cover", "one"]);

    expect(signals.artistByRecording.get("one")).toEqual({ id: "metallica", name: "Metallica", explored: true });
    expect(signals.artistByRecording.get("cover")).toEqual({ id: "quartet", name: "Midnite String Quartet", explored: false });
    expect(signals.albumsByRecording.get("one")).toBe(3);
    expect(signals.albumsByRecording.has("cover")).toBe(false);
    expect(signals.followersByArtist.get("metallica")).toBe(2);
  });
});

describe("subcadena primero en la coincidencia local (openspec: speed-up-search)", () => {
  const titles = (count: number) => Array.from({ length: count }, (_, index) => ({ id: `rg-${index}`, title: `The Day ${index}` }));

  /** Consulta que además guarda su condición `where`, para ver qué coincidencia se pidió. */
  function capturing(rows: unknown[], wheres: SQL[]) {
    const chain = query(rows);
    chain.where = (condition: SQL) => {
      wheres.push(condition);
      return chain;
    };
    return chain;
  }

  const render = (condition: SQL) => new PgDialect().sqlToQuery(condition).sql;

  it("si la subcadena llena el cupo, no corre la similitud por trigramas", async () => {
    const wheres: SQL[] = [];
    select.mockReset();
    select.mockReturnValueOnce(capturing(titles(40), wheres));

    const rows = await matchLocalReleaseGroups("the d", { limit: 6 });

    expect(select).toHaveBeenCalledTimes(1);
    expect(render(wheres[0]!)).toContain("LIKE");
    expect(render(wheres[0]!)).not.toContain(" % ");
    expect(rows).toHaveLength(6);
  });

  it("errata: sin subcadenas, completa con las que solo casan por trigramas", async () => {
    const wheres: SQL[] = [];
    select.mockReset();
    select.mockReturnValueOnce(capturing([], wheres)).mockReturnValueOnce(
      capturing([{ id: "dsotm", title: "The Dark Side of the Moon" }], wheres),
    );

    const rows = await matchLocalReleaseGroups("dark sied of the moon", { limit: 6 });

    expect(select).toHaveBeenCalledTimes(2);
    expect(render(wheres[1]!)).toMatch(/ % .* AND NOT .*LIKE/);
    expect(rows.map((row) => row.id)).toEqual(["dsotm"]);
  });

  it("pocas subcadenas: van primero y las solo difusas completan detrás, sin repetir", async () => {
    const wheres: SQL[] = [];
    select.mockReset();
    select
      .mockReturnValueOnce(capturing([{ id: "okc", title: "OK Computer Live" }], wheres))
      .mockReturnValueOnce(capturing([{ id: "okk", title: "Ok Comb" }], wheres));

    const rows = await matchLocalReleaseGroups("ok com", { limit: 6 });

    expect(rows.map((row) => row.id)).toEqual(["okc", "okk"]);
  });
});
