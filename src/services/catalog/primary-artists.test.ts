import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ db: { select: vi.fn() } }));

const { db } = await import("@/db");
const { resolvePrimaryArtists, slugArtistName } = await import("./primary-artists");

interface Row {
  id: string;
  name: string;
  type: string | null;
  position: number;
  releaseGroupId?: string | null;
  recordingId?: string | null;
}

function mockRows(releaseGroups: Row[], recordings: Row[]) {
  vi.mocked(db.select).mockImplementation(((selection: Record<string, unknown>) => {
    const rows = "recordingId" in selection ? recordings : releaseGroups;
    const chain = {
      from: () => chain,
      innerJoin: () => chain,
      where: () => chain,
      orderBy: () => Promise.resolve(rows),
    };
    return chain;
  }) as never);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("resolvePrimaryArtists", () => {
  it("toma el primer crédito principal por posición", async () => {
    mockRows(
      [
        { id: "b", name: "Segundo", type: "group", position: 2, releaseGroupId: "rg-1" },
        { id: "a", name: "Primero", type: "group", position: 0, releaseGroupId: "rg-1" },
        { id: "c", name: "Otro", type: "person", position: 1, releaseGroupId: "rg-2" },
      ],
      [{ id: "r", name: "De la canción", type: "person", position: 0, recordingId: "rec-1" }],
    );

    const { releaseGroups, recordings } = await resolvePrimaryArtists({
      releaseGroupIds: ["rg-1", "rg-2"],
      recordingIds: ["rec-1"],
    });
    expect(releaseGroups.get("rg-1")).toEqual({ id: "a", name: "Primero", type: "group" });
    expect(releaseGroups.get("rg-2")).toEqual({ id: "c", name: "Otro", type: "person" });
    expect(recordings.get("rec-1")).toEqual({ id: "r", name: "De la canción", type: "person" });
  });

  it("lote vacío: no consulta y devuelve mapas vacíos", async () => {
    mockRows([], []);
    const result = await resolvePrimaryArtists({});
    expect(result.releaseGroups.size).toBe(0);
    expect(result.recordings.size).toBe(0);
    expect(db.select).not.toHaveBeenCalled();
  });

  it("lote mixto: la misma llamada resuelve álbumes y canciones", async () => {
    mockRows(
      [{ id: "a", name: "Banda", type: "group", position: 0, releaseGroupId: "rg-1" }],
      [{ id: "b", name: "Solista", type: "person", position: 0, recordingId: "rec-1" }],
    );
    const result = await resolvePrimaryArtists({
      releaseGroupIds: ["rg-1"],
      recordingIds: ["rec-1"],
    });
    expect(db.select).toHaveBeenCalledTimes(2);
    expect(result.releaseGroups.get("rg-1")?.name).toBe("Banda");
    expect(result.recordings.get("rec-1")?.name).toBe("Solista");
  });

  it("slugArtistName marca `various` como sin artista", () => {
    expect(slugArtistName({ id: "v", name: "Various Artists", type: "various" })).toBeNull();
    expect(slugArtistName({ id: "a", name: "Pink Floyd", type: "group" })).toBe("Pink Floyd");
    expect(slugArtistName(null)).toBeNull();
    expect(slugArtistName(undefined)).toBeNull();
  });
});
