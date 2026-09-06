import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RecordingRow } from "@/db/schema";
import {
  findOrIngestRecording,
  albumsFromMbReleases,
  localAppearanceAlbums,
  sortSongContextAlbums,
  type RecordingSeed,
} from "./ingest-recording";

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

vi.mock("./ingest-discography", () => ({ ingestCredits: vi.fn(async () => undefined) }));
vi.mock("./ingest-release-group", () => ({ upsertReleaseGroupStubs: vi.fn() }));

const { db } = await import("@/db");
const { ingestCredits } = await import("./ingest-discography");
const { upsertReleaseGroupStubs } = await import("./ingest-release-group");

function makeRecordingRow(overrides: Partial<RecordingRow> = {}): RecordingRow {
  return {
    id: "rec-local",
    mbid: "mbid-rec",
    title: "Stairway to Heaven",
    durationSec: 482,
    variantType: "original",
    variantOfId: null,
    ...overrides,
  };
}

/** `where(...)` expone `.limit()` y es awaitable — como un query builder de Drizzle. */
function whereResult(rows: RecordingRow[]) {
  return {
    limit: vi.fn(async () => rows),
    then: (resolve: (value: RecordingRow[]) => unknown) => resolve(rows),
  };
}

function mockSelectSequence(sequence: RecordingRow[][]) {
  let call = 0;
  vi.mocked(db.select).mockImplementation(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => whereResult(sequence[call++] ?? [])),
    })),
  }) as never);
}

function mockInsert(returning: RecordingRow[]) {
  const captured: { values?: unknown } = {};
  vi.mocked(db.insert).mockImplementation(() => ({
    values: vi.fn((values: unknown) => {
      captured.values = values;
      return {
        onConflictDoNothing: vi.fn(() => ({
          returning: vi.fn(async () => returning),
          then: (resolve: (value: undefined) => unknown) => resolve(undefined),
        })),
      };
    }),
  }) as never);
  return captured;
}

const seed = (overrides: Partial<RecordingSeed> = {}): RecordingSeed => ({
  mbid: "mbid-rec",
  title: "Stairway to Heaven",
  durationSec: 482,
  credits: [
    { name: "Led Zeppelin", joinphrase: "", artist: { id: "led-zeppelin-mbid", name: "Led Zeppelin" } },
  ],
  ...overrides,
});

describe("findOrIngestRecording", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("crea la grabación nueva e ingiere sus créditos", async () => {
    mockSelectSequence([[], [makeRecordingRow()]]);
    const captured = mockInsert([makeRecordingRow()]);

    const row = await findOrIngestRecording(seed());

    expect(captured.values).toMatchObject({ mbid: "mbid-rec", title: "Stairway to Heaven", durationSec: 482 });
    expect(ingestCredits).toHaveBeenCalledWith(seed().credits, { recordingId: "rec-local" });
    expect(row.mbid).toBe("mbid-rec");
  });

  it("es idempotente: la fila existente no se re-inserta ni re-escribe", async () => {
    mockSelectSequence([[makeRecordingRow({ title: "Título enriquecido" })]]);
    const captured = mockInsert([]);

    const row = await findOrIngestRecording(seed({ title: "Otro título" }));

    expect(row.title).toBe("Título enriquecido");
    expect(captured.values).toBeUndefined();
    expect(ingestCredits).not.toHaveBeenCalled();
  });

  it("relee la fila ante una carrera (insert sin returning)", async () => {
    mockSelectSequence([[], [makeRecordingRow()]]);
    mockInsert([]);

    const row = await findOrIngestRecording(seed());

    expect(row.id).toBe("rec-local");
  });

  it("nunca escribe release ni track: el único insert es sobre recording", async () => {
    mockSelectSequence([[], [makeRecordingRow()]]);
    const captured = mockInsert([makeRecordingRow()]);

    await findOrIngestRecording(seed({ credits: [] }));

    expect(db.insert).toHaveBeenCalledTimes(1);
    expect(captured.values).not.toHaveProperty("releaseId");
    expect(captured.values).not.toHaveProperty("recordingId");
    expect(ingestCredits).not.toHaveBeenCalled();
  });
});

describe("albumsFromMbReleases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const releaseItem = (
    releaseMbid: string,
    rgMbid: string,
    rgTitle: string,
    date: string | undefined,
    extra: Record<string, unknown> = {},
  ) => ({
    id: releaseMbid,
    title: "x",
    date,
    "release-group": { id: rgMbid, title: rgTitle, ...extra },
  });

  it("agrupa releases por release_group y conserva el año más antiguo", async () => {
    vi.mocked(upsertReleaseGroupStubs).mockResolvedValue([
      {
        id: "rg-local",
        mbid: "rg-mbid",
        title: "Led Zeppelin IV",
        category: "studio",
        coverThumbUrl: null,
        createdAt: new Date(),
      },
    ]);

    const albums = await albumsFromMbReleases([
      releaseItem("r-2015", "rg-mbid", "Led Zeppelin IV", "2015-01-01", { "primary-type": "Album" }),
      releaseItem("r-1971", "rg-mbid", "Led Zeppelin IV", "1971-11-08", { "primary-type": "Album" }),
    ]);

    expect(upsertReleaseGroupStubs).toHaveBeenCalledWith([
      { mbid: "rg-mbid", title: "Led Zeppelin IV", category: "studio" },
    ]);
    expect(albums).toEqual([
      {
        releaseGroupId: "rg-local",
        mbid: "rg-mbid",
        title: "Led Zeppelin IV",
        category: "studio",
        year: 1971,
      },
    ]);
  });

  it("descarta releases sin release-group y usa la fila local como fuente de título/categoría", async () => {
    vi.mocked(upsertReleaseGroupStubs).mockResolvedValue([
      {
        id: "rg-local",
        mbid: "rg-mbid",
        title: "Título local enriquecido",
        category: "compilation",
        coverThumbUrl: null,
        createdAt: new Date(),
      },
    ]);

    const albums = await albumsFromMbReleases([
      { id: "r-sin-rg", title: "sin grupo" },
      releaseItem("r-1", "rg-mbid", "Título de MB", "1974", { "primary-type": "Album" }),
    ]);

    expect(albums).toEqual([
      expect.objectContaining({
        mbid: "rg-mbid",
        title: "Título local enriquecido",
        category: "compilation",
        year: 1974,
      }),
    ]);
  });

  it("conjunto vacío no consulta la base", async () => {
    vi.mocked(upsertReleaseGroupStubs).mockResolvedValue([]);
    await expect(albumsFromMbReleases([])).resolves.toEqual([]);
    expect(upsertReleaseGroupStubs).toHaveBeenCalledWith([]);
  });
});

describe("localAppearanceAlbums", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("agrupa tracks por álbum y toma el año más antiguo del release ingerido", async () => {
    const rows = [
      {
        releaseGroupId: "rg-a",
        mbid: "mbid-a",
        title: "Led Zeppelin IV",
        category: "studio",
        releaseDate: "1971-11-08",
      },
      {
        releaseGroupId: "rg-a",
        mbid: "mbid-a",
        title: "Led Zeppelin IV",
        category: "studio",
        releaseDate: "2015-01-01",
      },
      {
        releaseGroupId: "rg-b",
        mbid: "mbid-b",
        title: "Compilation",
        category: "compilation",
        releaseDate: null,
      },
    ];
    vi.mocked(db.select).mockImplementation(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn(async () => rows),
            })),
          })),
        })),
      })),
    }) as never);

    const albums = await localAppearanceAlbums("rec-local");

    expect(albums).toEqual([
      {
        releaseGroupId: "rg-a",
        mbid: "mbid-a",
        title: "Led Zeppelin IV",
        category: "studio",
        year: 1971,
      },
      {
        releaseGroupId: "rg-b",
        mbid: "mbid-b",
        title: "Compilation",
        category: "compilation",
        year: null,
      },
    ]);
  });
});

describe("sortSongContextAlbums", () => {
  it("ordena por categoría, luego año (null al final) y luego título", () => {
    const sorted = sortSongContextAlbums([
      { releaseGroupId: "d", mbid: null, title: "Live", category: "live_other", year: 1970 },
      { releaseGroupId: "c", mbid: null, title: "Sin año", category: "studio", year: null },
      { releaseGroupId: "a", mbid: null, title: "ZZ", category: "studio", year: 1971 },
      { releaseGroupId: "b", mbid: null, title: "AA", category: "studio", year: 1971 },
      { releaseGroupId: "e", mbid: null, title: "Best Of", category: "compilation", year: 1990 },
      { releaseGroupId: "f", mbid: null, title: "Single", category: "single_ep", year: 1968 },
    ]);

    expect(sorted.map((album) => album.releaseGroupId)).toEqual(["b", "a", "c", "f", "e", "d"]);
  });
});
