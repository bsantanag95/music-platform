import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { findOrIngestTracklist } from "./ingest-release";
import * as schema from "@/db/schema";

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/services/musicbrainz/client", () => ({
  musicbrainz: {
    getReleaseGroup: vi.fn(),
    getRelease: vi.fn(),
  },
}));

vi.mock("./ingest-discography", () => ({
  ingestCredits: vi.fn(),
}));

const { db } = await import("@/db");
const { musicbrainz } = await import("@/services/musicbrainz/client");
const { ingestCredits } = await import("./ingest-discography");

function makeSelectChain(rows: unknown[] = []) {
  const chain = {
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    limit: vi.fn(async () => rows),
  };
  return chain;
}

// La cadena insert().values().onConflictDoUpdate().returning() de drizzle se
// mockea con tipos explícitos: sin declarar los parámetros, `mock.calls` queda
// tipado como tupla vacía y el checker rechaza `calls[0][0]`.
type InsertChain = {
  values: Mock<(values: unknown) => InsertChain>;
  onConflictDoUpdate: Mock<(args: unknown) => InsertChain>;
  returning: Mock<() => Promise<schema.ReleaseRow[]>>;
};

function makeInsertChain(returnRow: schema.ReleaseRow): InsertChain {
  const chain: InsertChain = {
    values: vi.fn(() => chain) as Mock<(values: unknown) => InsertChain>,
    onConflictDoUpdate: vi.fn(() => chain) as Mock<(args: unknown) => InsertChain>,
    returning: vi.fn(async () => [returnRow]),
  };
  return chain;
}

function makeReleaseRow(overrides: Partial<schema.ReleaseRow> = {}): schema.ReleaseRow {
  return {
    id: "r-1",
    mbid: "mbid-r-1",
    releaseGroupId: "rg-1",
    editionLabel: "standard",
    releaseDate: null,
    coverThumbUrl: null,
    creditsSyncedAt: null,
    ...overrides,
  };
}

type UpdateChain = {
  set: Mock<(values: unknown) => UpdateChain>;
  where: Mock<() => Promise<void>>;
};

function makeUpdateChain(): UpdateChain {
  const chain: UpdateChain = {
    set: vi.fn(() => chain) as Mock<(values: unknown) => UpdateChain>,
    where: vi.fn(async () => undefined),
  };
  return chain;
}

describe("findOrIngestTracklist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.select).mockReturnValue(makeSelectChain() as never);
  });

  it("ingiere una edición con fecha anual (1985) sin enviar el valor a la base", async () => {
    vi.mocked(musicbrainz.getReleaseGroup).mockResolvedValue({
      id: "mbid-rg-1",
      title: "Icon",
      releases: [{ id: "mbid-r-1", status: "Official", date: "1985" }],
    });
    vi.mocked(musicbrainz.getRelease).mockResolvedValue({
      id: "mbid-r-1",
      title: "Icon",
      date: "1985",
    });

    const insertChain = makeInsertChain(makeReleaseRow());
    vi.mocked(db.insert).mockReturnValue(insertChain as never);

    const result = await findOrIngestTracklist("rg-1", "mbid-rg-1");

    expect(result).not.toBeNull();
    const valuesArg = insertChain.values.mock.calls[0]?.[0] as { releaseDate: unknown };
    expect(valuesArg.releaseDate).toBeNull();
    expect(db.insert).toHaveBeenCalled();
  });

  it("convierte una fecha anual a null en el onConflictDoUpdate (upsert idempotente)", async () => {
    vi.mocked(musicbrainz.getReleaseGroup).mockResolvedValue({
      id: "mbid-rg-1",
      title: "Icon",
      releases: [{ id: "mbid-r-1", status: "Official", date: "1985" }],
    });
    vi.mocked(musicbrainz.getRelease).mockResolvedValue({
      id: "mbid-r-1",
      title: "Icon",
      date: "1985",
    });

    const insertChain = makeInsertChain(makeReleaseRow());
    vi.mocked(db.insert).mockReturnValue(insertChain as never);

    await findOrIngestTracklist("rg-1", "mbid-rg-1");

    const updateArg = insertChain.onConflictDoUpdate.mock.calls[0]?.[0] as {
      set: { releaseDate: unknown };
    };
    expect(updateArg.set.releaseDate).toBeNull();
  });

  it("ingiere la edición sin resolver la carátula (vive en release_group)", async () => {
    vi.mocked(musicbrainz.getReleaseGroup).mockResolvedValue({
      id: "mbid-rg-1",
      title: "Album",
      releases: [{ id: "mbid-r-1", status: "Official", date: "1973-03-01" }],
    });
    vi.mocked(musicbrainz.getRelease).mockResolvedValue({
      id: "mbid-r-1",
      title: "Album",
      date: "1973-03-01",
    });

    const insertChain = makeInsertChain(makeReleaseRow());
    vi.mocked(db.insert).mockReturnValue(insertChain as never);

    await findOrIngestTracklist("rg-1", "mbid-rg-1");

    const valuesArg = insertChain.values.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(valuesArg).not.toHaveProperty("coverThumbUrl");
    expect(db.update).not.toHaveBeenCalled();
  });

  it("devuelve la release existente sin re-resolver la carátula (self-heal en cover.ts)", async () => {
    const existing = makeReleaseRow({ coverThumbUrl: null, creditsSyncedAt: new Date() });
    vi.mocked(db.select).mockReturnValue(makeSelectChain([existing]) as never);

    const result = await findOrIngestTracklist("rg-1", "mbid-rg-1");

    expect(result?.coverThumbUrl).toBeNull();
    expect(db.update).not.toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("elige la edición representativa (original) frente a una reedición deluxe", async () => {
    vi.mocked(musicbrainz.getReleaseGroup).mockResolvedValue({
      id: "mbid-rg-1",
      title: "Album",
      releases: [
        { id: "mbid-deluxe", status: "Official", date: "2015-06-01", title: "Album (Deluxe Edition)" },
        { id: "mbid-original", status: "Official", date: "1994-09-13" },
      ],
    });
    vi.mocked(musicbrainz.getRelease).mockResolvedValue({
      id: "mbid-original",
      title: "Album",
      date: "1994-09-13",
    });

    const insertChain = makeInsertChain(makeReleaseRow());
    vi.mocked(db.insert).mockReturnValue(insertChain as never);

    await findOrIngestTracklist("rg-1", "mbid-rg-1");

    expect(musicbrainz.getRelease).toHaveBeenCalledWith("mbid-original");
    const valuesArg = insertChain.values.mock.calls[0]?.[0] as { editionLabel: unknown };
    expect(valuesArg.editionLabel).toBe("standard");
  });

  it("deriva editionLabel de la disambiguation en vez de 'original' fijo", async () => {
    vi.mocked(musicbrainz.getReleaseGroup).mockResolvedValue({
      id: "mbid-rg-1",
      title: "Album",
      releases: [{ id: "mbid-r-1", status: "Official", date: "1994", disambiguation: "Japanese edition" }],
    });
    vi.mocked(musicbrainz.getRelease).mockResolvedValue({ id: "mbid-r-1", title: "Album", date: "1994" });

    const insertChain = makeInsertChain(makeReleaseRow());
    vi.mocked(db.insert).mockReturnValue(insertChain as never);

    await findOrIngestTracklist("rg-1", "mbid-rg-1");

    const valuesArg = insertChain.values.mock.calls[0]?.[0] as { editionLabel: unknown };
    expect(valuesArg.editionLabel).toBe("Japanese edition");
  });

  it("persiste la fecha canónica del release-group desde first-release-date de MusicBrainz", async () => {
    vi.mocked(musicbrainz.getReleaseGroup).mockResolvedValue({
      id: "mbid-rg-1",
      title: "Album",
      "first-release-date": "1973-03-24",
      releases: [{ id: "mbid-r-1", status: "Official", date: "2011-01-01" }],
    });
    vi.mocked(musicbrainz.getRelease).mockResolvedValue({ id: "mbid-r-1", title: "Album", date: "2011-01-01" });

    const insertChain = makeInsertChain(makeReleaseRow());
    vi.mocked(db.insert).mockReturnValue(insertChain as never);
    const updateChain = makeUpdateChain();
    vi.mocked(db.update).mockReturnValue(updateChain as never);

    await findOrIngestTracklist("rg-1", "mbid-rg-1");

    const setArg = updateChain.set.mock.calls[0]?.[0] as {
      firstReleaseDate: unknown;
      firstReleaseYear: unknown;
    };
    expect(setArg.firstReleaseDate).toBe("1973-03-24");
    expect(setArg.firstReleaseYear).toBe(1973);
    // la fecha de la edición ingerida sigue siendo la suya, no la canónica
    const valuesArg = insertChain.values.mock.calls[0]?.[0] as { releaseDate: unknown };
    expect(valuesArg.releaseDate).toBe("2011-01-01");
  });

  it("con first-release-date anual solo puebla el año canónico", async () => {
    vi.mocked(musicbrainz.getReleaseGroup).mockResolvedValue({
      id: "mbid-rg-1",
      title: "Album",
      "first-release-date": "1985",
      releases: [{ id: "mbid-r-1", status: "Official", date: "1985" }],
    });
    vi.mocked(musicbrainz.getRelease).mockResolvedValue({ id: "mbid-r-1", title: "Album", date: "1985" });

    vi.mocked(db.insert).mockReturnValue(makeInsertChain(makeReleaseRow()) as never);
    const updateChain = makeUpdateChain();
    vi.mocked(db.update).mockReturnValue(updateChain as never);

    await findOrIngestTracklist("rg-1", "mbid-rg-1");

    const setArg = updateChain.set.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(setArg).not.toHaveProperty("firstReleaseDate");
    expect(setArg.firstReleaseYear).toBe(1985);
  });

  it("devuelve null cuando el release-group no tiene ediciones ingeribles", async () => {
    vi.mocked(musicbrainz.getReleaseGroup).mockResolvedValue({
      id: "mbid-rg-1",
      title: "Album",
      releases: [],
    });

    const result = await findOrIngestTracklist("rg-1", "mbid-rg-1");

    expect(result).toBeNull();
    expect(musicbrainz.getRelease).not.toHaveBeenCalled();
  });

  it("devuelve la release existente sin llamar a MusicBrainz aunque creditsSyncedAt sea NULL", async () => {
    // El path de lectura nunca re-sincroniza créditos: una caída de
    // MusicBrainz no debe romper la vista de álbum. El backfill es el
    // script scripts/backfill-release-credits.ts.
    const existing = makeReleaseRow({ creditsSyncedAt: null });
    vi.mocked(db.select).mockReturnValue(makeSelectChain([existing]) as never);

    const result = await findOrIngestTracklist("rg-1", "mbid-rg-1");

    expect(result).toEqual(existing);
    expect(musicbrainz.getRelease).not.toHaveBeenCalled();
    expect(ingestCredits).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
  });
});
