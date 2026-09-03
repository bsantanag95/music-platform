import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReleaseGroupRow } from "@/db/schema";
import { upsertReleaseGroupStub, upsertReleaseGroupStubs } from "./ingest-release-group";

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

const { db } = await import("@/db");

function makeRow(overrides: Partial<ReleaseGroupRow> = {}): ReleaseGroupRow {
  return {
    id: "local-id",
    mbid: "mbid-1",
    title: "Toxicity",
    category: "studio",
    coverThumbUrl: null,
    createdAt: new Date("2026-01-01"),
    ...overrides,
  };
}

/** `where(...)` es awaitable y además expone `.limit()` — como un query builder de Drizzle. */
function whereResult(rows: ReleaseGroupRow[]) {
  return {
    limit: vi.fn(async () => rows),
    then: (resolve: (value: ReleaseGroupRow[]) => unknown) => resolve(rows),
  };
}

function mockSelectSequence(sequence: ReleaseGroupRow[][]) {
  let call = 0;
  vi.mocked(db.select).mockImplementation(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => whereResult(sequence[call++] ?? [])),
    })),
  }) as never);
}

/** `onConflictDoNothing(...)` es awaitable y además expone `.returning()`. */
function mockInsert(returning: ReleaseGroupRow[]) {
  const captured: { values?: unknown } = {};
  vi.mocked(db.insert).mockImplementation(() => ({
    values: vi.fn((values: unknown) => {
      captured.values = values;
      return {
        onConflictDoNothing: vi.fn(() => ({
          returning: vi.fn(async () => returning),
          then: (resolve: (value: undefined) => unknown) => resolve(undefined),
        })),
      };
    }),
  }) as never);
  return captured;
}

describe("upsertReleaseGroupStub", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("crea el stub cuando el mbid no existe", async () => {
    mockSelectSequence([[], [makeRow()]]);
    mockInsert([makeRow()]);

    const row = await upsertReleaseGroupStub("mbid-1", "Toxicity", "studio");

    expect(row).toMatchObject({ mbid: "mbid-1", title: "Toxicity", category: "studio" });
  });

  it("es idempotente: devuelve la fila existente sin insertar", async () => {
    mockSelectSequence([[makeRow({ title: "Título original", coverThumbUrl: "url" })]]);
    const captured = mockInsert([]);

    const row = await upsertReleaseGroupStub("mbid-1", "Otro título", "single_ep");

    expect(row.title).toBe("Título original");
    expect(captured.values).toBeUndefined();
  });

  it("no sobrescribe una fila enriquecida ante el insert (DO NOTHING + releer)", async () => {
    // Primera lectura: no existe (carrera). El insert no devuelve fila. Se relee la existente.
    mockSelectSequence([[], [makeRow({ coverThumbUrl: "cacheada" })]]);
    mockInsert([]);

    const row = await upsertReleaseGroupStub("mbid-1", "Otro título", "single_ep");

    expect(row).toMatchObject({ mbid: "mbid-1", coverThumbUrl: "cacheada" });
  });
});

describe("upsertReleaseGroupStubs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("no toca la base con el conjunto vacío", async () => {
    await expect(upsertReleaseGroupStubs([])).resolves.toEqual([]);
    expect(db.insert).not.toHaveBeenCalled();
    expect(db.select).not.toHaveBeenCalled();
  });

  it("inserta todos los stubs en una sola operación DO NOTHING y resuelve las filas por mbid", async () => {
    const captured = mockInsert([]);
    mockSelectSequence([[makeRow({ id: "a", mbid: "mbid-1" }), makeRow({ id: "b", mbid: "mbid-2" })]]);

    const rows = await upsertReleaseGroupStubs([
      { mbid: "mbid-1", title: "Alpha", category: "studio" },
      { mbid: "mbid-2", title: "Beta", category: "single_ep" },
    ]);

    expect(db.insert).toHaveBeenCalledTimes(1);
    expect(captured.values).toEqual([
      { mbid: "mbid-1", title: "Alpha", category: "studio" },
      { mbid: "mbid-2", title: "Beta", category: "single_ep" },
    ]);
    expect(rows.map((row) => row.mbid)).toEqual(["mbid-1", "mbid-2"]);
  });
});
