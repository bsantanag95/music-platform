import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  tasks: [] as (() => Promise<void>)[],
  run: vi.fn(),
  afterThrows: false,
}));

vi.mock("next/server", () => ({
  after: (task: () => Promise<void>) => {
    if (mocks.afterThrows) throw new Error("after fuera de una request");
    mocks.tasks.push(task);
  },
}));
vi.mock("@/services/catalog/ingest-discography", () => ({ runDiscographySync: mocks.run }));

const { discographyPrefetchCandidates, scheduleGenreArtistsDiscographySync } = await import("./artist-prefetch");

const artist = (id: string, over: Record<string, unknown> = {}) => ({ id, discographyComplete: false, hasMbid: true, ...over });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.tasks.length = 0;
  mocks.afterThrows = false;
  mocks.run.mockResolvedValue(undefined);
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("discographyPrefetchCandidates", () => {
  it("toma los 3 primeros sin explorar, en orden de aparición", () => {
    const artists = [artist("a"), artist("b", { discographyComplete: true }), artist("c"), artist("d"), artist("e"), artist("f")];
    expect(discographyPrefetchCandidates(artists)).toEqual(["a", "c", "d"]);
  });

  it("omite los que no tienen MBID (no hay a quién pedirle)", () => {
    expect(discographyPrefetchCandidates([artist("a", { hasMbid: false }), artist("b")])).toEqual(["b"]);
  });

  it("sin candidatos devuelve vacío", () => {
    expect(discographyPrefetchCandidates([artist("a", { discographyComplete: true })])).toEqual([]);
    expect(discographyPrefetchCandidates([])).toEqual([]);
  });
});

describe("scheduleGenreArtistsDiscographySync", () => {
  it("programa un solo after() que sincroniza uno tras otro y no ejecuta nada de inmediato", async () => {
    scheduleGenreArtistsDiscographySync([artist("a"), artist("b"), artist("c"), artist("d")]);
    expect(mocks.tasks).toHaveLength(1);
    expect(mocks.run).not.toHaveBeenCalled();

    const order: string[] = [];
    mocks.run.mockImplementation(async (id: string) => {
      order.push(`inicio ${id}`);
      await Promise.resolve();
      order.push(`fin ${id}`);
    });
    await mocks.tasks[0]!();
    expect(order).toEqual(["inicio a", "fin a", "inicio b", "fin b", "inicio c", "fin c"]);
  });

  it("si todos están explorados no programa nada", () => {
    scheduleGenreArtistsDiscographySync([artist("a", { discographyComplete: true })]);
    expect(mocks.tasks).toHaveLength(0);
  });

  it("fuera de una request no lanza", () => {
    mocks.afterThrows = true;
    expect(() => scheduleGenreArtistsDiscographySync([artist("a")])).not.toThrow();
    expect(console.warn).toHaveBeenCalled();
  });
});
