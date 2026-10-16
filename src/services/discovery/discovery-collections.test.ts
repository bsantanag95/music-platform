import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Lecturas de colecciones de Explorar por grupo, y archivo (openspec: split-explore-collections). El
// constructor de consultas registra el `where`, el `limit` y el `offset` para comprobar qué se pregunta.

const mocks = vi.hoisted(() => {
  const state = {
    rows: [] as unknown[],
    calls: [] as { where?: unknown; limit?: number; offset?: number; orderBy?: unknown[] }[],
    enrichLists: vi.fn(),
  };
  const startSelect = () => {
    const call: (typeof state.calls)[number] = {};
    state.calls.push(call);
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
        return Promise.resolve(state.rows);
      },
      then: (resolve: (rows: unknown[]) => unknown) => resolve(state.rows),
    };
    return builder;
  };
  return Object.assign(state, { startSelect });
});

vi.mock("@/db", () => ({ db: { select: () => mocks.startSelect(), selectDistinct: () => mocks.startSelect() } }));
vi.mock("@/services/lists/lists", () => ({ enrichLists: mocks.enrichLists }));

import { ARCHIVE_PAGE_SIZE, COLLECTION_RAIL_LIMIT, HUB_COLLECTION_LIMIT } from "./constants";
import { listCollectionArchive, listCollectionFamilies, listCollections, listCollectionsHub } from "./discovery";

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

describe("listCollections", () => {
  it("lee un solo riel con los dos orígenes mezclados, sin filtrar por `source`", async () => {
    await listCollections();

    const { where, limit } = mocks.calls[0]!;
    expect(limit).toBe(COLLECTION_RAIL_LIMIT);
    // La condición de riel menciona `source` solo para exigir que una curada esté publicada como oficial;
    // lo que no hace es acotar el riel a uno de los dos orígenes.
    expect(render(where).sql).not.toContain('"user_list_featured"."source" = $');
  });

  it("exige la condición de riel (vigencia, lista pública y visible)", async () => {
    await listCollections();
    const { sql } = render(mocks.calls[0]!.where);
    expect(sql).toContain('"user_list_featured"."starts_at" <= now()');
    expect(sql).toContain('"user_list"."moderation_status" =');
    expect(sql).toContain('"user_list"."audience" =');
  });

  it("exige que la lista tenga al menos un álbum: una colección vacía no se lista", async () => {
    await listCollections();
    const { sql } = render(mocks.calls[0]!.where);
    expect(sql).toContain('exists (select 1 from "user_list_item" where "user_list_item"."list_id" = "user_list"."id"');
    expect(sql).toContain('"user_list_item"."release_group_id" is not null');
  });

  it("ordena por peso y, a igualdad, por rank", async () => {
    await listCollections();
    const order = mocks.calls[0]!.orderBy!;
    expect(order).toHaveLength(3);
    expect(render(order[0]).sql).toContain('"weight" desc');
    expect(render(order[1]).sql).toContain('"rank" asc');
  });

  it("toma la familia de la fila, tanto en las generadas como en las curadas", async () => {
    mocks.rows = [
      { id: "g", title: "Grammy", description: null, source: "template", templateKey: "grammy-winners", family: "awards" },
      { id: "c", title: "Discos de culto", description: null, source: "curated", templateKey: null, family: "discovery" },
    ];
    mocks.enrichLists.mockResolvedValue(new Map([["g", { itemCount: 10, coverThumbs: ["a"] }]]));

    const result = await listCollections();

    expect(result.find((c) => c.id === "g")).toMatchObject({ family: "awards", source: "template", itemCount: 10 });
    expect(result.find((c) => c.id === "c")).toMatchObject({ family: "discovery", source: "curated", itemCount: 0 });
  });

  it("expone plantilla y período de las generadas (para localizar el título) y null en las curadas", async () => {
    mocks.rows = [
      { id: "g", title: "Ganadores del Grammy 2025", description: null, source: "template", templateKey: "grammy-winners", periodKey: "grammy-2025", family: "awards" },
      { id: "c", title: "Debuts", description: null, source: "curated", templateKey: null, periodKey: null, family: "discovery" },
    ];

    const result = await listCollections();

    expect(result.find((c) => c.id === "g")).toMatchObject({ templateKey: "grammy-winners", periodKey: "grammy-2025" });
    expect(result.find((c) => c.id === "c")).toMatchObject({ templateKey: null, periodKey: null });
  });
});

describe("listCollectionsHub", () => {
  it("pide una sola secuencia con el techo de la página", async () => {
    const hub = await listCollectionsHub();

    expect(mocks.calls).toHaveLength(1);
    expect(mocks.calls[0]!.limit).toBe(HUB_COLLECTION_LIMIT);
    expect(hub.collections).toEqual([]);
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

  it("tampoco lista las colecciones vencidas sin álbumes", async () => {
    await listCollectionArchive();
    expect(render(mocks.calls[0]!.where).sql).toContain('exists (select 1 from "user_list_item"');
  });

  it("pagina de a ARCHIVE_PAGE_SIZE y avisa si hay siguiente", async () => {
    mocks.rows = Array.from({ length: ARCHIVE_PAGE_SIZE + 1 }, (_, i) => ({
      id: `l${i}`,
      title: `T${i}`,
      description: null,
      source: "template",
      templateKey: "anniversaries",
      family: "ephemeris",
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

  it("el filtro por familia compara la columna de la fila", async () => {
    await listCollectionArchive({ family: "awards" });
    const { sql, params } = render(mocks.calls[0]!.where);
    expect(sql).toContain('"user_list_featured"."family" =');
    expect(params).toContain("awards");
    // Ya no pasa por el registro de plantillas: una clave retirada conserva su familia (migración 0071).
    expect(params).not.toContain("grammy-winners");
  });
});

describe("listCollectionFamilies", () => {
  it("devuelve las familias con contenido en el orden del registro, sin repetir", async () => {
    mocks.rows = [{ family: "discovery" }, { family: "awards" }, { family: "ephemeris" }];

    await expect(listCollectionFamilies()).resolves.toEqual(["ephemeris", "awards", "discovery"]);
  });

  it("sin colecciones no hay familias", async () => {
    await expect(listCollectionFamilies()).resolves.toEqual([]);
  });

  it("cuenta vigentes y archivadas, con listas públicas, visibles y con álbumes", async () => {
    await listCollectionFamilies();
    const { sql } = render(mocks.calls[0]!.where);
    expect(sql).toContain('"user_list"."moderation_status" =');
    expect(sql).toContain('exists (select 1 from "user_list_item"');
    expect(sql).toContain('"user_list_featured"."starts_at" <= now()');
    expect(sql).toContain('"user_list_featured"."expires_at" <= now()');
  });
});
