import { describe, expect, it, vi, beforeEach } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import {
  CONVERGENCE_MAX_ITEMS,
  CONVERGENCE_MIN_PEOPLE,
  CONVERGENCE_NAME_SAMPLE,
  getNetworkConvergence,
} from "./convergence";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn(), execute: vi.fn() },
}));

vi.mock("@/db", () => ({ db: mocks.db }));

const dialect = new PgDialect();

// `db.select({...}).from(t).where(cond)` es thenable en drizzle — el mock
// resuelve al array de filas.
function selectResolves(rows: unknown[]) {
  return { from: () => ({ where: () => Promise.resolve(rows) }) };
}

const viewer = "00000000-0000-4000-8000-000000000001";

function personSample(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    username: `user${i}`,
    displayName: `User ${i}`,
  }));
}

function convergenceRow(over: Record<string, unknown> = {}) {
  return {
    release_group_id: "00000000-0000-4000-8000-0000000000a1",
    recording_id: null,
    people: 3,
    last_at: new Date("2026-09-08T00:00:00Z"),
    title: "Currents",
    cover_thumb_url: "https://cover/1.jpg",
    artist_name: "Tame Impala",
    people_sample: personSample(3),
    ...over,
  };
}

describe("getNetworkConvergence", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve items vacíos y no ejecuta la consulta cuando el lector no sigue a nadie", async () => {
    mocks.db.select.mockReturnValueOnce(selectResolves([]));

    const result = await getNetworkConvergence(viewer);

    expect(result).toEqual({ items: [] });
    expect(mocks.db.execute).not.toHaveBeenCalled();
  });

  it("excluye a los seguidos bloqueados en cualquier dirección; si no queda ninguno, no ejecuta la consulta", async () => {
    mocks.db.select
      .mockReturnValueOnce(selectResolves([{ id: "f1" }, { id: "f2" }]))
      .mockReturnValueOnce(
        selectResolves([
          { blockerId: viewer, blockedId: "f1" },
          { blockerId: "f2", blockedId: viewer },
        ]),
      );

    const result = await getNetworkConvergence(viewer);

    expect(result).toEqual({ items: [] });
    expect(mocks.db.execute).not.toHaveBeenCalled();
  });

  it("mapea una obra convergente con su recuento, artista y muestra de nombres", async () => {
    mocks.db.select
      .mockReturnValueOnce(selectResolves([{ id: "f1" }, { id: "f2" }, { id: "f3" }]))
      .mockReturnValueOnce(selectResolves([]));
    mocks.db.execute.mockResolvedValueOnce([convergenceRow()]);

    const { items } = await getNetworkConvergence(viewer);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      target: {
        type: "release-group",
        id: "00000000-0000-4000-8000-0000000000a1",
        title: "Currents",
        artistName: "Tame Impala",
      },
      peopleCount: 3,
      lastInteractionAt: "2026-09-08T00:00:00.000Z",
    });
    expect(items[0]!.peopleSample).toHaveLength(3);
  });

  it("cuenta una canción como su propia obra (target recording)", async () => {
    mocks.db.select
      .mockReturnValueOnce(selectResolves([{ id: "f1" }, { id: "f2" }, { id: "f3" }]))
      .mockReturnValueOnce(selectResolves([]));
    mocks.db.execute.mockResolvedValueOnce([
      convergenceRow({
        release_group_id: null,
        recording_id: "00000000-0000-4000-8000-0000000000b2",
        cover_thumb_url: null,
        title: "The Less I Know the Better",
      }),
    ]);

    const { items } = await getNetworkConvergence(viewer);

    expect(items[0]!.target.type).toBe("recording");
    expect(items[0]!.target.id).toBe("00000000-0000-4000-8000-0000000000b2");
  });

  it("recorta la muestra de nombres a CONVERGENCE_NAME_SAMPLE sin tocar el recuento", async () => {
    mocks.db.select
      .mockReturnValueOnce(selectResolves([{ id: "f1" }, { id: "f2" }, { id: "f3" }]))
      .mockReturnValueOnce(selectResolves([]));
    mocks.db.execute.mockResolvedValueOnce([
      convergenceRow({ people: 6, people_sample: personSample(6) }),
    ]);

    const { items } = await getNetworkConvergence(viewer);

    expect(items[0]!.peopleCount).toBe(6);
    expect(items[0]!.peopleSample).toHaveLength(CONVERGENCE_NAME_SAMPLE);
  });

  it("descarta filas sin título (defensivo)", async () => {
    mocks.db.select
      .mockReturnValueOnce(selectResolves([{ id: "f1" }, { id: "f2" }, { id: "f3" }]))
      .mockReturnValueOnce(selectResolves([]));
    mocks.db.execute.mockResolvedValueOnce([convergenceRow({ title: null })]);

    const { items } = await getNetworkConvergence(viewer);

    expect(items).toEqual([]);
  });

  it("la consulta parametriza los seguidos visibles, la ventana y el umbral", async () => {
    mocks.db.select
      .mockReturnValueOnce(selectResolves([{ id: "f1" }, { id: "f2" }, { id: "f3" }]))
      .mockReturnValueOnce(selectResolves([{ blockerId: viewer, blockedId: "f2" }]));
    mocks.db.execute.mockResolvedValueOnce([]);

    await getNetworkConvergence(viewer);

    const built = mocks.db.execute.mock.calls[0]![0] as SQL;
    const { params, sql: text } = dialect.sqlToQuery(built);
    // f2 quedó bloqueado → no aparece; f1 y f3 sí
    expect(params).toContain("f1");
    expect(params).toContain("f3");
    expect(params).not.toContain("f2");
    expect(params).toContain(CONVERGENCE_MIN_PEOPLE);
    expect(params).toContain(CONVERGENCE_MAX_ITEMS);
    // una fecha de corte (Date) entre los parámetros
    expect(params.some((p) => p instanceof Date)).toBe(true);
    expect(text.toLowerCase()).toContain("count(distinct user_id)");
  });
});
