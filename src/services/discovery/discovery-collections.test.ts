import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Lecturas de colecciones de Explorar por grupo, y archivo (openspec: split-explore-collections). El
// constructor de consultas registra el `where`, el `limit` y el `offset` para comprobar qué se pregunta.

const mocks = vi.hoisted(() => ({
  rows: [] as unknown[],
  calls: [] as { where?: unknown; limit?: number; offset?: number; orderBy?: unknown[] }[],
  enrichLists: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    select: () => {
      const call: (typeof mocks.calls)[number] = {};
      mocks.calls.push(call);
      const builder: Record<string, unknown> = {
        from: () => builder,
        innerJoin: () => builder,
        where: (condition: unknown) => {
          call.where = condition;
          return builder;
        },
        orderBy: (...order: unknown[]) => {
          call.orderBy = order;
          return builder;
        },
        limit: (value: number) => {
          call.limit = value;
          return builder;
        },
        offset: (value: number) => {
          call.offset = value;
          return Promise.resolve(mocks.rows);
        },
        then: (resolve: (rows: unknown[]) => unknown) => resolve(mocks.rows),
      };
      return builder;
    },
  },
}));
vi.mock("@/services/lists/lists", () => ({ enrichLists: mocks.enrichLists }));

import {
  ARCHIVE_PAGE_SIZE,
  AUTOMATIC_RAIL_LIMIT,
  EDITORIAL_RAIL_LIMIT,
  HUB_AUTOMATIC_LIMIT,
  HUB_EDITORIAL_LIMIT,
} from "./constants";
import {
  listAutomaticCollections,
  listCollectionArchive,
  listCollectionsHub,
  listEditorialCollections,
} from "./discovery";

const render = (condition: unknown) => {
  const query = new PgDialect().sqlToQuery(condition as SQL);
  return { sql: query.sql.replace(/\s+/g, " "), params: query.params };
};

beforeEach(() => {
  mocks.rows = [];
  mocks.calls.length = 0;
  mocks.enrichLists.mockReset();
  mocks.enrichLists.mockResolvedValue(new Map());
});

describe("listEditorialCollections / listAutomaticCollections", () => {
  it("el rail editorial lee solo filas curadas, con su propio tope", async () => {
    await listEditorialCollections();

    const { where, limit } = mocks.calls[0]!;
    expect(limit).toBe(EDITORIAL_RAIL_LIMIT);
    const { sql, params } = render(where);
    expect(sql).toContain('"user_list_featured"."source" =');
    expect(params).toContain("curated");
    expect(params).not.toContain("template");
  });

  it("el rail automático lee solo filas generadas, con su propio tope", async () => {
    await listAutomaticCollections();

    const { where, limit } = mocks.calls[0]!;
    expect(limit).toBe(AUTOMATIC_RAIL_LIMIT);
    expect(render(where).params).toContain("template");
  });

  it("ambos exigen la condición de riel (vigencia, lista pública y visible)", async () => {
    await listEditorialCollections();
    const { sql } = render(mocks.calls[0]!.where);
    expect(sql).toContain('"user_list_featured"."starts_at" <= now()');
    expect(sql).toContain('"user_list"."moderation_status" =');
    expect(sql).toContain('"user_list"."audience" =');
  });

  it("añade la familia a las generadas y deja las curadas sin familia", async () => {
    mocks.rows = [
      { id: "g", title: "Grammy", description: null, source: "template", templateKey: "grammy-winners" },
      { id: "c", title: "Debuts", description: null, source: "curated", templateKey: null },
    ];
    mocks.enrichLists.mockResolvedValue(new Map([["g", { itemCount: 10, coverThumbs: ["a"] }]]));

    const result = await listAutomaticCollections();

    expect(result.find((c) => c.id === "g")).toMatchObject({ family: "awards", source: "template", itemCount: 10 });
    expect(result.find((c) => c.id === "c")).toMatchObject({ family: null, source: "curated", itemCount: 0 });
  });

  it("expone plantilla y período de las generadas (para localizar el título) y null en las curadas", async () => {
    mocks.rows = [
      { id: "g", title: "Ganadores del Grammy 2025", description: null, source: "template", templateKey: "grammy-winners", periodKey: "grammy-2025" },
      { id: "c", title: "Debuts", description: null, source: "curated", templateKey: null, periodKey: null },
    ];

    const result = await listAutomaticCollections();

    expect(result.find((c) => c.id === "g")).toMatchObject({ templateKey: "grammy-winners", periodKey: "grammy-2025" });
    expect(result.find((c) => c.id === "c")).toMatchObject({ templateKey: null, periodKey: null });
  });
});

describe("listCollectionsHub", () => {
  it("pide los dos grupos con los topes de la página", async () => {
    await listCollectionsHub();

    expect(mocks.calls.map((call) => call.limit).sort((a, b) => a! - b!)).toEqual(
      [HUB_EDITORIAL_LIMIT, HUB_AUTOMATIC_LIMIT].sort((a, b) => a - b),
    );
  });
});

describe("listCollectionArchive", () => {
  it("lista solo generadas vencidas de listas públicas y visibles", async () => {
    await listCollectionArchive();

    const { where, limit, offset } = mocks.calls[0]!;
    const { sql, params } = render(where);
    expect(params).toContain("template");
    expect(sql).toContain('"user_list_featured"."expires_at" <= now()');
    expect(sql).toContain('"user_list"."moderation_status" =');
    expect(limit).toBe(ARCHIVE_PAGE_SIZE + 1);
    expect(offset).toBe(0);
  });

  it("pagina de a ARCHIVE_PAGE_SIZE y avisa si hay siguiente", async () => {
    mocks.rows = Array.from({ length: ARCHIVE_PAGE_SIZE + 1 }, (_, i) => ({
      id: `l${i}`,
      title: `T${i}`,
      description: null,
      source: "template",
      templateKey: "anniversaries",
      endedAt: new Date("2026-09-01T00:00:00Z"),
    }));

    const page = await listCollectionArchive({ page: 2 });

    expect(mocks.calls[0]!.offset).toBe(ARCHIVE_PAGE_SIZE);
    expect(page.collections).toHaveLength(ARCHIVE_PAGE_SIZE);
    expect(page.hasNext).toBe(true);
    expect(page.page).toBe(2);
    expect(page.collections[0]).toMatchObject({ family: "ephemeris", endedAt: "2026-09-01T00:00:00.000Z" });
  });

  it("sin filas no hay siguiente", async () => {
    await expect(listCollectionArchive()).resolves.toMatchObject({ collections: [], hasNext: false, page: 1 });
  });

  it("una página inválida cuenta como la primera", async () => {
    await listCollectionArchive({ page: -3 });
    expect(mocks.calls[0]!.offset).toBe(0);
  });

  it("el filtro por familia usa las claves de la familia", async () => {
    await listCollectionArchive({ family: "awards" });
    expect(render(mocks.calls[0]!.where).params).toContain("grammy-winners");
  });

  it("la familia de respaldo recoge también las claves que ya no existen", async () => {
    await listCollectionArchive({ family: "discovery" });
    const { sql, params } = render(mocks.calls[0]!.where);
    expect(sql).toContain('"user_list_featured"."template_key" is null or');
    expect(sql).toContain("not in");
    // excluye las claves de las demás familias, no las suyas
    expect(params).toContain("grammy-winners");
    expect(params).not.toContain("genre-spotlight");
  });
});
