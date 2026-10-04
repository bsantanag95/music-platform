import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";
import { listMyRatings } from "./my-ratings";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn() },
}));

vi.mock("@/db", () => ({ db: mocks.db }));

const dialect = new PgDialect();

// Espías de la última consulta de conteo y de lista, para inspeccionar el WHERE y el ORDER BY.
const spies = { countWhere: vi.fn(), listWhere: vi.fn(), orderBy: vi.fn() };

function mockCountQuery(count: number, albums = count, songs = 0) {
  spies.countWhere = vi.fn().mockResolvedValue([{ count, albums, songs }]);
  mocks.db.select.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      leftJoin: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          where: spies.countWhere,
        }),
      }),
    }),
  });
}

function mockListQuery(rows: unknown[]) {
  const offset = vi.fn().mockResolvedValue(rows);
  const limit = vi.fn(() => ({ offset }));
  spies.orderBy = vi.fn(() => ({ limit }));
  const orderBy = spies.orderBy;
  spies.listWhere = vi.fn(() => ({ orderBy }));
  const where = spies.listWhere;
  const leftJoin2 = vi.fn(() => ({ where }));
  const leftJoin1 = vi.fn(() => ({ leftJoin: leftJoin2 }));
  mocks.db.select.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({ leftJoin: leftJoin1 }),
  });
}

function mockYearsQuery(years: (number | null)[]) {
  const orderBy = vi.fn().mockResolvedValue(years.map((year) => ({ year })));
  const where = vi.fn(() => ({ orderBy }));
  const leftJoin2 = vi.fn(() => ({ where }));
  const leftJoin1 = vi.fn(() => ({ leftJoin: leftJoin2 }));
  mocks.db.select.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({ leftJoin: leftJoin1 }),
  });
}

function mockAllQueries(
  count: number,
  rows: unknown[],
  years: (number | null)[] = [],
  counts?: { albums: number; songs: number },
) {
  mockCountQuery(count, counts?.albums, counts?.songs);
  mockListQuery(rows);
  mockYearsQuery(years);
}

const userId = "00000000-0000-4000-8000-000000000001";

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "00000000-0000-4000-8000-aaaaaaaaaaaa",
    stars: "4.0",
    detailedScore: 78,
    updatedAt: new Date("2026-01-01"),
    artistId: null,
    releaseGroupId: "00000000-0000-4000-8000-bbbbbbbbbbbb",
    recordingId: null,
    releaseTitle: "The Dark Side of the Moon",
    releaseCover: "https://example.com/cover.jpg",
    releaseYear: 1973,
    recordingTitle: null,
    creditedArtist: "Pink Floyd",
    creditedArtistId: "00000000-0000-4000-8000-cccccccccccc",
    recordingCover: null,
    recordingYear: null,
    ...overrides,
  };
}

describe("listMyRatings", () => {
  it("devuelve solo filas del usuario con paginación y facetas", async () => {
    const row = makeRow();
    mockAllQueries(1, [row], [1973]);
    const result = await listMyRatings(userId, 1, 20);
    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.targetType).toBe("release-group");
    expect(result.items[0]!.target.title).toBe("The Dark Side of the Moon");
    expect(result.items[0]!.target.year).toBe(1973);
    expect(result.facets.years).toEqual([1973]);
    expect(result.hasNext).toBe(false);
  });

  it("indica hasNext cuando hay más filas que pageSize", async () => {
    const rows = Array.from({ length: 21 }, (_, i) => makeRow({ id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}` }));
    mockAllQueries(21, rows, [1973]);
    const result = await listMyRatings(userId, 1, 20);
    expect(result.items).toHaveLength(20);
    expect(result.hasNext).toBe(true);
    expect(result.total).toBe(21);
  });

  it("serializa una canción con año del álbum más antiguo", async () => {
    const row = makeRow({
      id: "00000000-0000-4000-8000-dddddddddddd",
      releaseGroupId: null,
      recordingId: "00000000-0000-4000-8000-eeeeeeeeeeee",
      releaseTitle: null,
      releaseCover: null,
      releaseYear: null,
      recordingTitle: "Comfortably Numb",
      recordingCover: "https://example.com/rec-cover.jpg",
      recordingYear: 1979,
    });
    mockAllQueries(1, [row], [1979]);
    const result = await listMyRatings(userId);
    expect(result.items[0]!.targetType).toBe("recording");
    expect(result.items[0]!.target.title).toBe("Comfortably Numb");
    expect(result.items[0]!.target.year).toBe(1979);
    expect(result.items[0]!.target.coverThumbUrl).toBe("https://example.com/rec-cover.jpg");
  });

  it("rechaza paginación inválida", async () => {
    await expect(listMyRatings(userId, 0, 20)).rejects.toThrow("paginación");
    await expect(listMyRatings(userId, 1, 0)).rejects.toThrow("paginación");
    await expect(listMyRatings(userId, 1, 51)).rejects.toThrow("paginación");
  });

  it("rechaza un orden inválido", async () => {
    await expect(listMyRatings(userId, 1, 20, { sort: "invalid" as "best" })).rejects.toThrow("orden");
  });
  it("devuelve el desglose por tipo junto con el total", async () => {
    mockAllQueries(15, [makeRow()], [], { albums: 12, songs: 3 });
    const result = await listMyRatings(userId);
    expect(result.total).toBe(15);
    expect(result.counts).toEqual({ "release-group": 12, recording: 3 });
  });

  it("con group=type (por defecto) antepone el rango de tipo al orden elegido", async () => {
    mockAllQueries(1, [makeRow()]);
    await listMyRatings(userId, 1, 20, { sort: "recent" });
    const withGroup = spies.orderBy.mock.calls[0]!.length;

    mockAllQueries(1, [makeRow()]);
    await listMyRatings(userId, 1, 20, { sort: "recent", group: "none" });
    const withoutGroup = spies.orderBy.mock.calls[0]!.length;

    expect(withGroup).toBe(withoutGroup + 1);
  });

  it("con group=artist ordena por artista, luego tipo y luego el orden elegido", async () => {
    mockAllQueries(1, [makeRow()]);
    await listMyRatings(userId, 1, 20, { sort: "recent", group: "artist" });
    const args = spies.orderBy.mock.calls[0]! as unknown as Parameters<PgDialect["sqlToQuery"]>[0][];

    mockAllQueries(1, [makeRow()]);
    await listMyRatings(userId, 1, 20, { sort: "recent", group: "none" });
    const plain = spies.orderBy.mock.calls[0]!.length;

    // nombre del artista + id del artista + rango de tipo delante del orden elegido
    expect(args.length).toBe(plain + 3);
    const rendered = args.slice(0, 3).map((arg) => dialect.sqlToQuery(arg).sql);
    expect(rendered[0]).toMatch(/lower\(/i);
    expect(rendered[0]).toMatch(/nulls last/i);
    expect(rendered[1]).toMatch(/nulls last/i);
    expect(rendered[2]).toContain("CASE WHEN");
  });

  it("group=artist no se confunde con group=type", async () => {
    mockAllQueries(1, [makeRow()]);
    await listMyRatings(userId, 1, 20, { sort: "recent", group: "type" });
    const typeArgs = spies.orderBy.mock.calls[0]!.length;
    mockAllQueries(1, [makeRow()]);
    await listMyRatings(userId, 1, 20, { sort: "recent", group: "artist" });
    expect(spies.orderBy.mock.calls[0]!.length).toBe(typeArgs + 2);
  });

  it("el rango de tipo pone los álbumes antes que las canciones", async () => {
    mockAllQueries(1, [makeRow()]);
    await listMyRatings(userId, 1, 20, { sort: "best" });
    const first = spies.orderBy.mock.calls[0]![0] as Parameters<PgDialect["sqlToQuery"]>[0];
    const { sql: text } = dialect.sqlToQuery(first);
    expect(text).toContain("CASE WHEN");
    expect(text).toContain("release_group_id");
    expect(text).toContain("THEN 0 ELSE 1");
  });

  it("aplica la búsqueda a la lista y al conteo, sobre título y artista", async () => {
    mockAllQueries(1, [makeRow()]);
    await listMyRatings(userId, 1, 20, { q: "floyd" });
    for (const spy of [spies.countWhere, spies.listWhere]) {
      const condition = spy.mock.calls[0]![0] as Parameters<PgDialect["sqlToQuery"]>[0];
      const query = dialect.sqlToQuery(condition);
      expect(query.params).toContain("%floyd%");
      expect(query.sql.toLowerCase()).toContain("ilike");
    }
  });

  it("escapa los comodines de LIKE en la búsqueda", async () => {
    mockAllQueries(0, []);
    await listMyRatings(userId, 1, 20, { q: "100%_" });
    const condition = spies.listWhere.mock.calls[0]![0] as Parameters<PgDialect["sqlToQuery"]>[0];
    expect(dialect.sqlToQuery(condition).params).toContain(String.raw`%100\%\_%`);
  });

  it("una búsqueda vacía no agrega condición", async () => {
    mockAllQueries(0, []);
    await listMyRatings(userId, 1, 20, { q: "   " });
    const condition = spies.listWhere.mock.calls[0]![0] as Parameters<PgDialect["sqlToQuery"]>[0];
    expect(dialect.sqlToQuery(condition).sql.toLowerCase()).not.toContain("ilike");
  });

  it("rechaza una agrupación o una búsqueda inválidas", async () => {
    await expect(listMyRatings(userId, 1, 20, { group: "album" as "type" })).rejects.toThrow("agrupación");
    await expect(listMyRatings(userId, 1, 20, { q: "x".repeat(101) })).rejects.toThrow("búsqueda");
  });
});
