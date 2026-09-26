import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MBCreditRelation, MBRelease } from "../musicbrainz/types";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  transaction: vi.fn(),
  upsertArtistStub: vi.fn(),
}));
vi.mock("@/db", () => ({ db: { select: mocks.select, transaction: mocks.transaction } }));
vi.mock("./ingest-artist", () => ({ upsertArtistStub: mocks.upsertArtistStub }));

const { countWorkCredits, mapWorkRelations, saveWorkCredits } = await import("./work-credits");

function writer(mbid: string, name: string, type = "writer", extra: Partial<MBCreditRelation> = {}): MBCreditRelation {
  return { type, "target-type": "artist", artist: { id: mbid, name }, ...extra } as MBCreditRelation;
}

function performance(workMbid: string, title: string, relations: MBCreditRelation[], attributes: string[] = []): MBCreditRelation {
  return { type: "performance", "target-type": "work", attributes, work: { id: workMbid, title, relations } } as MBCreditRelation;
}

function releaseWith(tracks: { recordingMbid: string; relations: MBCreditRelation[] }[]): MBRelease {
  return {
    id: "release-mbid",
    title: "Álbum",
    media: [
      {
        position: 1,
        tracks: tracks.map((t, index) => ({
          position: index + 1,
          recording: { id: t.recordingMbid, title: `Pista ${index + 1}`, relations: t.relations },
        })),
      },
    ],
  };
}

/** Cadena de consulta encadenable que, al esperarse, resuelve `result`. */
function queryChain(result: unknown) {
  const chain: object = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "then") {
          return (resolve: (v: unknown) => void, reject: (e: unknown) => void) => Promise.resolve(result).then(resolve, reject);
        }
        return () => chain;
      },
    },
  );
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.upsertArtistStub.mockImplementation(async (mbid: string) => ({ id: `artist-${mbid}` }));
});

describe("mapWorkRelations", () => {
  it("toma la obra de cada grabación con sus autores de destino artista", () => {
    const full = releaseWith([
      {
        recordingMbid: "rec-1",
        relations: [
          performance("work-1", "Eyes Wide Open", [
            writer("a1", "Jerrod Bettis"),
            writer("a2", "Meghan Kabir"),
            writer("a3", "Audra Mae"),
          ]),
          // Una relación de personal de la grabación no es autoría.
          { type: "producer", "target-type": "artist", artist: { id: "p1", name: "Productor" } } as MBCreditRelation,
        ],
      },
    ]);
    const { works, byRecordingMbid } = mapWorkRelations(full);

    expect(works.get("work-1")).toMatchObject({ title: "Eyes Wide Open" });
    expect(works.get("work-1")?.credits.map((c) => [c.artistName, c.relationType])).toEqual([
      ["Jerrod Bettis", "writer"],
      ["Meghan Kabir", "writer"],
      ["Audra Mae", "writer"],
    ]);
    expect(byRecordingMbid.get("rec-1")).toEqual([{ workMbid: "work-1", attributes: [] }]);
    expect(countWorkCredits(full)).toBe(3);
  });

  it("una obra compartida por dos grabaciones se guarda una vez, con los atributos de cada vínculo", () => {
    const authors = [writer("a1", "Autora", "composer"), writer("a2", "Letrista", "lyricist")];
    const { works, byRecordingMbid } = mapWorkRelations(
      releaseWith([
        { recordingMbid: "rec-studio", relations: [performance("work-1", "Canción", authors)] },
        { recordingMbid: "rec-live", relations: [performance("work-1", "Canción", authors, ["live", "cover"])] },
      ]),
    );

    expect(works.size).toBe(1);
    expect(works.get("work-1")?.credits).toHaveLength(2);
    expect(byRecordingMbid.get("rec-live")).toEqual([{ workMbid: "work-1", attributes: ["cover", "live"] }]);
  });

  it("guarda la obra sin autores cuando MusicBrainz no los cargó", () => {
    const { works, byRecordingMbid } = mapWorkRelations(
      releaseWith([{ recordingMbid: "rec-3", relations: [performance("work-3", "Sin autores", [])] }]),
    );
    expect(works.get("work-3")?.credits).toEqual([]);
    expect(byRecordingMbid.get("rec-3")).toHaveLength(1);
  });

  it("ignora editoriales (destino sello) y deduplica relaciones repetidas", () => {
    const publisher = { type: "publishing", "target-type": "label", label: { id: "l1", name: "Editorial" } } as unknown as MBCreditRelation;
    const { works } = mapWorkRelations(
      releaseWith([
        { recordingMbid: "rec-1", relations: [performance("work-1", "Canción", [writer("a1", "Autora"), writer("a1", "Autora"), publisher])] },
      ]),
    );
    expect(works.get("work-1")?.credits.map((c) => c.artistMbid)).toEqual(["a1"]);
  });

  it("una edición sin obras no produce nada", () => {
    const { works, byRecordingMbid } = mapWorkRelations(releaseWith([{ recordingMbid: "rec-1", relations: [] }]));
    expect(works.size).toBe(0);
    expect(byRecordingMbid.size).toBe(0);
  });
});

describe("saveWorkCredits", () => {
  it("crea stubs una vez, hace upsert de obras, reemplaza vínculos y créditos y marca la edición", async () => {
    const full = releaseWith([
      { recordingMbid: "rec-1", relations: [performance("work-1", "Uno", [writer("a1", "Autora"), writer("a2", "Autor")])] },
      { recordingMbid: "rec-2", relations: [performance("work-1", "Uno", [writer("a1", "Autora")])] },
    ]);
    const selects = [
      [
        { id: "recording-1", mbid: "rec-1" },
        { id: "recording-2", mbid: "rec-2" },
      ],
      [{ recordingId: "recording-1" }, { recordingId: "recording-2" }],
    ];
    mocks.select.mockImplementation(() => queryChain(selects.shift()));
    const inserted: unknown[] = [];
    let deletes = 0;
    const tx = {
      insert: () => ({
        values: (values: unknown) => {
          inserted.push(values);
          return {
            onConflictDoUpdate: () => ({ returning: async () => [{ id: "work-row-1" }] }),
            onConflictDoNothing: async () => undefined,
          };
        },
      }),
      delete: () => {
        deletes += 1;
        return { where: async () => undefined };
      },
      update: () => ({ set: (values: unknown) => ({ where: async () => inserted.push(values) }) }),
    };
    mocks.transaction.mockImplementation(async (cb: (t: unknown) => Promise<unknown>) => cb(tx));

    await saveWorkCredits("release-1", full);

    expect(mocks.upsertArtistStub).toHaveBeenCalledTimes(2);
    expect(inserted[0]).toEqual({ mbid: "work-1", title: "Uno" });
    expect(inserted[1]).toEqual([
      { recordingId: "recording-1", workId: "work-row-1", attributes: [] },
      { recordingId: "recording-2", workId: "work-row-1", attributes: [] },
    ]);
    expect(inserted[2]).toEqual([
      { workId: "work-row-1", artistId: "artist-a1", relationType: "writer", attributes: [], creditedAs: null },
      { workId: "work-row-1", artistId: "artist-a2", relationType: "writer", attributes: [], creditedAs: null },
    ]);
    expect(inserted[3]).toMatchObject({ worksSyncedAt: expect.any(Date) });
    // Vínculos de las grabaciones de la edición + créditos de las obras tocadas.
    expect(deletes).toBe(2);
  });

  it("si falla a mitad, la transacción se revierte con el error y no marca la edición", async () => {
    mocks.select.mockImplementation(() => queryChain([]));
    mocks.transaction.mockRejectedValue(new Error("fallo a mitad"));
    await expect(saveWorkCredits("release-1", releaseWith([]))).rejects.toThrow("fallo a mitad");
  });
});
