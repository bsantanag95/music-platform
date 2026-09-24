import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReleaseGroupRow } from "@/db/schema";

vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("@/db", () => ({ db: { update: vi.fn() } }));
vi.mock("./ingest-release", () => ({ findOrIngestTracklist: vi.fn() }));
vi.mock("../cover-art", () => ({
  resolveCoverThumbUrl: vi.fn(),
  fetchCoverThumb: vi.fn(),
}));
vi.mock("./cover-mirror", () => ({
  isCoverMirrorEnabled: vi.fn(),
  mirrorCover: vi.fn(),
}));

const { after } = await import("next/server");
const { db } = await import("@/db");
const { resolveCoverThumbUrl, fetchCoverThumb } = await import("../cover-art");
const { isCoverMirrorEnabled, mirrorCover } = await import("./cover-mirror");
const { resolveAlbumCover } = await import("./album-detail");

const DAY_MS = 24 * 60 * 60 * 1000;
const MBID = "mbid-rg-1";
const COVER_URL = `https://coverartarchive.org/release-group/${MBID}/front-250`;

function makeRg(overrides: Partial<ReleaseGroupRow> = {}): ReleaseGroupRow {
  return {
    id: "rg-1",
    mbid: MBID,
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

function makeUpdateChain() {
  const setValues: unknown[] = [];
  const chain = {
    setValues,
    set: vi.fn((values: unknown) => {
      setValues.push(values);
      return chain;
    }),
    where: vi.fn(async () => {}),
  };
  vi.mocked(db.update).mockReturnValue(chain as never);
  return chain;
}

describe("resolveAlbumCover (SSR del detalle de álbum)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isCoverMirrorEnabled).mockReturnValue(false);
  });

  it("usa el HEAD y agenda el espejo con after()", async () => {
    const chain = makeUpdateChain();
    vi.mocked(resolveCoverThumbUrl).mockResolvedValue(COVER_URL);
    vi.mocked(isCoverMirrorEnabled).mockReturnValue(true);
    vi.mocked(fetchCoverThumb).mockResolvedValue({
      status: "found",
      bytes: Buffer.from([1, 2, 3]),
    });

    let scheduled: (() => Promise<void>) | null = null;
    vi.mocked(after).mockImplementation((task) => {
      scheduled = task as () => Promise<void>;
    });

    const result = await resolveAlbumCover(makeRg());

    expect(resolveCoverThumbUrl).toHaveBeenCalledWith(MBID);
    expect(result).toBe(COVER_URL);
    expect(chain.setValues[0]).toMatchObject({ coverThumbUrl: COVER_URL });
    expect(after).toHaveBeenCalledTimes(1);

    await scheduled!();
    expect(fetchCoverThumb).toHaveBeenCalledWith(MBID);
    expect(mirrorCover).toHaveBeenCalled();
  });

  it("no agenda espejo cuando la carátula ya está en el storage", async () => {
    makeUpdateChain();
    vi.mocked(isCoverMirrorEnabled).mockReturnValue(true);

    const result = await resolveAlbumCover(
      makeRg({ coverThumbUrl: "https://cdn.example.com/covers/x.webp", coverStorageKey: "covers/x.webp" }),
    );

    expect(result).toBe("https://cdn.example.com/covers/x.webp");
    expect(resolveCoverThumbUrl).not.toHaveBeenCalled();
    expect(after).not.toHaveBeenCalled();
  });

  it("una carátula retirada devuelve null sin HEAD ni espejo", async () => {
    const result = await resolveAlbumCover(makeRg({ coverBlockedAt: new Date() }));

    expect(result).toBeNull();
    expect(resolveCoverThumbUrl).not.toHaveBeenCalled();
    expect(after).not.toHaveBeenCalled();
  });

  it("un negativo reciente devuelve null sin HEAD", async () => {
    const result = await resolveAlbumCover(
      makeRg({ coverCheckedAt: new Date(Date.now() - 1 * DAY_MS) }),
    );

    expect(result).toBeNull();
    expect(resolveCoverThumbUrl).not.toHaveBeenCalled();
  });

  it("sin carátula en CAA no escribe verificación (el HEAD no distingue 404 de error)", async () => {
    vi.mocked(resolveCoverThumbUrl).mockResolvedValue(null);

    const result = await resolveAlbumCover(makeRg());

    expect(result).toBeNull();
    expect(db.update).not.toHaveBeenCalled();
    expect(after).not.toHaveBeenCalled();
  });
});
