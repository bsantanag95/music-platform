import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { findOrResolveCover } from "./cover";
import type { ReleaseGroupRow } from "@/db/schema";

vi.mock("@/db", () => ({
  db: { update: vi.fn() },
}));

vi.mock("../cover-art", () => ({
  resolveCoverThumbUrl: vi.fn(),
}));

const { db } = await import("@/db");
const { resolveCoverThumbUrl } = await import("../cover-art");

type UpdateChain = {
  set: Mock<(values: unknown) => UpdateChain>;
  where: Mock<(args: unknown) => UpdateChain>;
  returning: Mock<() => Promise<{ coverThumbUrl: string | null }[]>>;
};

function makeUpdateChain(cover: string | null): UpdateChain {
  const chain: UpdateChain = {
    set: vi.fn(() => chain) as Mock<(values: unknown) => UpdateChain>,
    where: vi.fn(() => chain) as Mock<(args: unknown) => UpdateChain>,
    returning: vi.fn(async () => [{ coverThumbUrl: cover }]),
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
    createdAt: new Date(),
    ...overrides,
  };
}

const COVER_URL = "https://coverartarchive.org/release-group/mbid-rg-1/front-250";

describe("findOrResolveCover", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("devuelve el cache hit sin tocar la red ni la base", async () => {
    const rg = makeRg({ coverThumbUrl: COVER_URL });

    const result = await findOrResolveCover(rg);

    expect(result).toBe(COVER_URL);
    expect(resolveCoverThumbUrl).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  it("resuelve contra Cover Art Archive y persiste el resultado en release_group", async () => {
    vi.mocked(resolveCoverThumbUrl).mockResolvedValue(COVER_URL);
    const updateChain = makeUpdateChain(COVER_URL);
    vi.mocked(db.update).mockReturnValue(updateChain as never);

    const result = await findOrResolveCover(makeRg());

    expect(resolveCoverThumbUrl).toHaveBeenCalledWith("mbid-rg-1");
    expect(result).toBe(COVER_URL);
    const setArg = updateChain.set.mock.calls[0]?.[0] as { coverThumbUrl: unknown };
    expect(setArg.coverThumbUrl).toBe(COVER_URL);
  });

  it("persiste null cuando Cover Art Archive responde 404", async () => {
    vi.mocked(resolveCoverThumbUrl).mockResolvedValue(null);
    const updateChain = makeUpdateChain(null);
    vi.mocked(db.update).mockReturnValue(updateChain as never);

    const result = await findOrResolveCover(makeRg());

    expect(result).toBeNull();
    const setArg = updateChain.set.mock.calls[0]?.[0] as { coverThumbUrl: unknown };
    expect(setArg.coverThumbUrl).toBeNull();
  });

  it("no consulta la red cuando el release-group no tiene mbid y persiste null", async () => {
    const updateChain = makeUpdateChain(null);
    vi.mocked(db.update).mockReturnValue(updateChain as never);

    const result = await findOrResolveCover(makeRg({ mbid: null }));

    expect(resolveCoverThumbUrl).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it("re-resuelve un valor cacheado nulo (self-heal) y devuelve el resultado", async () => {
    vi.mocked(resolveCoverThumbUrl).mockResolvedValue(COVER_URL);
    const updateChain = makeUpdateChain(COVER_URL);
    vi.mocked(db.update).mockReturnValue(updateChain as never);

    const result = await findOrResolveCover(makeRg({ coverThumbUrl: null }));

    expect(resolveCoverThumbUrl).toHaveBeenCalledWith("mbid-rg-1");
    expect(result).toBe(COVER_URL);
  });
});
