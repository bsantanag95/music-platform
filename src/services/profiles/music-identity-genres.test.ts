import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

// Alta y baja atómicas de un género de la identidad musical (openspec: redesign-genre-page). El SQL
// real (tope, idempotencia, edición concurrente) lo ejercita el smoke test contra Postgres; acá se
// verifica la lógica de decisión y que la sentencia sea una sola, con el tope en el WHERE.

const state = vi.hoisted(() => ({
  selects: [] as unknown[][],
  updateResults: [] as unknown[][],
  sets: [] as Record<string, SQL>[],
  wheres: [] as SQL[],
}));

vi.mock("@/db", () => {
  const select = () => {
    const proxy: unknown = new Proxy(function () {}, {
      get(_t, prop) {
        if (prop === "then") {
          const result = Promise.resolve(state.selects.shift() ?? []);
          return result.then.bind(result);
        }
        return () => proxy;
      },
    });
    return proxy;
  };
  const update = () => ({
    set: (value: Record<string, SQL>) => {
      state.sets.push(value);
      return {
        where: (condition: SQL) => {
          state.wheres.push(condition);
          return { returning: async () => state.updateResults.shift() ?? [] };
        },
      };
    },
  });
  return { db: { select, update } };
});

const { addIdentityGenre, removeIdentityGenre } = await import("./music-identity");
const dialect = new PgDialect();

beforeEach(() => {
  state.selects = [];
  state.updateResults = [];
  state.sets = [];
  state.wheres = [];
});

describe("addIdentityGenre", () => {
  it("agrega con una sola sentencia atómica: append condicionado a no estar y a tener menos de 5", async () => {
    state.selects = [[{ slug: "shoegaze" }]];
    state.updateResults = [[{ genres: ["jazz", "shoegaze"] }]];
    await expect(addIdentityGenre("u1", "shoegaze")).resolves.toEqual(["jazz", "shoegaze"]);
    expect(dialect.sqlToQuery(state.sets[0]!.genres!).sql).toContain("array_append");
    const where = dialect.sqlToQuery(state.wheres[0]!);
    expect(where.sql).toContain("= ANY(");
    expect(where.sql).toContain("cardinality(");
    expect(where.params).toContain(5);
    expect(state.sets).toHaveLength(1);
  });

  it("si el género ya estaba responde con la lista actual (idempotente)", async () => {
    state.selects = [[{ slug: "shoegaze" }], [{ genres: ["shoegaze", "jazz"] }]];
    state.updateResults = [[]];
    await expect(addIdentityGenre("u1", "shoegaze")).resolves.toEqual(["shoegaze", "jazz"]);
  });

  it("con la lista llena responde 409 MUSIC_IDENTITY_GENRES_FULL", async () => {
    state.selects = [[{ slug: "shoegaze" }], [{ genres: ["a", "b", "c", "d", "e"] }]];
    state.updateResults = [[]];
    await expect(addIdentityGenre("u1", "shoegaze")).rejects.toMatchObject({ code: "MUSIC_IDENTITY_GENRES_FULL", status: 409 });
  });

  it("un slug que no es un estilo visible o tiene formato inválido es 404 GENRE_NOT_FOUND y no escribe", async () => {
    state.selects = [[]];
    await expect(addIdentityGenre("u1", "no-existe")).rejects.toMatchObject({ code: "GENRE_NOT_FOUND", status: 404 });
    await expect(addIdentityGenre("u1", "NO VÁLIDO")).rejects.toMatchObject({ code: "GENRE_NOT_FOUND", status: 404 });
    expect(state.sets).toHaveLength(0);
  });

  it("una persona inexistente es USER_NOT_FOUND", async () => {
    state.selects = [[{ slug: "shoegaze" }], []];
    state.updateResults = [[]];
    await expect(addIdentityGenre("fantasma", "shoegaze")).rejects.toMatchObject({ code: "USER_NOT_FOUND" });
  });
});

describe("removeIdentityGenre", () => {
  it("quita con array_remove y devuelve la lista", async () => {
    state.updateResults = [[{ genres: ["jazz"] }]];
    await expect(removeIdentityGenre("u1", "shoegaze")).resolves.toEqual(["jazz"]);
    expect(dialect.sqlToQuery(state.sets[0]!.genres!).sql).toContain("array_remove");
  });

  it("quitar uno que no estaba devuelve la lista sin cambios", async () => {
    state.updateResults = [[{ genres: ["jazz"] }]];
    await expect(removeIdentityGenre("u1", "otro")).resolves.toEqual(["jazz"]);
  });

  it("permite quitar un género que ya no es un estilo visible (no consulta la taxonomía)", async () => {
    state.updateResults = [[{ genres: [] }]];
    await expect(removeIdentityGenre("u1", "retirado")).resolves.toEqual([]);
  });

  it("formato inválido es 404 y persona inexistente es USER_NOT_FOUND", async () => {
    await expect(removeIdentityGenre("u1", "NO VÁLIDO")).rejects.toMatchObject({ code: "GENRE_NOT_FOUND" });
    state.updateResults = [[]];
    await expect(removeIdentityGenre("fantasma", "jazz")).rejects.toMatchObject({ code: "USER_NOT_FOUND" });
  });
});
