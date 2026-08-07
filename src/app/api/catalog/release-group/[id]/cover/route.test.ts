import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import type { ReleaseGroupRow } from "@/db/schema";

vi.mock("@/db", () => ({
  db: { select: vi.fn() },
}));

vi.mock("@/services/catalog/cover", () => ({
  findOrResolveCover: vi.fn(),
}));

const { db } = await import("@/db");
const { findOrResolveCover } = await import("@/services/catalog/cover");

function makeSelectChain(rows: unknown[] = []) {
  const chain = {
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    limit: vi.fn(async () => rows),
  };
  return chain;
}

function makeRg(overrides: Partial<ReleaseGroupRow> = {}): ReleaseGroupRow {
  return {
    id: "rg-1",
    mbid: "mbid-rg-1",
    title: "The Dark Side of the Moon",
    category: "studio",
    coverThumbUrl: null,
    createdAt: new Date(),
    ...overrides,
  };
}

const COVER_URL = "https://coverartarchive.org/release-group/mbid-rg-1/front-250";

function makeRequest(id: string): NextRequest {
  return new NextRequest(`http://localhost/api/catalog/release-group/${id}/cover`);
}

describe("GET /api/catalog/release-group/[id]/cover", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("devuelve 404 con ALBUM_NOT_FOUND cuando el release-group no existe", async () => {
    vi.mocked(db.select).mockReturnValue(makeSelectChain([]) as never);

    const response = await GET(makeRequest("nonexistent"), {
      params: Promise.resolve({ id: "nonexistent" }),
    });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.code).toBe("ALBUM_NOT_FOUND");
    expect(findOrResolveCover).not.toHaveBeenCalled();
  });

  it("devuelve la carátula resuelta cuando el release-group existe", async () => {
    vi.mocked(db.select).mockReturnValue(makeSelectChain([makeRg()]) as never);
    vi.mocked(findOrResolveCover).mockResolvedValue(COVER_URL);

    const response = await GET(makeRequest("rg-1"), {
      params: Promise.resolve({ id: "rg-1" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.cover).toBe(COVER_URL);
    expect(findOrResolveCover).toHaveBeenCalledWith(expect.objectContaining({ id: "rg-1" }));
  });

  it("devuelve cover null cuando el release-group no tiene carátula", async () => {
    vi.mocked(db.select).mockReturnValue(makeSelectChain([makeRg()]) as never);
    vi.mocked(findOrResolveCover).mockResolvedValue(null);

    const response = await GET(makeRequest("rg-1"), {
      params: Promise.resolve({ id: "rg-1" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.cover).toBeNull();
  });
});
