import { describe, expect, it, vi } from "vitest";
import { countsByListId, deriveJourneyState, progressDetailsByListId } from "./progress";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn() },
}));

vi.mock("@/db", () => ({ db: mocks.db }));

function chain(result: unknown) {
  const obj: Record<string, unknown> = {
    from: () => obj,
    leftJoin: () => obj,
    innerJoin: () => obj,
    where: () => obj,
    groupBy: () => obj,
    then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return obj;
}

describe("deriveJourneyState", () => {
  it("archivado tiene prioridad sobre cualquier progreso", () => {
    expect(deriveJourneyState(new Date(), 5, 5)).toBe("archived");
    expect(deriveJourneyState(new Date(), 0, 0)).toBe("archived");
  });

  it("selección vacía nunca es completo", () => {
    expect(deriveJourneyState(null, 0, 0)).toBe("in_progress");
  });

  it("completo solo cuando todo lo seleccionado está escuchado", () => {
    expect(deriveJourneyState(null, 3, 3)).toBe("complete");
    expect(deriveJourneyState(null, 3, 2)).toBe("in_progress");
  });
});

describe("countsByListId", () => {
  it("devuelve un mapa vacío sin listIds, sin llamar a la base", async () => {
    const result = await countsByListId("tracker-1", []);
    expect(result.size).toBe(0);
    expect(mocks.db.select).not.toHaveBeenCalled();
  });

  it("mapea selected/listened por listId, parametrizado por trackerId", async () => {
    mocks.db.select.mockReturnValue(
      chain([
        { listId: "list-1", selected: 3, listened: 2 },
        { listId: "list-2", selected: 1, listened: 1 },
      ]),
    );

    const result = await countsByListId("tracker-1", ["list-1", "list-2"]);

    expect(result.get("list-1")).toEqual({ selected: 3, listened: 2 });
    expect(result.get("list-2")).toEqual({ selected: 1, listened: 1 });
  });

  it("una lista sin filas coincidentes no aparece en el mapa (el llamador decide el default)", async () => {
    mocks.db.select.mockReturnValue(chain([]));

    const result = await countsByListId("tracker-1", ["list-1"]);

    expect(result.has("list-1")).toBe(false);
  });
});

// openspec: redesign-progress-views, D1
describe("progressDetailsByListId", () => {
  const pending = (
    listId: string,
    title: string,
    position: number,
    firstReleaseDate: string | null,
    year: number | null,
  ) => ({
    listId,
    position,
    id: `${title}-id`,
    title,
    firstReleaseDate,
    year,
    artistName: "Artista",
  });

  it("sin listas no consulta la base", async () => {
    mocks.db.select.mockClear();
    expect((await progressDetailsByListId("t", [])).size).toBe(0);
    expect(mocks.db.select).not.toHaveBeenCalled();
  });

  it("discografía: el siguiente es el más antiguo; lista: el primero por posición; última escucha en ISO", async () => {
    mocks.db.select
      .mockReturnValueOnce(chain([{ listId: "disc", last: "2026-03-01 10:00:00+00" }]))
      .mockReturnValueOnce(
        chain([
          pending("disc", "Hysteria", 1, "1987-08-03", 1987),
          pending("disc", "Sin fecha", 2, null, null),
          pending("disc", "Pyromania", 3, null, 1983),
          pending("list", "Tercero", 3, "1970-01-01", 1970),
          pending("list", "Segundo", 2, "2020-01-01", 2020),
        ]),
      );

    const result = await progressDetailsByListId("t", [
      { id: "disc", order: "release" },
      { id: "list", order: "position" },
      { id: "done", order: "position" },
    ]);

    expect(result.get("disc")).toEqual({
      nextUp: { id: "Pyromania-id", title: "Pyromania", artistName: "Artista", year: 1983 },
      lastListenedAt: "2026-03-01T10:00:00.000Z",
    });
    expect(result.get("list")?.nextUp?.title).toBe("Segundo");
    expect(result.get("list")?.lastListenedAt).toBeNull();
    // Todo escuchado (o vacía): sin siguiente.
    expect(result.get("done")).toEqual({ nextUp: null, lastListenedAt: null });
  });
});
