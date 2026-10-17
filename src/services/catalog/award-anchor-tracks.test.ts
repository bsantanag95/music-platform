import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ db: { selectDistinct: vi.fn() } }));
vi.mock("./ingest-release", () => ({ findOrIngestTracklist: vi.fn() }));

const { db } = await import("@/db");
const { findOrIngestTracklist } = await import("./ingest-release");
const { ensureAnchorTracks } = await import("./award-anchor-tracks");

function mockAnchors(anchors: { id: string; mbid: string | null }[]) {
  vi.mocked(db.selectDistinct).mockImplementation(
    () => ({ from: () => ({ innerJoin: () => ({ where: () => ({ limit: async () => anchors }) }) }) }) as never,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("ensureAnchorTracks", () => {
  it("ingiere la lista de pistas del disco ancla de la nominación", async () => {
    mockAnchors([{ id: "rg-1", mbid: "mbid-rg-1" }]);
    vi.mocked(findOrIngestTracklist).mockResolvedValue(null);
    await ensureAnchorTracks("rec-1");
    expect(findOrIngestTracklist).toHaveBeenCalledWith("rg-1", "mbid-rg-1");
  });

  it("sin disco ancla (grabación que no viene de los premios) no hace nada", async () => {
    mockAnchors([]);
    await ensureAnchorTracks("rec-1");
    expect(findOrIngestTracklist).not.toHaveBeenCalled();
  });

  it("prueba cada disco ancla", async () => {
    mockAnchors([
      { id: "rg-1", mbid: "mbid-rg-1" },
      { id: "rg-2", mbid: "mbid-rg-2" },
    ]);
    vi.mocked(findOrIngestTracklist).mockResolvedValue(null);
    await ensureAnchorTracks("rec-1");
    expect(findOrIngestTracklist).toHaveBeenCalledTimes(2);
  });

  it("una caída al ingerir no rompe la ficha y sigue con el siguiente ancla", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockAnchors([
      { id: "rg-1", mbid: "mbid-rg-1" },
      { id: "rg-2", mbid: "mbid-rg-2" },
    ]);
    vi.mocked(findOrIngestTracklist).mockRejectedValueOnce(new Error("MusicBrainz 503")).mockResolvedValueOnce(null);
    await expect(ensureAnchorTracks("rec-1")).resolves.toBeUndefined();
    expect(findOrIngestTracklist).toHaveBeenCalledTimes(2);
    expect(error).toHaveBeenCalledOnce();
    error.mockRestore();
  });
});
