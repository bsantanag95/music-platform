import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rows: [] as unknown[], calls: 0, where: undefined as unknown }));

vi.mock("@/db", () => ({
  db: {
    select: () => {
      mocks.calls += 1;
      const builder: Record<string, unknown> = {
        from: () => builder,
        innerJoin: () => builder,
        where: (condition: unknown) => {
          mocks.where = condition;
          return builder;
        },
        limit: () => Promise.resolve(mocks.rows),
        then: (resolve: (rows: unknown[]) => unknown) => resolve(mocks.rows),
      };
      return builder;
    },
  },
}));

import { findGeneratedCollection, generatedRefsFor } from "./generated";

const render = () => {
  const query = new PgDialect().sqlToQuery(mocks.where as SQL);
  return { sql: query.sql.replace(/\s+/g, " "), params: query.params };
};

beforeEach(() => {
  mocks.rows = [];
  mocks.calls = 0;
  mocks.where = undefined;
});

describe("generatedRefsFor", () => {
  it("sin ids no consulta la base", async () => {
    await expect(generatedRefsFor([])).resolves.toEqual(new Map());
    expect(mocks.calls).toBe(0);
  });

  it("devuelve plantilla y período solo de las listas que son colecciones generadas", async () => {
    mocks.rows = [
      { listId: "a", templateKey: "anniversaries", periodKey: "2026-10" },
      { listId: "b", templateKey: "new-releases", periodKey: "evergreen" },
    ];

    const refs = await generatedRefsFor(["a", "b", "c"]);

    expect(refs.get("a")).toEqual({ templateKey: "anniversaries", periodKey: "2026-10" });
    expect(refs.get("b")).toEqual({ templateKey: "new-releases", periodKey: "evergreen" });
    expect(refs.has("c")).toBe(false);
    expect(render().params).toContain("template");
  });

  it("ignora una fila sin plantilla o sin período", async () => {
    mocks.rows = [{ listId: "a", templateKey: null, periodKey: null }];
    await expect(generatedRefsFor(["a"])).resolves.toEqual(new Map());
  });
});

describe("findGeneratedCollection", () => {
  it("exige fila de plantilla y lista estándar, pública y visible", async () => {
    mocks.rows = [{ title: "Novedades esenciales", templateKey: "new-releases", periodKey: "evergreen", family: "releases" }];

    await expect(findGeneratedCollection("a")).resolves.toEqual({
      templateKey: "new-releases",
      periodKey: "evergreen",
      storedTitle: "Novedades esenciales",
      family: "releases",
    });
    const { sql, params } = render();
    expect(sql).toContain('"user_list_featured"."source" =');
    expect(sql).toContain('"user_list"."audience" =');
    expect(sql).toContain('"user_list"."moderation_status" =');
    expect(params).toEqual(expect.arrayContaining(["template", "public", "standard", "visible"]));
  });

  it("devuelve null si no hay fila (lista personal, curada, oculta o privada)", async () => {
    await expect(findGeneratedCollection("a")).resolves.toBeNull();
  });
});
