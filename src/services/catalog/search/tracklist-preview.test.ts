// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

// Cada `db.select()` devuelve una cadena que se resuelve con la siguiente respuesta de la cola.
const mocks = vi.hoisted(() => ({ queue: [] as unknown[][], ingest: vi.fn() }));
vi.mock("@/db", () => {
  const chain = (): unknown => {
    const result = mocks.queue.shift() ?? [];
    const proxy: Record<string, unknown> = {};
    for (const method of ["from", "where", "innerJoin", "orderBy", "limit"]) proxy[method] = () => proxy;
    proxy.then = (resolve: (value: unknown) => void) => resolve(result);
    return proxy;
  };
  return { db: { select: vi.fn(chain) } };
});
// Si alguien la importara, la ingesta quedaría registrada aquí.
vi.mock("../ingest-release", () => ({ findOrIngestTracklist: mocks.ingest }));

const { getStoredTracklistPreview } = await import("./tracklist-preview");

describe("getStoredTracklistPreview (redesign-search-phase2)", () => {
  beforeEach(() => {
    mocks.queue = [];
    mocks.ingest.mockReset();
  });

  it("sin edición representativa guardada: null y sin ingesta", async () => {
    mocks.queue.push([]);
    await expect(getStoredTracklistPreview("rg")).resolves.toBeNull();
    expect(mocks.ingest).not.toHaveBeenCalled();
  });

  it("con edición guardada: primeras canciones y total", async () => {
    mocks.queue.push([{ id: "rel" }], [{ title: "In the Flesh?" }, { title: "The Thin Ice" }], [{ total: 26 }]);
    await expect(getStoredTracklistPreview("rg", 2)).resolves.toEqual({ titles: ["In the Flesh?", "The Thin Ice"], total: 26 });
    expect(mocks.ingest).not.toHaveBeenCalled();
  });

  it("edición sin pistas: null", async () => {
    mocks.queue.push([{ id: "rel" }], [], [{ total: 0 }]);
    await expect(getStoredTracklistPreview("rg")).resolves.toBeNull();
  });
});
