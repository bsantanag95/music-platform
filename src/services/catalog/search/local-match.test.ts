import { describe, expect, it, vi } from "vitest";

const select = vi.fn();
vi.mock("@/db", () => ({ db: { select: (...args: unknown[]) => select(...args) } }));

const { rankByMatchTier, recordingSignals, recordingsByArtistsAndTitlePrefix } = await import("./local-match");

/** Consulta encadenable de drizzle que, al esperarla, devuelve `rows`. */
function query(rows: unknown[]) {
  const chain: Record<string, unknown> = {};
  for (const method of ["from", "innerJoin", "where", "orderBy", "groupBy", "limit"]) chain[method] = () => chain;
  chain.then = (resolve: (value: unknown[]) => unknown) => resolve(rows);
  return chain;
}

describe("rankByMatchTier", () => {
  it("antepone exactas y palabras completas a subcadenas a mitad de palabra", () => {
    // Orden de similitud tal como podría devolverlo la base.
    const bySimilarity = ["Jack Perricone", "Ennio Morricone", "Despised Icon", "Icon", "ICON"];
    expect(rankByMatchTier(bySimilarity, (name) => name, "icon")).toEqual([
      "Icon",
      "ICON",
      "Despised Icon",
      "Jack Perricone",
      "Ennio Morricone",
    ]);
  });

  it("dentro de un mismo nivel conserva el orden de la base", () => {
    const rows = [{ name: "Icon", id: "b" }, { name: "Icon", id: "a" }];
    expect(rankByMatchTier(rows, (row) => row.name, "icon").map((row) => row.id)).toEqual([
      "b",
      "a",
    ]);
  });
});

describe("señales de las sugerencias de canción (openspec: improve-song-suggestions)", () => {
  it("sin candidatos no consulta la base", async () => {
    select.mockClear();
    const signals = await recordingSignals([]);
    expect(select).not.toHaveBeenCalled();
    expect(signals.artistByRecording.size).toBe(0);
    expect(await recordingsByArtistsAndTitlePrefix([], "one", 10)).toEqual([]);
    expect(await recordingsByArtistsAndTitlePrefix(["metallica"], "  ", 10)).toEqual([]);
    expect(select).not.toHaveBeenCalled();
  });

  it("toma el primer artista principal por posición y convierte las cifras", async () => {
    select.mockReset();
    select
      .mockReturnValueOnce(query([])) // subconsulta de artistas principales (no se espera)
      .mockReturnValueOnce(
        query([
          { recordingId: "one", id: "metallica", name: "Metallica", syncedAt: new Date("2026-01-01") },
          { recordingId: "one", id: "guest", name: "Invitado", syncedAt: null },
          { recordingId: "cover", id: "quartet", name: "Midnite String Quartet", syncedAt: null },
        ]),
      )
      .mockReturnValueOnce(query([{ recordingId: "one", albums: "3" }]))
      .mockReturnValueOnce(query([{ artistId: "metallica", followers: "2" }]));

    const signals = await recordingSignals(["one", "cover", "one"]);

    expect(signals.artistByRecording.get("one")).toEqual({ id: "metallica", name: "Metallica", explored: true });
    expect(signals.artistByRecording.get("cover")).toEqual({ id: "quartet", name: "Midnite String Quartet", explored: false });
    expect(signals.albumsByRecording.get("one")).toBe(3);
    expect(signals.albumsByRecording.has("cover")).toBe(false);
    expect(signals.followersByArtist.get("metallica")).toBe(2);
  });
});
