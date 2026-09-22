import { describe, expect, it, vi } from "vitest";
import { countsByListId, deriveJourneyState } from "./progress";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn() },
}));

vi.mock("@/db", () => ({ db: mocks.db }));

function chain(result: unknown) {
  const obj: Record<string, unknown> = {
    from: () => obj,
    leftJoin: () => obj,
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
