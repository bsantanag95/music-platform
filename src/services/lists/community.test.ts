import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listFeaturedLists, listPopularLists, listsFromFollowing, MIN_POPULAR_SAVES } from "./community";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn() },
  enrichLists: vi.fn(),
  generatedRefsFor: vi.fn(),
  savedStateFor: vi.fn(),
  saveCountsFor: vi.fn(),
}));

vi.mock("@/db", () => ({ db: mocks.db }));
vi.mock("./lists", () => ({ enrichLists: mocks.enrichLists }));
vi.mock("@/services/discovery/collections/generated", () => ({ generatedRefsFor: mocks.generatedRefsFor }));
vi.mock("./saved-lists", () => ({
  savedStateFor: mocks.savedStateFor,
  saveCountsFor: mocks.saveCountsFor,
}));

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

const reader = "00000000-0000-4000-8000-000000000001";
const listId = "00000000-0000-4000-8000-000000000003";

const row = {
  id: listId,
  entityType: "release-group",
  title: "Esenciales",
  description: null,
  createdAt: new Date("2026-03-01T00:00:00Z"),
  updatedAt: new Date("2026-03-01T00:00:00Z"),
  ownerId: "00000000-0000-4000-8000-000000000002",
  ownerUsername: "curador",
  ownerDisplayName: null,
  isOfficial: false,
};

const officialRow = {
  ...row,
  id: "00000000-0000-4000-8000-0000000000ff",
  title: "Editorial oficial",
  ownerUsername: "exploracion",
  isOfficial: true,
};

describe("servicio de listas de la comunidad", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.enrichLists.mockResolvedValue(
      new Map([[listId, { itemCount: 5, coverThumbs: ["a"] }]]),
    );
    mocks.savedStateFor.mockResolvedValue(new Map());
    mocks.saveCountsFor.mockResolvedValue(new Map([[listId, 7]]));
    mocks.generatedRefsFor.mockResolvedValue(new Map());
  });

  it("Destacadas: enriquece sin paginar", async () => {
    mocks.enrichLists.mockResolvedValue(new Map([[officialRow.id, { itemCount: 3, coverThumbs: ["a"] }]]));
    mocks.db.select.mockReturnValueOnce(chain([officialRow]));
    const result = await listFeaturedLists(reader);
    expect(result.lists).toHaveLength(1);
    expect(result.lists[0]?.itemCount).toBe(3);
    expect(result.lists[0]?.saveCount).toBeUndefined();
  });

  it("Destacadas: excluye toda lista con fila en `user_list_featured`: una colección no es una lista", async () => {
    let captured: unknown;
    const builder: Record<string, unknown> = {
      from: () => builder,
      innerJoin: () => builder,
      where: (condition: unknown) => {
        captured = condition;
        return builder;
      },
      orderBy: () => Promise.resolve([]),
    };
    mocks.db.select.mockReturnValueOnce(builder);

    await listFeaturedLists(reader);

    // Una sola consulta, y solo por listas oficiales: las colecciones de Explorar quedan fuera (ADR 0038).
    expect(mocks.db.select).toHaveBeenCalledTimes(1);
    const { sql, params } = new PgDialect().sqlToQuery(captured as SQL);
    // Ni las generadas ni las curadas con fila destacada: la exclusión no filtra por `source`.
    expect(sql).toContain("not exists");
    expect(sql).toContain("from user_list_featured");
    expect(sql).not.toContain("ulf.source");
    expect(sql).toContain('"user_list"."is_official" =');
    expect(params).not.toContain("curated");
    expect(params).not.toContain("template");
  });

  it("Destacadas: solo listas editoriales oficiales, de la más reciente a la más antigua", async () => {
    const older = { ...officialRow, id: "00000000-0000-4000-8000-0000000000f1" };
    mocks.enrichLists.mockResolvedValue(
      new Map([
        [officialRow.id, { itemCount: 3, coverThumbs: [] }],
        [older.id, { itemCount: 4, coverThumbs: [] }],
      ]),
    );
    // El orden lo fija la consulta (`official_published_at` desc); el servicio lo conserva.
    mocks.db.select.mockReturnValueOnce(chain([officialRow, older]));
    const result = await listFeaturedLists(reader);
    expect(result.lists.map((l) => l.id)).toEqual([officialRow.id, older.id]);
    expect(result.lists[0]?.isOfficial).toBe(true);
  });

  it("Destacadas: omite las listas vacías", async () => {
    const other = { ...officialRow, id: "00000000-0000-4000-8000-0000000000f2" };
    mocks.enrichLists.mockResolvedValue(
      new Map([
        [officialRow.id, { itemCount: 0, coverThumbs: [] }],
        [other.id, { itemCount: 5, coverThumbs: [] }],
      ]),
    );
    mocks.db.select.mockReturnValueOnce(chain([officialRow, other]));
    const result = await listFeaturedLists(reader);
    expect(result.lists.map((l) => l.id)).toEqual([other.id]);
  });

  it("Populares: adjunta el conteo agregado de guardados", async () => {
    mocks.db.select.mockReturnValueOnce(chain([{ ...row, saves: 7 }]));
    const result = await listPopularLists(reader, 1, 20);
    expect(result.lists[0]?.saveCount).toBe(7);
    expect(mocks.saveCountsFor).toHaveBeenCalled();
  });

  it("Populares: exige un mínimo de guardados, no solo uno", async () => {
    let having: unknown;
    const builder: Record<string, unknown> = {
      from: () => builder,
      innerJoin: () => builder,
      where: () => builder,
      groupBy: () => builder,
      having: (condition: unknown) => {
        having = condition;
        return builder;
      },
      orderBy: () => builder,
      limit: () => builder,
      offset: () => Promise.resolve([]),
    };
    mocks.db.select.mockReturnValueOnce(builder);

    await listPopularLists(reader, 1, 20);

    const { sql, params } = new PgDialect().sqlToQuery(having as SQL);
    expect(sql).toContain("count(");
    expect(sql).toContain(">=");
    expect(params).toContain(MIN_POPULAR_SAVES);
    expect(MIN_POPULAR_SAVES).toBeGreaterThanOrEqual(2);
  });

  it("Populares: valida la paginación", async () => {
    await expect(listPopularLists(reader, 0)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("De seguidos: sin lector responde AUTH_REQUIRED", async () => {
    await expect(
      listsFromFollowing("" as unknown as string),
    ).rejects.toMatchObject({ code: "AUTH_REQUIRED" });
  });

  it("De seguidos: mapea filas y marca hasNext", async () => {
    const many = Array.from({ length: 21 }, (_, i) => ({ ...row, id: `${listId}-${i}` }));
    mocks.db.select.mockReturnValueOnce(chain(many));
    mocks.enrichLists.mockResolvedValue(new Map());
    const result = await listsFromFollowing(reader, 1, 20);
    expect(result.lists).toHaveLength(20);
    expect(result.hasNext).toBe(true);
  });
});
