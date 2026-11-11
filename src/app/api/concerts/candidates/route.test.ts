import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";

// Candidatos antes de crear (openspec: add-shared-concerts-phase2): validación, sesión y artista inexistente.

const mocks = vi.hoisted(() => ({ requireUser: vi.fn(), list: vi.fn(), artistRows: [] as unknown[] }));
vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/services/concerts/community", () => ({ listConcertCandidates: mocks.list }));
vi.mock("@/db", () => {
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "from", "where", "limit"]) chain[method] = () => chain;
  chain.then = (resolve: (value: unknown) => unknown) => resolve(mocks.artistRows);
  return { db: chain };
});

const { GET } = await import("./route");

const ARTIST = "00000000-0000-4000-8000-0000000000a1";
const req = (query: string) => new NextRequest(`http://localhost/api/concerts/candidates?${query}`);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue({ id: "u1" });
  mocks.artistRows = [{ id: ARTIST, mbid: "00000000-0000-4000-8000-0000000000b1" }];
});

describe("GET /api/concerts/candidates", () => {
  it("lista con artista, fecha y ciudad", async () => {
    mocks.list.mockResolvedValue([]);
    const res = await GET(req(`artistId=${ARTIST}&date=2009-05-15&city=Santiago`));
    expect(res.status).toBe(200);
    expect(mocks.list).toHaveBeenCalledWith("u1", mocks.artistRows[0], "2009-05-15", "Santiago");
  });

  it("fecha parcial: 400", async () => {
    expect((await GET(req(`artistId=${ARTIST}&date=2009`))).status).toBe(400);
  });

  it("artista inexistente: 404", async () => {
    mocks.artistRows = [];
    const res = await GET(req(`artistId=${ARTIST}&date=2009-05-15`));
    expect(res.status).toBe(404);
  });

  it("sin sesión: 401", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "sin sesión"));
    expect((await GET(req(`artistId=${ARTIST}&date=2009-05-15`))).status).toBe(401);
  });
});
