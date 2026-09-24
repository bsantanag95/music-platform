import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { findOrResolveCover } from "./cover";
import type { ReleaseGroupRow } from "@/db/schema";

vi.mock("@/db", () => ({
  db: { update: vi.fn() },
}));

vi.mock("../cover-art", () => ({
  coverThumbUrl: vi.fn(
    (mbid: string) => `https://coverartarchive.org/release-group/${mbid}/front-250`,
  ),
  fetchCoverThumb: vi.fn(),
  resolveCoverThumbUrl: vi.fn(),
}));

vi.mock("./cover-mirror", () => ({
  isCoverMirrorEnabled: vi.fn(),
  mirrorCover: vi.fn(),
}));

const { db } = await import("@/db");
const { fetchCoverThumb } = await import("../cover-art");
const { isCoverMirrorEnabled, mirrorCover } = await import("./cover-mirror");

const DAY_MS = 24 * 60 * 60 * 1000;
const COVER_URL = "https://coverartarchive.org/release-group/mbid-rg-1/front-250";
const STORAGE_URL = "https://cdn.example.com/covers/mbid-rg-1/abcdef123456.webp";

type UpdateChain = {
  setValues: unknown[];
  set: Mock<(values: unknown) => UpdateChain>;
  where: Mock<(args: unknown) => Promise<void>>;
};

function makeUpdateChain(): UpdateChain {
  const chain: UpdateChain = {
    setValues: [],
    set: vi.fn((values: unknown) => {
      chain.setValues.push(values);
      return chain;
    }) as Mock<(values: unknown) => UpdateChain>,
    where: vi.fn(async () => {}) as Mock<(args: unknown) => Promise<void>>,
  };
  return chain;
}

function makeRg(overrides: Partial<ReleaseGroupRow> = {}): ReleaseGroupRow {
  return {
    id: "rg-1",
    mbid: "mbid-rg-1",
    title: "Album",
    category: "studio",
    coverThumbUrl: null,
    coverStorageKey: null,
    coverCheckedAt: null,
    coverBlockedAt: null,
    firstReleaseDate: null,
    firstReleaseYear: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe("findOrResolveCover", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isCoverMirrorEnabled).mockReturnValue(false);
  });

  it("devuelve la URL cacheada sin tocar la red ni la base", async () => {
    const result = await findOrResolveCover(makeRg({ coverThumbUrl: COVER_URL }));

    expect(result).toBe(COVER_URL);
    expect(fetchCoverThumb).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  it("una carátula retirada devuelve null sin consultar Cover Art Archive", async () => {
    const result = await findOrResolveCover(makeRg({ coverBlockedAt: new Date() }));

    expect(result).toBeNull();
    expect(fetchCoverThumb).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  it("un negativo reciente no se re-consulta", async () => {
    const result = await findOrResolveCover(
      makeRg({ coverCheckedAt: new Date(Date.now() - 1 * DAY_MS) }),
    );

    expect(result).toBeNull();
    expect(fetchCoverThumb).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  it("un negativo vencido se re-resuelve y espeja cuando el espejo está habilitado", async () => {
    vi.mocked(isCoverMirrorEnabled).mockReturnValue(true);
    vi.mocked(fetchCoverThumb).mockResolvedValue({
      status: "found",
      bytes: Buffer.from([1, 2, 3]),
    });
    vi.mocked(mirrorCover).mockResolvedValue(STORAGE_URL);

    const result = await findOrResolveCover(
      makeRg({ coverCheckedAt: new Date(Date.now() - 8 * DAY_MS) }),
    );

    expect(fetchCoverThumb).toHaveBeenCalledWith("mbid-rg-1");
    expect(mirrorCover).toHaveBeenCalled();
    expect(result).toBe(STORAGE_URL);
  });

  it("con el espejo deshabilitado guarda la URL de Cover Art Archive", async () => {
    const chain = makeUpdateChain();
    vi.mocked(db.update).mockReturnValue(chain as never);
    vi.mocked(fetchCoverThumb).mockResolvedValue({
      status: "found",
      bytes: Buffer.from([1, 2, 3]),
    });

    const result = await findOrResolveCover(makeRg());

    expect(mirrorCover).not.toHaveBeenCalled();
    expect(result).toBe(COVER_URL);
    expect(chain.setValues[0]).toMatchObject({ coverThumbUrl: COVER_URL });
  });

  it("un 404 persiste null y cover_checked_at", async () => {
    const chain = makeUpdateChain();
    vi.mocked(db.update).mockReturnValue(chain as never);
    vi.mocked(fetchCoverThumb).mockResolvedValue({ status: "missing" });

    const result = await findOrResolveCover(makeRg());

    expect(result).toBeNull();
    const setArg = chain.setValues[0] as { coverThumbUrl: unknown; coverCheckedAt: unknown };
    expect(setArg.coverThumbUrl).toBeNull();
    expect(setArg.coverCheckedAt).toBeInstanceOf(Date);
  });

  it("un error transitorio no escribe nada", async () => {
    vi.mocked(fetchCoverThumb).mockResolvedValue({ status: "transient" });

    const result = await findOrResolveCover(makeRg());

    expect(result).toBeNull();
    expect(db.update).not.toHaveBeenCalled();
    expect(mirrorCover).not.toHaveBeenCalled();
  });

  it("no consulta la red cuando el release-group no tiene mbid", async () => {
    const result = await findOrResolveCover(makeRg({ mbid: null }));

    expect(fetchCoverThumb).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });
});
