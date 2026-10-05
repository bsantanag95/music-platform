import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  tasks: [] as (() => Promise<void>)[],
  enrich: vi.fn(),
}));

vi.mock("next/server", () => ({ after: (task: () => Promise<void>) => mocks.tasks.push(task) }));
vi.mock("./about-sync", async () => {
  const actual = await vi.importActual<typeof import("./about-sync")>("./about-sync");
  return { ...actual, enrichGenreFromWikimedia: mocks.enrich };
});
// El módulo real de about-sync importa la base; se evita con un mock mínimo.
vi.mock("@/db", () => ({ db: {} }));
vi.mock("../wikimedia/client", () => ({ wikimedia: {} }));

const { scheduleGenreAboutSync } = await import("./about-schedule");

const genre = (over: Record<string, unknown> = {}) =>
  ({ id: "g1", slug: "shoegaze", kind: "style", wikimediaSyncedAt: null, ...over }) as never;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.tasks.length = 0;
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("scheduleGenreAboutSync", () => {
  it("agenda la sincronización de un género nunca sincronizado y no la ejecuta de inmediato", async () => {
    scheduleGenreAboutSync(genre());
    expect(mocks.tasks).toHaveLength(1);
    expect(mocks.enrich).not.toHaveBeenCalled();
    await mocks.tasks[0]!();
    expect(mocks.enrich).toHaveBeenCalledWith("g1");
  });

  it("no agenda nada si el texto está vigente", () => {
    scheduleGenreAboutSync(genre({ wikimediaSyncedAt: new Date(Date.now() - 24 * 60 * 60 * 1000) }));
    expect(mocks.tasks).toHaveLength(0);
  });

  it("agenda si el texto tiene más de 30 días", () => {
    scheduleGenreAboutSync(genre({ wikimediaSyncedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000) }));
    expect(mocks.tasks).toHaveLength(1);
  });

  it("no agenda descriptores ni ocultos", () => {
    scheduleGenreAboutSync(genre({ kind: "descriptor" }));
    expect(mocks.tasks).toHaveLength(0);
  });

  it("un fallo de Wikimedia se registra y no se propaga", async () => {
    mocks.enrich.mockRejectedValue(new Error("Wikimedia respondió 503"));
    scheduleGenreAboutSync(genre());
    await expect(mocks.tasks[0]!()).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });
});
