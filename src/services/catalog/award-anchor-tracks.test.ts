import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ db: { select: vi.fn(), selectDistinct: vi.fn() } }));
vi.mock("./ingest-release", () => ({ findOrIngestTracklist: vi.fn() }));

const { db } = await import("@/db");
const { findOrIngestTracklist } = await import("./ingest-release");
const { ensureAnchorTracks } = await import("./award-anchor-tracks");

/** Respuestas sucesivas de "¿tiene pistas?": cada elemento es la fila (o ninguna) de esa consulta. */
function mockTrackChecks(sequence: boolean[]) {
  let call = 0;
  vi.mocked(db.select).mockImplementation(
    () =>
      ({
        from: () => ({ where: () => ({ limit: async () => (sequence[call++] ? [{ id: "t1" }] : []) }) }),
      }) as never,
  );
}

function mockAnchors(anchors: { id: string; mbid: string | null }[]) {
  vi.mocked(db.selectDistinct).mockImplementation(
    () => ({ from: () => ({ innerJoin: () => ({ where: () => ({ limit: async () => anchors }) }) }) }) as never,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("ensureAnchorTracks", () => {
  it("no consulta nada si la grabación ya tiene pistas", async () => {
    mockTrackChecks([true]);
    expect(await ensureAnchorTracks("rec-1")).toBe(false);
    expect(db.selectDistinct).not.toHaveBeenCalled();
    expect(findOrIngestTracklist).not.toHaveBeenCalled();
  });

  it("ingiere la lista de pistas del disco ancla y avisa que ingirió", async () => {
    mockTrackChecks([false, true]);
    mockAnchors([{ id: "rg-1", mbid: "mbid-rg-1" }]);
    vi.mocked(findOrIngestTracklist).mockResolvedValue(null);
    expect(await ensureAnchorTracks("rec-1")).toBe(true);
    expect(findOrIngestTracklist).toHaveBeenCalledWith("rg-1", "mbid-rg-1");
  });

  it("sin disco ancla no hace nada", async () => {
    mockTrackChecks([false]);
    mockAnchors([]);
    expect(await ensureAnchorTracks("rec-1")).toBe(false);
    expect(findOrIngestTracklist).not.toHaveBeenCalled();
  });

  it("una caída al ingerir no rompe la ficha y prueba el siguiente ancla", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockTrackChecks([false, true]);
    mockAnchors([
      { id: "rg-1", mbid: "mbid-rg-1" },
      { id: "rg-2", mbid: "mbid-rg-2" },
    ]);
    vi.mocked(findOrIngestTracklist).mockRejectedValueOnce(new Error("MusicBrainz 503")).mockResolvedValueOnce(null);
    expect(await ensureAnchorTracks("rec-1")).toBe(true);
    expect(findOrIngestTracklist).toHaveBeenCalledTimes(2);
    expect(error).toHaveBeenCalledOnce();
    error.mockRestore();
  });

  it("si tras ingerir el disco la grabación sigue sin pistas, devuelve false", async () => {
    mockTrackChecks([false, false]);
    mockAnchors([{ id: "rg-1", mbid: "mbid-rg-1" }]);
    vi.mocked(findOrIngestTracklist).mockResolvedValue(null);
    expect(await ensureAnchorTracks("rec-1")).toBe(false);
  });
});
